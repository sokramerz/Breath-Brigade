from pydantic import BaseModel, Field
from typing import List

class RiskRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="User's latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="User's longitude")
    user_id: int = Field(..., ge=0, description="User's unique ID number")

class RiskAssessment(BaseModel):
    risk_level: int = Field(..., ge=0, description="Personalized risk level calculated using local air/weather data and user info.")
    recs: List[str] = Field(..., description="Personalized recommendations based local air/weather data and user info.")