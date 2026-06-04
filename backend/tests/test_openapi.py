from fastapi.testclient import TestClient

from app.main import create_app


def test_openapi_documents_backend_contract_paths() -> None:
    client = TestClient(create_app())
    schema = client.get("/openapi.json").json()

    paths = schema["paths"]
    assert "/recognize" in paths
    assert "/foods/search" in paths
    assert "/foods/{food_id}" in paths
    assert "/foods/{food_id}/nutrition" in paths
    assert "/calories" in paths

    calories_schema = paths["/calories"]["post"]["responses"]["200"]["content"]["application/json"][
        "schema"
    ]
    assert "ApiResponse_CalorieBreakdown_" in calories_schema["$ref"]
