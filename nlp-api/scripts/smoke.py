#!/usr/bin/env python3
"""
Smoke-tests a running API: calls each endpoint once and prints what comes back.

    python scripts/smoke.py [base URL]     (default: $NLP_API_URL or http://localhost:8080)
"""

import json
import os
import sys

import requests

BASE_URL = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("NLP_API_URL", "http://localhost:8080")).rstrip("/")

REQUEST = {
    "values": [
        {
            "recordId": "test_1",
            "data": {"text": "Apple Inc. is headquartered in Cupertino, California.", "language": "en"},
        }
    ]
}


def check(method, endpoint, body=None):
    """Call an endpoint, print the response, and return whether it succeeded."""
    print(f"\n{method} /{endpoint}")
    try:
        response = requests.request(method, f"{BASE_URL}/{endpoint}", json=body, timeout=30)
    except requests.RequestException as error:
        print(f"❌ {error}")
        return False
    print(json.dumps(response.json(), indent=2) if response.ok else response.text)
    print(f"{'✅' if response.ok else '❌'} HTTP {response.status_code}")
    return response.ok


def main():
    print(f"🧪 Smoke test against {BASE_URL}")
    results = [check("POST", endpoint, REQUEST) for endpoint in ["entities", "entities_by_type", "noun_phrases", "extract_all"]]
    results.append(check("GET", "health"))
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
