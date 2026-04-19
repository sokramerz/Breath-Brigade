from fastapi import FastAPI, Depends
from .schemas import RiskRequest, RiskAssessment, RiskLevel
from .utils import call_meteo, get_user_risk_info, record_alert
from .database import engine, get_db
from .models import Base
from sqlalchemy.orm import Session
from .risk_engine import RiskEngine

# create and add all tables defined in models to database
# Base.metadata.create_all(bind=engine)

api = FastAPI()

@api.post("/risk", response_model=RiskAssessment)
async def assess_risk(request: RiskRequest, db: Session = Depends(get_db)):
    weather_info = call_meteo(request.lat, request.lon)
    user_info = get_user_risk_info(db, request.user_id)

    aqi = int(weather_info["us_aqi"])
    temp = weather_info["temperature_2m"]
    thunder = int(weather_info["weather_code"]) in [95, 96, 99]
    hum = weather_info["relative_humidity_2m"]

    severity, triggers = user_info[0]

    rec_ids, risk_assessment = RiskEngine(
        aqi=aqi, temp=temp, thunder=thunder, hum=hum,
        severity=severity, triggers=triggers
    ).assess()

    record_alert(db, request.user_id, rec_ids)
    return risk_assessment
