"""
FreightIQ — SIH26006
Intelligent Freight Forecasting & Vessel Chartering Platform
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import dashboard, forecast, vessels, arbitrage, risk, scheduler, analyze, whatif, bdi, route_optimizer, voyage_disruption, db_api, algorithms

app = FastAPI(
    title="NayaDisha — SIH26006",
    description="AI-driven freight forecasting and vessel chartering for bulk cargo to East Coast India.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers (workaround for FastAPI 0.141 / Python 3.14)
for _mod in [dashboard, forecast, vessels, arbitrage, risk, scheduler, analyze, whatif, bdi, route_optimizer, voyage_disruption, db_api, algorithms]:
    for _route in _mod.router.routes:
        app.router.routes.append(_route)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "platform": "NayaDisha", "problem": "SIH26006"}
