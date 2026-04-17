from fastapi import FastAPI, Depends
from .schemas import RiskRequest, RiskAssessment
from .utils import call_meteo, get_user_risk_info
from .database import engine, get_db
from .models import Base
from sqlalchemy.orm import Session

# create and add all tables defined in models to database
Base.metadata.create_all(bind=engine)

api = FastAPI()


@api.post("/risk", response_model=RiskAssessment)
async def assess_risk(request: RiskRequest, db: Session = Depends(get_db)):
    weather_info = call_meteo(request.lat, request.lon)
    user_info = get_user_risk_info(db, request.user_id)

    aqi = weather_info["us_aqi"]
    temp = weather_info["temperature_2m"]
    thunder = int(weather_info["weather_code"]) in [95, 96, 99]
    humid = weather_info["relative_humidity_2m"]

    severity, triggers = user_info[0]

    # TODO: calculate risk assessment instead of returning mock response
    return RiskAssessment(risk_level=3, recs=["Don't wear a jacket.", "Don't go to run club."])
