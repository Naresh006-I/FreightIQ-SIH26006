"""
Master Voyage Scheduler — SIH26006

Generates a rolling 90-day procurement schedule.
Detects berth clashes, flags idle vessel windows, and
recommends repositioning strategies to cut deadheading costs.
"""

from __future__ import annotations
import uuid
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List

_RNG = np.random.default_rng(99)

_VESSELS  = ["Capesize","Kamsarmax","Panamax","Supramax","Capesize","Kamsarmax","Panamax"]
_ORIGINS  = ["AU","ID","AU","RU","MZ","AU","ID"]
_PORTS    = ["INPRD","INVTZ","INGVP","INDMA","INHAL","INPRD","INGPL"]
_COMMS    = ["thermal_coal","coking_coal","iron_ore","thermal_coal","bauxite","thermal_coal","limestone"]

_DIST     = {"AU":4800,"ID":2200,"US":11500,"MZ":5600,"RU":7200}
_SPEED    = {"Handymax":13.0,"Supramax":13.5,"Ultramax":14.0,"Panamax":13.5,"Kamsarmax":14.0,"Capesize":13.5}
_DWT      = {"Handymax":50000,"Supramax":62000,"Ultramax":63500,"Panamax":77000,"Kamsarmax":82000,"Capesize":180000}
_HIRE     = {"Handymax":14500,"Supramax":16000,"Ultramax":17000,"Panamax":18500,"Kamsarmax":19500,"Capesize":28000}
_FREIGHT  = {"AU":9.5,"ID":6.2,"US":22.0,"MZ":11.8,"RU":14.5}

STATUS_BY_OFFSET = {-999: "COMPLETED", -10: "BERTHED", 0: "EN_ROUTE", 15: "SCHEDULED"}


def _status(days_from_now: int) -> str:
    if days_from_now < -10: return "COMPLETED"
    if days_from_now < 0:   return "BERTHED"
    if days_from_now < 15:  return "EN_ROUTE"
    return "SCHEDULED"


def generate_schedule(n_voyages: int = 14) -> Dict[str, Any]:
    today    = datetime.today()
    voyages: List[Dict] = []
    berth_etas: Dict[str, List[datetime]] = {p: [] for p in ["INPRD","INVTZ","INGVP","INGPL","INDMA","INSAG","INHAL"]}
    clashes: List[str] = []
    total_vol = 0.0
    total_cost = 0.0
    current = today - timedelta(days=20)   # start 20 days ago so some are already completed

    for i in range(n_voyages):
        vt     = _VESSELS[i % len(_VESSELS)]
        orig   = _ORIGINS[i % len(_ORIGINS)]
        port   = _PORTS[i % len(_PORTS)]
        comm   = _COMMS[i % len(_COMMS)]

        dist       = _DIST[orig]
        speed      = _SPEED[vt]
        sea_days   = dist / (speed * 24)
        port_days  = float(_RNG.uniform(2, 5))
        dwt        = _DWT[vt]
        cargo      = dwt * float(_RNG.uniform(0.88, 0.96))
        freight    = _FREIGHT[orig] * float(_RNG.uniform(0.92, 1.10))
        voyage_cost= sea_days * _HIRE[vt] + freight * cargo

        offset     = int(_RNG.integers(0, 5))
        laycan_s   = current + timedelta(days=offset)
        laycan_e   = laycan_s + timedelta(days=3)
        eta        = laycan_s + timedelta(days=sea_days)

        # Berth clash: within 1 day of another vessel at same port
        for existing in berth_etas.get(port, []):
            if abs((eta - existing).days) <= 1:
                clashes.append(
                    f"Clash at {port}: voyage {i+1} ETA {eta.strftime('%d %b')} "
                    f"conflicts with existing fixture."
                )
        berth_etas[port].append(eta)

        days_from_now = (laycan_s - today).days
        status = _status(days_from_now)

        voyages.append({
            "voyage_id":    f"FIQ-{today.strftime('%y%m')}-{str(uuid.uuid4())[:5].upper()}",
            "vessel_type":  vt,
            "origin":       orig,
            "port":         port,
            "commodity":    comm,
            "cargo_mt":     round(cargo),
            "laycan_start": laycan_s.strftime("%Y-%m-%d"),
            "laycan_end":   laycan_e.strftime("%Y-%m-%d"),
            "eta":          eta.strftime("%Y-%m-%d"),
            "freight_rate": round(freight, 2),
            "total_cost_usd": round(voyage_cost),
            "status":       status,
        })

        total_vol  += cargo
        total_cost += voyage_cost
        current    += timedelta(days=int(_RNG.integers(5, 9)))

    # Berth utilisation (fraction of max 4 berths per port)
    util = {p: round(min(1.0, len(etas) / 4), 2) for p, etas in berth_etas.items()}

    # Repositioning suggestions (idle vessels)
    idle_advice: List[str] = []
    for v in voyages:
        if v["status"] == "SCHEDULED" and v["cargo_mt"] < 55_000:
            idle_advice.append(
                f"Voyage {v['voyage_id']}: partial load on {v['vessel_type']} — "
                f"consider co-loading {v['commodity']} with a neighbouring origin slot."
            )

    return {
        "voyages":              voyages,
        "total_volume_mt":      round(total_vol),
        "total_cost_usd":       round(total_cost),
        "berth_utilisation":    util,
        "clash_warnings":       clashes,
        "idle_repositioning":   idle_advice,
    }
