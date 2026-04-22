from typing import List, Optional
from pydantic import BaseModel, Field
from .enums import RiskLevel

class RiskRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="User's latitude")
    lon: float = Field(..., ge=-180.0, le=180.0, description="User's longitude")
    user_id: Optional[int] = Field(None, description="User's unique ID number")
    severity: Optional[str] = Field(None, description="User's asthma severity")
    triggers: Optional[List[str]] = Field(None, description="User's triggers")

class RiskAssessment(BaseModel):
    risk_level: RiskLevel = Field(..., description="Today's overall risk level calculated using local air/weather data and user info.")
    core_rec: str = Field(..., description="General recommendation for the day based on the overall risk level.")
    driver_recs: List[str] = Field(..., max_length=3, description="More specific recommendations considering environmental and user-specific drivers contributing to the risk level.")