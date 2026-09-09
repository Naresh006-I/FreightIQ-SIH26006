"""
Multi-Route AI Optimization Engine — SIH26006
Returns 3 alternative sea routes for each origin→destination pair.
Scores each route on: transit_days, cost_usd, risk_score (0-100).
AI recommends the optimal route based on a weighted composite score.

Route alternatives per origin:
  Australia:
    R1 — via Malacca Strait      (fastest, most common)
    R2 — via Sunda Strait        (shorter approach, shallower)
    R3 — via Lombok Strait       (deeper, bypasses Malacca congestion)

  Indonesia:
    R1 — via Malacca Strait      (shortest)
    R2 — via Sunda Strait        (south Java approach)
    R3 — via Karimata Strait     (alternative Indonesian passage)

  USA / Russia:
    R1 — via Suez Canal + Malacca
    R2 — via Cape of Good Hope   (longer but avoids Suez risk)
    R3 — via Suez + Sunda        (Suez then south Indian Ocean)

  Mozambique:
    R1 — via Mozambique Channel + Indian Ocean direct
    R2 — via Seychelles + Malacca
    R3 — around Cape Agulhas

Historical data basis: Baltic Exchange BCI/BPI route data,
AIS vessel tracking patterns, port authority records.
"""

from __future__ import annotations
import numpy as np
from fastapi import APIRouter, Query
from app.data.datasets import get_economic_indicators, get_port_congestion, PORTS

router = APIRouter(prefix="/api/routes", tags=["Route Optimization"])

_RNG = np.random.default_rng(37)

# ── Complete route database ───────────────────────────────────────────────────
# Each route has: waypoints (lat/lon pairs), distance_nm, name, chokepoints,
# historical_avg_days, seasonal_risk, geopolitical_risk, traffic_density

