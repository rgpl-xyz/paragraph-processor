import logging

from app.models import RecordsRequest
from app.skill import GENERIC_ERROR, run_skill
from app.tests.conftest import records


def request(*texts, language="en"):
    return RecordsRequest.model_validate(records(*texts, language=language)).values


def upper(texts):
    return [text.upper() for text in texts]


def as_data(result):
    return {"text": result}


def test_answers_each_record_in_order_with_its_id():
    response = run_skill(request("one", "two"), upper, as_data)

    assert response == {
        "values": [
            {"recordId": "r0", "data": {"text": "ONE"}, "errors": None, "warnings": None},
            {"recordId": "r1", "data": {"text": "TWO"}, "errors": None, "warnings": None},
        ]
    }


def test_keeps_records_that_share_an_id():
    duplicates = request("one", "two")
    duplicates[1].recordId = "r0"

    response = run_skill(duplicates, upper, as_data)

    assert [record["data"]["text"] for record in response["values"]] == ["ONE", "TWO"]


def test_puts_a_failed_text_in_its_own_record():
    def analyze(texts):
        return [ValueError("Text is too long.") if text == "bad" else text for text in texts]

    response = run_skill(request("good", "bad"), analyze, as_data)

    good, bad = response["values"]
    assert good["errors"] is None and good["data"] == {"text": "good"}
    assert bad["errors"] == [{"message": "Text is too long."}]
    assert bad["data"] == {}


def test_keeps_unexpected_error_details_out_of_the_response(caplog):
    def analyze(texts):
        return [RuntimeError("internal path /srv/model") for _ in texts]

    with caplog.at_level(logging.ERROR):
        response = run_skill(request("text"), analyze, as_data)

    assert response["values"][0]["errors"] == [{"message": GENERIC_ERROR}]
    assert "internal path /srv/model" in caplog.text


def test_reports_a_failed_batch_on_every_record_instead_of_raising():
    def analyze(texts):
        raise RuntimeError("model crashed")

    response = run_skill(request("one", "two"), analyze, as_data)

    assert [record["errors"] for record in response["values"]] == [[{"message": GENERIC_ERROR}]] * 2


def test_warns_when_a_record_asks_for_a_language_the_model_does_not_speak():
    response = run_skill(request("Le chat noir.", language="fr"), upper, as_data, model_language="en")

    [record] = response["values"]
    assert record["data"] == {"text": "LE CHAT NOIR."}
    assert record["warnings"] == [{"message": "Language 'fr' isn't supported; the text was analyzed as 'en'."}]
