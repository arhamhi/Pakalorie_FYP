from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app


def test_healthz_returns_raw_status() -> None:
    client = TestClient(create_app())
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_returns_service_landing() -> None:
    client = TestClient(create_app())
    response = client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "pakalorie-api"
    assert body["docs"] == "/docs"


def test_recognize_returns_error_envelope_when_gemini_key_missing(monkeypatch) -> None:
    # Force the no-key condition regardless of the ambient .env, so this stays
    # deterministic on machines that do have a real GEMINI_API_KEY configured.
    monkeypatch.setattr(
        "app.api.routes.recognition.get_settings",
        lambda: Settings(GEMINI_API_KEY=""),
    )
    client = TestClient(create_app())

    response = client.post(
        "/recognize",
        files={"image": ("food.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert response.status_code == 503
    assert response.json() == {
        "success": False,
        "data": None,
        "error": "GEMINI_API_KEY is not configured",
    }
