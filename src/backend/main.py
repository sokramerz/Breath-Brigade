from fastapi import FastAPI
from schemas import *

api = FastAPI()

@api.post("/risk", response_model=RiskAssessment)
async def assess_risk(request: RiskRequest):
    pass