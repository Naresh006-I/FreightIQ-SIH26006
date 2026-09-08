"""
Vessels API — optimizer, virtual arrival, port/vessel reference data.
"""
from __future__ import annotations
from fastapi import APIRouter, Query
from app.data.seed_data import PORTS, VESSEL_TYPES, ORIGINS
from app.services.vessel_optimizer import optimize_vessels, virtual_arrival
from app.services.arbitrage import FREIGHT   # reuse freight rates

router = APIRouter(prefix="/api/vessels", tags=["Vessels"])


@router.get("/ports")
def get_ports():
    return PORTS


@router.get("/types")
def get_vessel_types():
    return VESSEL_TYPES


@router.get("/origins")
def get_origins():
    return ORIGINS


@router.get("/optimize")
def optimize(
    origin_id:    str   = Query(default="AU"),
    port_id:      str   = Query(default="INPRD"),
    commodity:    str   = Query(default="thermal_coal"),
    cargo_mt:     float = Query(default=150_000, ge=10_000, le=500_000),
):
    freight_rate = FREIGHT.get(origin_id, 10.0)
    return optimize_vessels(
        origin_id=origin_id,
        port_id=port_id,
        cargo_mt=cargo_mt,
        freight_rate=freight_rate,
    )


@router.get("/virtual-arrival")
def calc_virtual_arrival(
    vessel_type:  str   = Query(default="Capesize"),
    design_speed: float = Query(default=13.5, ge=8.0, le=18.0),
    slow_speed:   float = Query(default=11.5, ge=8.0, le=18.0),
    distance_nm:  float = Query(default=4800, ge=500),
    fuel_price:   float = Query(default=580.0, ge=200),
    wait_days:    float = Query(default=2.5, ge=0),
):
    return virtual_arrival(
        vessel_type=vessel_type,
        design_speed=design_speed,
        slow_speed=slow_speed,
        distance_nm=distance_nm,
        fuel_price=fuel_price,
        wait_days=wait_days,
    )
