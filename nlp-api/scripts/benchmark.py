#!/usr/bin/env python3
"""
Times each endpoint of a running API on the same batch of documents.

    python scripts/benchmark.py [base URL] [rounds]     (default: $NLP_API_URL or http://localhost:8080, 5 rounds)
"""

import os
import statistics
import sys
import time

import requests

BASE_URL = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("NLP_API_URL", "http://localhost:8080")).rstrip("/")
ROUNDS = int(sys.argv[2]) if len(sys.argv) > 2 else 5

TEXTS = [
    "The technology company is headquartered in Silicon Valley. The chief executive leads the organization.",
    "A major software corporation was founded by two entrepreneurs in the 1970s.",
    "The United States of America is located in North America. Washington D.C. is the capital city.",
    "A prominent business leader runs multiple innovative companies based in California.",
    "A global technology firm is a subsidiary of a larger holding company. The current CEO manages operations.",
    "An e-commerce giant was founded by an entrepreneur in Seattle, Washington.",
    "A social media platform was created by a college student at a prestigious university.",
    "A streaming entertainment company is based in California and serves millions of subscribers.",
    "A microblogging service was acquired by a billionaire entrepreneur and rebranded.",
    "A transportation technology company operates in San Francisco and connects drivers with passengers.",
]

REQUEST = {
    "values": [{"recordId": f"doc_{index}", "data": {"text": text, "language": "en"}} for index, text in enumerate(TEXTS)]
}


def time_endpoint(endpoint):
    """Median seconds per request over ROUNDS requests, or None if a request fails."""
    durations = []
    for _ in range(ROUNDS):
        started = time.perf_counter()
        response = requests.post(f"{BASE_URL}/{endpoint}", json=REQUEST, timeout=120)
        if not response.ok:
            print(f"❌ /{endpoint}: HTTP {response.status_code} {response.text[:200]}")
            return None
        durations.append(time.perf_counter() - started)
    return statistics.median(durations)


def main():
    print(f"🚀 {len(TEXTS)} documents per request, {ROUNDS} rounds, against {BASE_URL}\n")
    for endpoint in ["entities", "entities_by_type", "noun_phrases", "extract_all"]:
        median = time_endpoint(endpoint)
        if median is not None:
            print(f"/{endpoint:<17} median {median * 1000:7.1f} ms")


if __name__ == "__main__":
    main()
