from pydantic import BaseModel, Field


class AddTextRequest(BaseModel):
    text: str = Field(..., min_length=1)
    chunk_size: int = Field(500, gt=0)
    overlap: int = Field(100, ge=0)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(3, gt=0, le=10)
