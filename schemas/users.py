from pydantic import BaseModel

class QuestionData(BaseModel):
    question: str

class SummaryData(BaseModel):
    text: str

class DocQuestionData(BaseModel):
    text: str
    question: str

class ChunkData(BaseModel):
    text: str
    chunk_size: int = 500
    overlap: int = 100