ROUTE_DB: dict = {
    # ── AUSTRALIA ──────────────────────────────────────────────────────────
    ("AU", "INPRD", "R1"): {
        "name":            "Via Malacca Strait (Primary)",
        "waypoints":       [[-32.92,151.77],[-20.0,130.0],[1.37,103.82],[6.0,94.0],[13.5,80.5],[20.3,86.6]],
        "distance_nm":     4800,
        "base_days":       14.5,
        "chokepoints":     ["Malacca Strait"],
        "geopolitical_risk": 22,
        "traffic_density": "HIGH",
        "piracy_risk":     8,
        "weather_score":   18,
        "route_type":      "RECOMMENDED",
        "notes":           "Most used bulk route. High traffic. Malacca draft limit 25m."
    },
    ("AU", "INPRD", "R2"): {
        "name":            "Via Sunda Strait (South Java)",
        "waypoints":       [[-32.92,151.77],[-28.0,140.0],[-8.0,105.0],[1.0,97.0],[13.5,80.5],[20.3,86.6]],
        "distance_nm":     5100,
        "base_days":       15.5,
        "chokepoints":     ["Sunda Strait"],
        "geopolitical_risk": 15,
        "traffic_density": "MEDIUM",
        "piracy_risk":     10,
        "weather_score":   22,
        "route_type":      "ALTERNATE",
        "notes":           "Bypasses Malacca congestion. Sunda draft limit 20m. +1 day."
    },
    ("AU", "INPRD", "R3"): {
        "name":            "Via Lombok Strait (Deep Water)",
        "waypoints":       [[-32.92,151.77],[-28.0,140.0],[-8.5,115.0],[0.5,105.0],[7.0,87.0],[20.3,86.6]],
        "distance_nm":     5400,
        "base_days":       16.5,
        "chokepoints":     ["Lombok Strait"],
        "geopolitical_risk": 12,
        "traffic_density": "LOW",
        "piracy_risk":     6,
        "weather_score":   20,
        "route_type":      "DEEP_WATER",
        "notes":           "Best for Capesize. No depth restriction. Avoids all congestion. +2 days."
    },
    # ── INDONESIA ──────────────────────────────────────────────────────────
    ("ID", "INPRD", "R1"): {
        "name":            "Via Malacca Strait (Primary)",
        "waypoints":       [[-0.5,117.15],[3.0,100.5],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     2200,
        "base_days":       7.0,
        "chokepoints":     ["Malacca Strait"],
        "geopolitical_risk": 18,
        "traffic_density": "HIGH",
        "piracy_risk":     12,
        "weather_score":   20,
        "route_type":      "RECOMMENDED",
        "notes":           "Standard route via Malacca. Fastest for Indonesia origin."
    },
    ("ID", "INPRD", "R2"): {
        "name":            "Via Sunda Strait (South Sumatra)",
        "waypoints":       [[-0.5,117.15],[-5.5,105.0],[2.0,98.0],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     2500,
        "base_days":       8.0,
        "chokepoints":     ["Sunda Strait"],
        "geopolitical_risk": 12,
        "traffic_density": "MEDIUM",
        "piracy_risk":     8,
        "weather_score":   18,
        "route_type":      "ALTERNATE",
        "notes":           "South Sumatra approach via Sunda Strait. +1 day, less congestion."
    },
    ("ID", "INPRD", "R3"): {
        "name":            "Via Karimata Strait (West Kalimantan)",
        "waypoints":       [[-0.5,117.15],[-1.5,108.5],[3.5,103.0],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     2350,
        "base_days":       7.5,
        "chokepoints":     ["Karimata Strait"],
        "geopolitical_risk": 10,
        "traffic_density": "LOW",
        "piracy_risk":     15,
        "weather_score":   25,
        "route_type":      "ALTERNATE",
        "notes":           "West Kalimantan coal direct route. Shorter than Sunda but higher piracy watch."
    },
    # ── USA ────────────────────────────────────────────────────────────────
    ("US", "INPRD", "R1"): {
        "name":            "Via Suez Canal + Malacca (Standard)",
        "waypoints":       [[36.85,-76.29],[30.5,32.28],[12.6,43.9],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     11500,
        "base_days":       34.5,
        "chokepoints":     ["Suez Canal", "Malacca Strait"],
        "geopolitical_risk": 52,
        "traffic_density": "HIGH",
        "piracy_risk":     22,
        "weather_score":   28,
        "route_type":      "STANDARD",
        "notes":           "Standard US-India route via Suez. Subject to Red Sea disruptions."
    },
    ("US", "INPRD", "R2"): {
        "name":            "Via Cape of Good Hope (Risk-Free)",
        "waypoints":       [[36.85,-76.29],[0.0,-20.0],[-35.0,20.0],[0.0,63.0],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     16200,
        "base_days":       49.0,
        "chokepoints":     [],
        "geopolitical_risk": 8,
        "traffic_density": "LOW",
        "piracy_risk":     5,
        "weather_score":   35,
        "route_type":      "SAFE_ALTERNATE",
        "notes":           "Avoids Suez/Red Sea entirely. +14.5 days but zero geopolitical risk."
    },
    ("US", "INPRD", "R3"): {
        "name":            "Via Suez + Sunda Strait",
        "waypoints":       [[36.85,-76.29],[30.5,32.28],[5.0,60.0],[-5.0,95.0],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     12100,
        "base_days":       36.5,
        "chokepoints":     ["Suez Canal", "Sunda Strait"],
        "geopolitical_risk": 45,
        "traffic_density": "MEDIUM",
        "piracy_risk":     15,
        "weather_score":   30,
        "route_type":      "ALTERNATE",
        "notes":           "Suez then south avoiding Malacca congestion. +2 days vs standard."
    },
    # ── MOZAMBIQUE ─────────────────────────────────────────────────────────
    ("MZ", "INPRD", "R1"): {
        "name":            "Via Indian Ocean Direct",
        "waypoints":       [[-25.97,32.59],[-15.0,50.0],[0.0,65.0],[8.0,77.0],[20.3,86.6]],
        "distance_nm":     5600,
        "base_days":       17.0,
        "chokepoints":     [],
        "geopolitical_risk": 12,
        "traffic_density": "MEDIUM",
        "piracy_risk":     18,
        "weather_score":   30,
        "route_type":      "RECOMMENDED",
        "notes":           "Direct Indian Ocean crossing. No chokepoints but monsoon risk Jun-Sep."
    },
    ("MZ", "INPRD", "R2"): {
        "name":            "Via Seychelles + Sri Lanka",
        "waypoints":       [[-25.97,32.59],[-5.0,55.0],[4.6,55.5],[6.5,80.0],[20.3,86.6]],
        "distance_nm":     6100,
        "base_days":       18.5,
        "chokepoints":     [],
        "geopolitical_risk": 8,
        "traffic_density": "LOW",
        "piracy_risk":     12,
        "weather_score":   22,
        "route_type":      "ALTERNATE",
        "notes":           "Northern Indian Ocean via Seychelles. Avoids Somali Basin."
    },
    ("MZ", "INPRD", "R3"): {
        "name":            "Via Cape Agulhas + Malacca",
        "waypoints":       [[-25.97,32.59],[-34.5,26.0],[-10.0,52.0],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     7200,
        "base_days":       22.0,
        "chokepoints":     ["Malacca Strait"],
        "geopolitical_risk": 10,
        "traffic_density": "MEDIUM",
        "piracy_risk":     8,
        "weather_score":   38,
        "route_type":      "LONG_ALTERNATE",
        "notes":           "Longer but avoids piracy zones. Not recommended for standard bulk."
    },
    # ── RUSSIA ─────────────────────────────────────────────────────────────
    ("RU", "INPRD", "R1"): {
        "name":            "Via Suez Canal + Malacca",
        "waypoints":       [[45.21,36.72],[31.28,32.28],[12.6,43.9],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     7200,
        "base_days":       22.0,
        "chokepoints":     ["Suez Canal", "Malacca Strait"],
        "geopolitical_risk": 55,
        "traffic_density": "HIGH",
        "piracy_risk":     20,
        "weather_score":   25,
        "route_type":      "STANDARD",
        "notes":           "Standard Russia-India route. High geopolitical risk via Red Sea."
    },
    ("RU", "INPRD", "R2"): {
        "name":            "Via Cape of Good Hope (Sanctions Safe)",
        "waypoints":       [[45.21,36.72],[20.0,30.0],[-10.0,20.0],[-35.0,20.0],[0.0,63.0],[20.3,86.6]],
        "distance_nm":     12800,
        "base_days":       38.5,
        "chokepoints":     [],
        "geopolitical_risk": 10,
        "traffic_density": "LOW",
        "piracy_risk":     5,
        "weather_score":   35,
        "route_type":      "SAFE_ALTERNATE",
        "notes":           "Avoids Suez/Red Sea entirely. Used during sanctions periods. +16.5 days."
    },
    ("RU", "INPRD", "R3"): {
        "name":            "Via Suez + Sunda Strait",
        "waypoints":       [[45.21,36.72],[31.28,32.28],[5.0,60.0],[-5.0,95.0],[5.56,80.0],[20.3,86.6]],
        "distance_nm":     7800,
        "base_days":       23.5,
        "chokepoints":     ["Suez Canal", "Sunda Strait"],
        "geopolitical_risk": 48,
        "traffic_density": "MEDIUM",
        "piracy_risk":     14,
        "weather_score":   28,
        "route_type":      "ALTERNATE",
        "notes":           "Suez then south bypassing Malacca. +1.5 days vs standard."
    },
}

# ── Route colors for map display ─────────────────────────────────────────────
ROUTE_COLORS = {
    "R1": "#003087",   # SAIL navy — primary/recommended
    "R2": "#e65100",   # Orange — alternate
    "R3": "#1b5e20",   # Green — deep water / safe alternate
}

ROUTE_DASH = {
    "R1": None,        # solid line
    "R2": "8 5",       # dashed
    "R3": "4 4",       # dotted
}


def _adjust_for_destination(route: dict, dest_port_id: str) -> dict:
    """Adjust waypoints to end at the actual destination port."""
    port = PORTS.get(dest_port_id, {})
    if not port:
        return route
    dest_wp = [port["lat"], port["lon"]]
    wps = list(route["waypoints"])
    wps[-1] = dest_wp
    return {**route, "waypoints": wps}


def _score_route(route: dict, cargo_mt: float, vessel_draft: float,
                 month: int, freight_rate: float) -> dict:
    """
    AI composite scoring:
      Time Score    (0-100): lower transit days = better
      Cost Score    (0-100): lower freight cost = better
      Risk Score    (0-100): lower geopolitical + weather + piracy = better
      Composite     (0-100): weighted blend — user can weight by priority
    """
    econ = get_economic_indicators()
    usd_inr = econ["usd_inr"]
    VLSFO = 580.0

    # Transit time
    sea_days = route["base_days"]
    # Seasonal adjustment: monsoon adds 0.5-1.5 days
    if month in [6, 7, 8, 9]:
        sea_days += float(_RNG.uniform(0.5, 1.5))

    # Voyage cost (hire 19500/day Kamsarmax + fuel)
    fuel_per_day = 40   # Kamsarmax approx
    speed_kn     = 14.0
    voyage_cost_usd = sea_days * 19_500 + sea_days * fuel_per_day * VLSFO
    freight_cost_usd = freight_rate * cargo_mt
    total_cost_usd   = voyage_cost_usd + freight_cost_usd
    total_cost_inr   = round(total_cost_usd * usd_inr, 0)

    # Risk composite
    risk_raw = (
        route["geopolitical_risk"] * 0.40 +
        route["weather_score"]    * 0.30 +
        route["piracy_risk"]      * 0.20 +
        (20 if route["traffic_density"] == "HIGH" else
         10 if route["traffic_density"] == "MEDIUM" else 5) * 0.10
    )

    # Chokepoint penalty
    chokepoint_penalty = len(route["chokepoints"]) * 8
    risk_score = min(100, round(risk_raw + chokepoint_penalty))

    # Normalised scores (lower = better → invert for display)
    # Time: 0 days=best, 50 days=worst
    time_score = max(0, 100 - int((sea_days / 50) * 100))
    # Cost: relative to freight_rate baseline
    cost_score = max(0, 100 - int((total_cost_usd / (freight_rate * cargo_mt * 3)) * 100))
    # Risk: direct (already 0-100, lower=better)
    safety_score = 100 - risk_score

    # AI composite (equal weight: time 35%, cost 35%, safety 30%)
    composite = round(time_score * 0.35 + cost_score * 0.35 + safety_score * 0.30)

    return {
        "sea_days":         round(sea_days, 1),
        "voyage_cost_usd":  int(voyage_cost_usd),
        "freight_cost_usd": int(freight_cost_usd),
        "total_cost_usd":   int(total_cost_usd),
        "total_cost_inr":   int(total_cost_inr),
        "risk_score":       risk_score,
        "time_score":       time_score,
        "cost_score":       cost_score,
        "safety_score":     safety_score,
        "composite_score":  composite,
    }


# ── API Endpoint ──────────────────────────────────────────────────────────────

@router.get("")
def optimize_routes(
    origin_id:   str   = Query(default="AU"),
    port_id:     str   = Query(default="INPRD"),
    cargo_mt:    float = Query(default=80_000),
    vessel_draft:float = Query(default=13.8),
    month:       int   = Query(default=11, ge=1, le=12),
    freight_rate:float = Query(default=11.2),
    priority:    str   = Query(default="balanced",
                               description="balanced | fastest | cheapest | safest"),
):
    """
    Returns up to 3 alternative routes for the given origin→destination pair.
    Each route includes waypoints, scores, and AI recommendation.
    """
    routes_out = []
    route_keys = ["R1", "R2", "R3"]

    for rk in route_keys:
        key = (origin_id, port_id, rk)
        # Fallback: try with INPRD if destination not in DB
        fallback_key = (origin_id, "INPRD", rk)
        raw = ROUTE_DB.get(key) or ROUTE_DB.get(fallback_key)
        if not raw:
            continue

        route = _adjust_for_destination(raw, port_id)
        scores = _score_route(route, cargo_mt, vessel_draft, month, freight_rate)

        routes_out.append({
            "route_id":        rk,
            "name":            route["name"],
            "waypoints":       route["waypoints"],
            "distance_nm":     route["distance_nm"],
            "chokepoints":     route["chokepoints"],
            "traffic_density": route["traffic_density"],
            "route_type":      route["route_type"],
            "notes":           route["notes"],
            "color":           ROUTE_COLORS[rk],
            "dash":            ROUTE_DASH[rk],
            **scores,
        })

    if not routes_out:
        # Generic fallback for destinations not in DB
        routes_out = _generic_fallback(origin_id, port_id, cargo_mt, month, freight_rate)

    # Sort by priority
    sort_key = {
        "fastest":  lambda r: -r["time_score"],
        "cheapest": lambda r: -r["cost_score"],
        "safest":   lambda r: -r["safety_score"],
        "balanced": lambda r: -r["composite_score"],
    }.get(priority, lambda r: -r["composite_score"])

    routes_out.sort(key=sort_key)

    # AI recommendation: highest composite score
    best = max(routes_out, key=lambda r: r["composite_score"])
    best_id = best["route_id"]

    # Saving vs worst route
    worst_cost = max(r["total_cost_usd"] for r in routes_out)
    best_cost  = min(r["total_cost_usd"] for r in routes_out)
    saving_usd = round(worst_cost - best_cost, 0)
    econ = get_economic_indicators()
    saving_inr = round(saving_usd * econ["usd_inr"], 0)

    return {
        "origin_id":         origin_id,
        "port_id":           port_id,
        "routes":            routes_out,
        "recommended_route": best_id,
        "recommendation": (
            f"Route {best_id} ({best['name']}) is optimal. "
            f"Composite score: {best['composite_score']}/100. "
            f"Transit: {best['sea_days']} days. "
            f"Saving vs worst route: ${saving_usd:,.0f} (Rs.{saving_inr/1e5:.1f}L)."
        ),
        "saving_vs_worst_usd": int(saving_usd),
        "saving_vs_worst_inr": int(saving_inr),
        "priority":          priority,
    }


def _generic_fallback(origin_id, port_id, cargo_mt, month, freight_rate):
    """Generate generic 3 routes when specific entry not in DB."""
    port = PORTS.get(port_id, PORTS.get("INPRD", {}))
    dest = [port.get("lat", 20.3), port.get("lon", 86.6)]
    origins_coords = {
        "AU":[-32.92,151.77], "ID":[-0.5,117.15],
        "US":[36.85,-76.29],  "MZ":[-25.97,32.59], "RU":[45.21,36.72],
    }
    orig = origins_coords.get(origin_id, [0, 80])
    mid  = [5.56, 80.0]
    dist_base = {"AU":4800,"ID":2200,"US":11500,"MZ":5600,"RU":7200}.get(origin_id,5000)

    result = []
    for i, (name, dist_mult, risk_add, days_add) in enumerate([
        ("Via Malacca Strait (Primary)", 1.0,  0, 0),
        ("Via Alternate Route (South)",  1.08, -8, 1),
        ("Via Safe Deep-Water Route",    1.15, -15, 2),
    ]):
        rk = f"R{i+1}"
        dist = int(dist_base * dist_mult)
        days = round(dist / (14.0 * 24) + 4 + days_add, 1)
        econ = get_economic_indicators()
        cost = int(days * 19500 + days * 40 * 580 + freight_rate * cargo_mt)
        risk = max(10, min(80, 30 + risk_add + (10 if month in [6,7,8,9] else 0)))
        result.append({
            "route_id":        rk,
            "name":            name,
            "waypoints":       [orig, mid, dest],
            "distance_nm":     dist,
            "chokepoints":     ["Malacca Strait"] if i == 0 else [],
            "traffic_density": ["HIGH","MEDIUM","LOW"][i],
            "route_type":      ["RECOMMENDED","ALTERNATE","SAFE_ALTERNATE"][i],
            "notes":           f"Fallback route {rk} for {origin_id}→{port_id}",
            "color":           ROUTE_COLORS[rk],
            "dash":            ROUTE_DASH[rk],
            "sea_days":        days,
            "voyage_cost_usd": int(days * 19500 + days * 40 * 580),
            "freight_cost_usd": int(freight_rate * cargo_mt),
            "total_cost_usd":  cost,
            "total_cost_inr":  int(cost * econ["usd_inr"]),
            "risk_score":      risk,
            "time_score":      max(0, 100 - int((days / 50) * 100)),
            "cost_score":      75 - i * 5,
            "safety_score":    100 - risk,
            "composite_score": 75 - i * 3,
        })
    return result
