"""The Azure custom-skill record envelope: one response record per request record, in order.

https://learn.microsoft.com/azure/search/cognitive-search-custom-skill-interface
"""

import logging
from typing import Any, Callable, Dict, List, Optional, Sequence

from app.models import RecordRequest

logger = logging.getLogger(__name__)

# Shown for failures whose details may be internal; the details go to the log
GENERIC_ERROR = "Couldn't analyze this record."


def run_skill(
    records: Sequence[RecordRequest],
    analyze: Callable[[List[str]], Sequence[Any]],
    to_data: Callable[[Any], Dict[str, Any]],
    model_language: Optional[str] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Answers a batch of records. `analyze` gets every record's text and returns one result per
    text, in order; a result that is an exception fails only its own record. If `analyze` raises,
    every record carries the error. `to_data` turns a result into the record's `data`."""
    texts = [record.data.text for record in records]
    try:
        results = list(analyze(texts))
    except Exception as error:
        logger.exception("Analyzing a batch of %d records failed", len(records))
        results = [error] * len(records)

    return {"values": [_record(record, result, to_data, model_language) for record, result in zip(records, results)]}


def _record(record: RecordRequest, result: Any, to_data: Callable[[Any], Dict[str, Any]], model_language: Optional[str]):
    warnings = _language_warnings(record, model_language)
    if isinstance(result, Exception):
        return {"recordId": record.recordId, "data": {}, "errors": [{"message": _client_message(result)}], "warnings": warnings}
    return {"recordId": record.recordId, "data": to_data(result), "errors": None, "warnings": warnings}


def _client_message(error: Exception) -> str:
    # ValueErrors describe the input (e.g. a text that is too long), so the client may see them
    if isinstance(error, ValueError):
        return str(error)
    logger.error("Record failed: %r", error)
    return GENERIC_ERROR


def _language_warnings(record: RecordRequest, model_language: Optional[str]) -> Optional[List[Dict[str, str]]]:
    language = record.data.language
    if model_language is None or language == model_language:
        return None
    return [{"message": f"Language '{language}' isn't supported; the text was analyzed as '{model_language}'."}]
