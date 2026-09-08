"""
Scheduler API — voyage schedule, berth utilisation, clash warnings, repositioning.
"""
from __future__ import annotations
from fastapi import APIRouter, Query
from app.services.scheduler import generate_schedule

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])


@router.get("")
def get_schedule(n_voyages: int = Query(default=14, ge=4, le=30)):
    return generate_schedule(n_voyages=n_voyages)
