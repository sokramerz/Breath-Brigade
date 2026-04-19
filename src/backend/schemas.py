# Pydantic models
from pydantic import BaseModel, Field
from typing import List
from .enums import RiskLevel

class RiskRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="User's latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="User's longitude")
    user_id: int = Field(..., ge=1, description="User's unique ID number")

class RiskAssessment(BaseModel):
    risk_level: RiskLevel = Field(..., description="Today's overall risk level calculated using local air/weather data and user info.")
    core_rec: str = Field(..., description="General recommendation for the day based on the overall risk level.")
    driver_recs: List[str] = Field(..., max_length=3, description="More specific recommendations considering environmental and user-specific drivers contributing to the risk level.")