from pydantic import BaseModel
from typing import Optional

class QuestionData(BaseModel):
    question: str

class UserData(BaseModel):
    username: str
    age: int
    email: Optional[str] = None

class UpdateUserData(BaseModel):
    age: int
    email: Optional[str] = None