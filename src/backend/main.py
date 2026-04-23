from fastapi import FastAPI, Depends
from .schemas import RiskRequest, RiskAssessment, RiskLevel
from .utils import call_meteo, get_user_risk_info, record_alert
from .database import engine, get_db
from .models import Base
from sqlalchemy.orm import Session
from .risk_engine import RiskEngine
from .enums import Severity, Trigger
from fastapi.middleware.cors import CORSMiddleware

# create and add all tables defined in models to database
Base.metadata.create_all(bind=engine)

api = FastAPI()

api.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials = True,
    allow_methods= ["*"],
    allow_headers= ["*"],
    
)

@api.post("/risk", response_model=RiskAssessment)
async def assess_risk(request: RiskRequest, db: Session = Depends(get_db)):
    weather_info = call_meteo(request.lat, request.lon)
    
    # Use provided info if available, otherwise hit DB
    if request.severity is not None:
        severity = request.severity
        triggers = request.triggers or []
    else:
        user_info = get_user_risk_info(db, request.user_id)
        if not user_info:
            # Default fallback for demo if no user found
            severity = Severity.MODERATE_PERSISTENT
            triggers = [Trigger.POLLEN_OUTDOOR_MOLD, Trigger.HEAT_HIGH_HUMIDITY]
        else:
            severity, triggers = user_info[0]

    aqi = int(weather_info.get("us_aqi", 0))
    temp = weather_info.get("temperature_2m", 20)
    thunder = int(weather_info.get("weather_code", 0)) in [95, 96, 99]
    hum = weather_info.get("relative_humidity_2m", 50)

    rec_ids, risk_assessment = RiskEngine(
        aqi=aqi, temp=temp, thunder=thunder, hum=hum,
        severity=severity, triggers=triggers
    ).assess()

    if request.user_id:
        try:
            record_alert(db, request.user_id, rec_ids)
        except:
            pass # Ignore DB errors for demo
            
    return risk_assessment
