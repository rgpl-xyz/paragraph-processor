# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from collections import defaultdict
from contextlib import asynccontextmanager
from dataclasses import asdict
import json
import logging
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Body, Depends, FastAPI, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
import spacy
from spacy.language import Language

from app.analysis import Analysis, Analyzer
from app.models import (
    ENT_PROP_MAP,
    CombinedData,
    EntitiesByTypeData,
    EntitiesData,
    NounPhrasesData,
    RecordsRequest,
    RecordsResponse,
)
from app.settings import Settings, load_settings
from app.skill import run_skill

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EXAMPLE_REQUEST = json.loads((Path(__file__).parent / "data" / "example_request.json").read_text())

router = APIRouter()


def load_model(name: str) -> Language:
    """Load a spaCy model by package name."""
    logger.info("Loading spaCy model %s...", name)
    try:
        return spacy.load(name)
    except OSError:
        logger.error("Please ensure you have installed the spaCy model: python -m spacy download %s", name)
        raise


def create_app(load_nlp: Optional[Callable[[], Language]] = None, settings: Optional[Settings] = None) -> FastAPI:
    """Build the API. The model loads when the app starts, not when this module is imported,
    so tests can pass their own loader; by default it's the model the settings name."""
    settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        nlp = load_nlp() if load_nlp else load_model(settings.model)
        application.state.nlp = nlp
        application.state.analyzer = Analyzer(nlp)
        logger.info("spaCy model %s_%s ready", nlp.meta["lang"], nlp.meta["name"])
        yield

    application = FastAPI(
        title="rgpl-spacy-api",
        version="1.0",
        description="spaCy FastAPI for Custom Cognitive Skills in Azure Search",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    application.include_router(router)
    return application


def get_analyzer(request: Request) -> Analyzer:
    return request.app.state.analyzer


def answer(body: RecordsRequest, analyzer: Analyzer, to_data: Callable[[Analysis], Dict[str, Any]]):
    return run_skill(body.values, analyzer.analyze, to_data, model_language=analyzer.nlp.lang)


def entities_by_type(analysis: Analysis) -> EntitiesByTypeData:
    groups = defaultdict(list)
    for entity in analysis.entities:
        groups[ENT_PROP_MAP.get(entity["label"], entity["label"].lower())].append(entity["name"])
    return dict(groups)


# Handlers are plain functions: FastAPI runs them in its thread pool, so spaCy's CPU work doesn't
# block the event loop the way it did inside async handlers.
EXAMPLE_BODY = Body(..., examples=[EXAMPLE_REQUEST])


@router.get("/", include_in_schema=False)
def docs_redirect():
    return RedirectResponse("/docs")


@router.post("/entities", response_model=RecordsResponse[EntitiesData], tags=["NER"])
def extract_entities(body: RecordsRequest = EXAMPLE_BODY, analyzer: Analyzer = Depends(get_analyzer)):
    """Extract Named Entities from a batch of Records."""
    return answer(body, analyzer, lambda analysis: {"entities": analysis.entities})


@router.post("/entities_by_type", response_model=RecordsResponse[EntitiesByTypeData], tags=["NER"])
def extract_entities_by_type(body: RecordsRequest = EXAMPLE_BODY, analyzer: Analyzer = Depends(get_analyzer)):
    """Extract Named Entities from a batch of Records separated by entity label.
        This route can be used directly as a Cognitive Skill in Azure Search
        For Documentation on integration with Azure Search, see here:
        https://docs.microsoft.com/en-us/azure/search/cognitive-search-custom-skill-interface"""
    return answer(body, analyzer, entities_by_type)


@router.post("/noun_phrases", response_model=RecordsResponse[NounPhrasesData], tags=["Syntax"])
def extract_noun_phrases(body: RecordsRequest = EXAMPLE_BODY, analyzer: Analyzer = Depends(get_analyzer)):
    """Extract Noun Phrases from a batch of Records."""
    return answer(body, analyzer, lambda analysis: {"noun_phrases": analysis.noun_phrases})


@router.post("/extract_all", response_model=RecordsResponse[CombinedData], tags=["Combined"])
def extract_all(body: RecordsRequest = EXAMPLE_BODY, analyzer: Analyzer = Depends(get_analyzer)):
    """Extract both entities and noun phrases from a batch of Records in a single pass."""
    return answer(body, analyzer, asdict)


@router.get("/health", tags=["Health"])
def health_check(request: Request):
    """Health check endpoint."""
    nlp = request.app.state.nlp
    try:
        nlp("Test document")
        return {"status": "healthy", "model": f"{nlp.meta['lang']}_{nlp.meta['name']}"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


app = create_app()
