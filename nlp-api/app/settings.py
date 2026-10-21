"""Runtime settings, read from the environment. Each name and default lives only here."""

import os
from dataclasses import dataclass
from typing import List, Mapping


@dataclass(frozen=True)
class Settings:
    # The spaCy model to load, e.g. en_core_web_sm
    model: str
    # Origins allowed to call the API from a browser; ["*"] allows any
    cors_allow_origins: List[str]
    # Port for `python main.py` and the container
    port: int


def load_settings(environ: Mapping[str, str] = os.environ) -> Settings:
    origins = environ.get("CORS_ALLOW_ORIGINS", "*")
    return Settings(
        model=environ.get("SPACY_MODEL", "en_core_web_sm"),
        cors_allow_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        port=int(environ.get("PORT", "8080")),
    )
