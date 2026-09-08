"""
Risk API — 4-pillar radar, VaR, chokepoint alerts, idle vessel risk.
"""
from __future__ import annotations
from fastapi import APIRouter, Query
from app.data.seed_data import generate_bdi_history, generate_freight_rates
from app.services.risk_engine import compute_risk, idle_vessel_risk
from app.services.scheduler import generate_schedule
import pandas as pd

router = APIRouter(prefix="/api/risk", tags=["Risk"])


def _current_rate() -> float:
    bdi = generate_bdi_history(30)
    fr  = generate_freight_rates(bdi)
    return float(fr["AU_INPRD"].iloc[-1])


@router.get("")
def get_risk(
    cargo_mt: float = Query(default=100_000, ge=10_000, le=500_000),
):
    rate = _current_rate()
    return compute_risk(current_rate=rate, cargo_mt=cargo_mt)


@router.get("/idle")
def get_idle_risk():
    schedule = generate_schedule()
    flags    = idle_vessel_risk(schedule["voyages"])
    return {"idle_flags": flags, "count": len(flags)}
