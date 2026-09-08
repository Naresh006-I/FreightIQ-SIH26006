"""
Arbitrage API — origin cost comparison, energy cost, backhaul matching.
"""
from __future__ import annotations
from fastapi import APIRouter, Query
from app.data.seed_data import COMMODITIES
from app.services.arbitrage import compute_arbitrage, BACKHAUL_OPTIONS

router = APIRouter(prefix="/api/arbitrage", tags=["Arbitrage"])


@router.get("/commodities")
def list_commodities():
    return COMMODITIES


@router.get("")
def get_arbitrage(
    commodity:   str   = Query(default="thermal_coal"),
    dest_port:   str   = Query(default="INPRD"),
    volume_mt:   float = Query(default=100_000, ge=10_000),
):
    return compute_arbitrage(commodity, dest_port, volume_mt)


@router.get("/backhaul")
def get_backhaul():
    return BACKHAUL_OPTIONS
