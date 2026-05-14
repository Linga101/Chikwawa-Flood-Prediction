from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    role: Optional[str] = "officer"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
