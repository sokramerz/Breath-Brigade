import openmeteo_requests
from typing import List

import pandas as pd
import requests_cache
from retry_requests import retry

from sqlalchemy import insert
from sqlalchemy.orm import Session
from .models import UserProfile, Alert, alerts_recs


def call_meteo(lat, lon):
    # Setup the Open-Meteo API client with cache and retry on error
    cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
    retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
    openmeteo = openmeteo_requests.Client(session = retry_session)

    # To store results from different calls together
    result = {}
    urls = [
        "https://air-quality-api.open-meteo.com/v1/air-quality",
        "https://api.open-meteo.com/v1/forecast"
    ]
    variables = [
        # getting parts of aqi to weigh more heavily in certain cases for risk assessment
        ['us_aqi', 'us_aqi_ozone'],
        ["temperature_2m", "weather_code", "relative_humidity_2m"]
    ]

    for url, var_names in zip(urls, variables):
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": var_names
        }
        responses = openmeteo.weather_api(url, params = params)

        # Process first location. Add a for-loop for multiple locations or weather models
        response = responses[0]

        # Process current data. The order of variables needs to be the same as requested.
        current = response.Current()
        for i, variable in enumerate(var_names):
            result[variable] = current.Variables(i).Value()
    
    return result

def get_user_risk_info(db: Session, user_id: int):
    return db.query(
        UserProfile.severity, UserProfile.triggers
    ).filter(
        UserProfile.user_id == user_id
    ).all()

def record_alert(db: Session, user_id: int, rec_ids: List[int]): 
    # TODO: have way of getting zip code from lat + lon to store in alert history
    new_alert = Alert(user_id=user_id)
    db.add(new_alert)
    db.flush()

    if rec_ids:
        stmt = insert(alerts_recs).values([
            {"alert_id": new_alert.alert_id, "rec_id": rec_id}
            for rec_id in rec_ids
        ])
        db.execute(stmt)
    
    db.commit()


