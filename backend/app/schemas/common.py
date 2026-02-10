from pydantic import BaseModel
from typing import Optional

class StatusResponse(BaseModel):
    status: str
    message: Optional[str] = None
