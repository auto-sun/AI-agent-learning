from pydantic import BaseModel, Field


class AddTextRequest(BaseModel):
    text: str = Field(..., min_length=1)
    chunk_size: int = Field(500, gt=0)
    overlap: int = Field(100, ge=0)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(3, gt=0, le=10)
    score_threshold: float = Field(0.5, ge=0.0, le=1.0)


class AddFileRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    chunk_size: int = 500
    overlap: int = 100

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = 3