from fastapi import FastAPI
from schemas import RiskRequest, RiskAssessment
from utils import call_meteo
from database import get_user_risk_info

api = FastAPI()

@api.post("/risk", response_model=RiskAssessment)
async def assess_risk(request: RiskRequest):
    weather_info = call_meteo(request.lat, request.lon)
    user_info = get_user_risk_info(request.user_id)

    aqi = weather_info["us_aqi"]
    temp = weather_info["temperature_2m"]
    thunder = int(weather_info["weather_code"]) in [95, 96, 99]
    humid = weather_info["relative_humidity_2m"]

    user_severity, user_triggers = user_info