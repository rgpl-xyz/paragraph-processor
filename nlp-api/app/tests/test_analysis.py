import logging

from app.analysis import Analysis, Analyzer, TextTooLong


def test_returns_one_analysis_per_text_in_order(nlp):
    first, second = Analyzer(nlp).analyze(["The quick brown fox jumps over the lazy dog.", "Steve Jobs lived in California."])

    assert first.noun_phrases == ["The quick brown fox", "the lazy dog"]
    assert first.entities == []
    assert [(entity["name"], entity["label"]) for entity in second.entities] == [("Steve Jobs", "PERSON"), ("California", "GPE")]


def test_returns_nothing_for_no_texts(nlp):
    assert Analyzer(nlp).analyze([]) == []


def test_groups_repeated_mentions_of_an_entity(nlp):
    [result] = Analyzer(nlp).analyze(["Google is big. Google is fast."])

    [google] = result.entities
    assert google["name"] == "Google"
    assert google["matches"] == [{"start": 0, "end": 6, "text": "Google"}, {"start": 15, "end": 21, "text": "Google"}]


def test_capitalizes_an_entity_written_in_lowercase(nlp):
    [result] = Analyzer(nlp).analyze(["We meet again on monday."])

    assert [entity["name"] for entity in result.entities] == ["Monday"]


def test_rejects_only_the_text_that_is_too_long(nlp):
    too_long = "word " * (nlp.max_length // 5 + 1)

    short, long = Analyzer(nlp).analyze(["The quick brown fox.", too_long])

    assert isinstance(short, Analysis)
    assert isinstance(long, TextTooLong)
    assert str(long) == f"Text is {len(too_long):,} characters; the limit is {nlp.max_length:,}."


def test_retries_a_failed_batch_text_by_text(nlp, caplog):
    class FlakyModel:
        """Fails a whole batch, and on its own fails only the text "boom"."""

        max_length = nlp.max_length

        def pipe(self, texts, batch_size):
            raise RuntimeError("batch failed")

        def __call__(self, text):
            if text == "boom":
                raise RuntimeError("boom")
            return nlp(text)

    with caplog.at_level(logging.WARNING):
        fine, broken = Analyzer(FlakyModel()).analyze(["The quick brown fox.", "boom"])

    assert fine.noun_phrases == ["The quick brown fox"]
    assert isinstance(broken, RuntimeError)
    assert "retrying" in caplog.text
