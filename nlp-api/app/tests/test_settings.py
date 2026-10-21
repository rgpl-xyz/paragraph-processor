from fastapi.testclient import TestClient

from app.api import create_app
from app.settings import Settings, load_settings


def test_defaults_match_the_original_service():
    assert load_settings({}) == Settings(model="en_core_web_sm", cors_allow_origins=["*"], port=8080)


def test_reads_each_setting_from_the_environment():
    settings = load_settings(
        {"SPACY_MODEL": "en_core_web_md", "CORS_ALLOW_ORIGINS": " https://a.example , https://b.example ", "PORT": "9000"}
    )

    assert settings == Settings(model="en_core_web_md", cors_allow_origins=["https://a.example", "https://b.example"], port=9000)


def test_cors_answers_only_the_configured_origins(nlp):
    settings = Settings(model="en_core_web_sm", cors_allow_origins=["https://allowed.example"], port=8080)

    with TestClient(create_app(load_nlp=lambda: nlp, settings=settings)) as client:
        allowed = client.get("/health", headers={"Origin": "https://allowed.example"})
        other = client.get("/health", headers={"Origin": "https://other.example"})

    assert allowed.headers["access-control-allow-origin"] == "https://allowed.example"
    assert "access-control-allow-origin" not in other.headers


def test_loads_the_configured_model_by_default(monkeypatch, nlp):
    loaded = []
    monkeypatch.setattr("app.api.spacy.load", lambda name: loaded.append(name) or nlp)
    settings = Settings(model="en_core_web_md", cors_allow_origins=["*"], port=8080)

    with TestClient(create_app(settings=settings)):
        pass

    assert loaded == ["en_core_web_md"]
