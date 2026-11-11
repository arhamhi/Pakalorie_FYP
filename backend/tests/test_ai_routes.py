from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.ai import ChatTurn
from app.services.coach import _clean_history

client = TestClient(create_app())


def test_chat_sends_alternating_history(monkeypatch) -> None:
    seen = {}

    async def fake_generate_text(self, system, messages, *, max_output_tokens=1024):
        seen["system"] = system
        seen["messages"] = messages
        return "Daal lo, 300 kcal.\n---\nPaani bhi pi lo."

    monkeypatch.setattr("app.services.claude.ClaudeClient.generate_text", fake_generate_text)
    response = client.post(
        "/ai/chat",
        json={
            "message": "dinner mein kya khaun?",
            "context": {"user_name": "Ayesha", "remaining_calories": 600, "water_count": 3},
            "history": [
                {"role": "assistant", "text": "Assalam-o-Alaikum!"},
                {"role": "user", "text": "hi"},
                {"role": "assistant", "text": "Kya haal?"},
            ],
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["replies"] == ["Daal lo, 300 kcal.", "Paani bhi pi lo."]
    assert [m["role"] for m in seen["messages"]] == ["user", "assistant", "user"]
    assert seen["messages"][-1]["content"] == "dinner mein kya khaun?"
    assert "Ayesha" in seen["system"] and "600 kcal" in seen["system"]


def test_clean_history_merges_same_role() -> None:
    turns = [ChatTurn(role="user", text="a"), ChatTurn(role="user", text="b")]
    assert _clean_history(turns) == [{"role": "user", "content": "a\n\nb"}]


def test_advice_falls_back_without_key(monkeypatch) -> None:
    monkeypatch.setattr("app.services.claude.ClaudeClient.configured", property(lambda self: False))
    response = client.post(
        "/ai/advice",
        json={"remaining_calories": 900, "time_of_day": "evening", "goal": "lose", "water_count": 2},
    )
    assert response.status_code == 200
    assert response.json()["data"]["text"] == "Lage raho, consistency is key!"


def test_meal_estimate_maps_fields(monkeypatch) -> None:
    async def fake_generate_json(self, prompt, **_kwargs):
        assert "Aloo Gosht" in prompt
        return {"name": "Aloo Gosht", "calories": "480", "protein": 30, "carbs": 20, "fat": 30, "servingSize": "1 bowl"}

    monkeypatch.setattr("app.services.claude.ClaudeClient.generate_json", fake_generate_json)
    response = client.post("/ai/meal-estimate", json={"name": "Aloo Gosht"})
    data = response.json()["data"]
    assert response.status_code == 200
    assert data["calories"] == 480
    assert data["serving_size"] == "1 bowl"
    assert data["confidence"] == 0.7


def test_identify_accepts_image(monkeypatch) -> None:
    async def fake_generate_json(self, prompt, *, image_bytes=None, mime_type=None, **_kwargs):
        assert image_bytes == b"fakejpeg"
        return {"name": "Haleem", "calories": 500, "protein": 22, "carbs": 45, "fat": 22, "confidence": 0.9,
                "alternatives": [{"name": "Nihari", "calories": 550}]}

    monkeypatch.setattr("app.services.claude.ClaudeClient.generate_json", fake_generate_json)
    response = client.post("/ai/identify", files={"image": ("a.jpg", b"fakejpeg", "image/jpeg")})
    data = response.json()["data"]
    assert response.status_code == 200
    assert data["name"] == "Haleem"
    assert data["alternatives"][0]["name"] == "Nihari"


def test_split_bubbles_caps_at_three() -> None:
    from app.services.coach import split_bubbles

    assert split_bubbles("one") == ["one"]
    assert split_bubbles("a\n---\nb\n---\nc\n---\nd") == ["a", "b", "c\nd"]


def test_cut_off_reply_is_trimmed(monkeypatch) -> None:
    async def fake_generate_text(self, system, messages, *, max_output_tokens=1024):
        self.last_stop_reason = "max_tokens"
        return "Daal lo, 300 kcal.\n---\nChicken karahi with 2 roti is about 650 kcal, perfect for a"

    monkeypatch.setattr("app.services.claude.ClaudeClient.generate_text", fake_generate_text)
    response = client.post("/ai/chat", json={"message": "Lunch ideas for today?"})
    assert response.json()["data"]["replies"] == ["Daal lo, 300 kcal."]
