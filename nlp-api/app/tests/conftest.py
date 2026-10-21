import pytest
import spacy
from fastapi.testclient import TestClient

from app.api import create_app


@pytest.fixture(scope="session")
def nlp():
    """The real English model, loaded once for the whole run."""
    return spacy.load("en_core_web_sm")


@pytest.fixture
def client(nlp):
    with TestClient(create_app(load_nlp=lambda: nlp)) as test_client:
        yield test_client


def records(*texts, language="en"):
    """A request body with one record per text, ids r0, r1, ..."""
    return {"values": [{"recordId": f"r{i}", "data": {"text": text, "language": language}} for i, text in enumerate(texts)]}
