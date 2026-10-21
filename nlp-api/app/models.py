# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel


ENT_PROP_MAP = {
    "CARDINAL": "cardinals",
    "DATE": "dates",
    "EVENT": "events",
    "FAC": "facilities",
    "GPE": "gpes",
    "LANGUAGE": "languages",
    "LAW": "laws",
    "LOC": "locations",
    "MONEY": "money",
    "NORP": "norps",
    "ORDINAL": "ordinals",
    "ORG": "organizations",
    "PERCENT": "percentages",
    "PERSON": "people",
    "PRODUCT": "products",
    "QUANTITY": "quantities",
    "TIME": "times",
    "WORK_OF_ART": "worksOfArt",
}


class RecordDataRequest(BaseModel):
    text: str
    language: str = "en"


class RecordRequest(BaseModel):
    recordId: str
    data: RecordDataRequest


class RecordsRequest(BaseModel):
    values: List[RecordRequest]


# A failed record's data is empty, so every field has a default
class EntitiesData(BaseModel):
    entities: List[Dict[str, Any]] = []


class NounPhrasesData(BaseModel):
    noun_phrases: List[str] = []


class CombinedData(BaseModel):
    entities: List[Dict[str, Any]] = []
    noun_phrases: List[str] = []


EntitiesByTypeData = Dict[str, List[str]]

Data = TypeVar("Data")


class Message(BaseModel):
    message: str


class RecordResponse(BaseModel, Generic[Data]):
    recordId: str
    data: Data
    errors: Optional[List[Message]] = None
    warnings: Optional[List[Message]] = None


class RecordsResponse(BaseModel, Generic[Data]):
    values: List[RecordResponse[Data]]
