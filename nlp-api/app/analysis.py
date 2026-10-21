"""Runs texts through spaCy and keeps what the routes need from each one."""

from dataclasses import dataclass
import logging
from typing import Any, Dict, List, Optional, Sequence, Union

from spacy.language import Language
from spacy.tokens import Doc, Span

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Analysis:
    """A text's named entities (each mention grouped under one entity) and noun phrases."""

    entities: List[Dict[str, Any]]
    noun_phrases: List[str]


class TextTooLong(ValueError):
    """The text is longer than the model accepts."""


class Analyzer:
    def __init__(self, nlp: Language, batch_size: int = 1000):
        self.nlp = nlp
        self.batch_size = batch_size

    def analyze(self, texts: Sequence[str]) -> List[Union[Analysis, Exception]]:
        """One result per text, in order: its Analysis, or the exception that text raised.
        The texts go through spaCy as one batch; if the batch fails, each text is retried on its
        own so the failure lands on the text that caused it."""
        results: List[Union[Analysis, Exception, None]] = [self._too_long(text) for text in texts]
        pending = [index for index, result in enumerate(results) if result is None]
        try:
            docs = list(self.nlp.pipe([texts[index] for index in pending], batch_size=self.batch_size))
            for index, doc in zip(pending, docs):
                results[index] = _analysis_of(doc)
        except Exception:
            logger.warning("A batch of %d texts failed; retrying them one at a time", len(pending), exc_info=True)
            for index in pending:
                results[index] = self._analyze_alone(texts[index])
        return results

    def _too_long(self, text: str) -> Optional[TextTooLong]:
        if len(text) <= self.nlp.max_length:
            return None
        return TextTooLong(f"Text is {len(text):,} characters; the limit is {self.nlp.max_length:,}.")

    def _analyze_alone(self, text: str) -> Union[Analysis, Exception]:
        try:
            return _analysis_of(self.nlp(text))
        except Exception as error:
            return error


def _analysis_of(doc: Doc) -> Analysis:
    return Analysis(entities=_entities(doc), noun_phrases=[chunk.text for chunk in doc.noun_chunks])


def _entities(doc: Doc) -> List[Dict[str, Any]]:
    entities: Dict[str, Dict[str, Any]] = {}
    for ent in doc.ents:
        entity = entities.setdefault(_entity_key(ent), {"name": _display_name(ent.text), "label": ent.label_, "matches": []})
        entity["matches"].append({"start": ent.start_char, "end": ent.end_char, "text": ent.text})
    return list(entities.values())


def _entity_key(ent: Span) -> str:
    # A knowledge-base or rule id when the pipeline sets one, otherwise the normalized text
    return ent.kb_id_ or ent.ent_id_ or "-".join(word.lower() for word in ent.text.split())


def _display_name(text: str) -> str:
    return text.capitalize() if text.lower() == text else text
