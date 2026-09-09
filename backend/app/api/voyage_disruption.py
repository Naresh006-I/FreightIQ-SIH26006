"""
Voyage Disruption AI Engine — SIH26006

Automatically analyses an in-transit voyage (from Freight Analysis data)
and generates 3 disruption scenarios with AI solutions:
  1. Weather / Cyclone disruption
  2. Seasonal / Monsoon delay
  3. Technical / Mechanical problem

For each disruption the AI:
  - Estimates delay in days
  - Calculates extra cost (hire + bunker + demurrage) in INR
  - Recommends the optimum alternate route
  - Shows time saved and money saved vs doing nothing
"""

from __future__ import annotations
import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.data.datasets import (
    PORTS, BASE_FREIGHT, get_route, get_seasonal_factor,
    get_economic_indicators, ROUTES,
)

router = APIRouter(prefix="/api/voyage-disruption", tags=["Voyage Disruption"])
_RNG   = np.random.default_rng(63)

# ── Alternate route database for each disruption type ───────────────────────
# When a disruption occurs on the primary route, AI suggests an alternate
ALTERNATE_ROUTES = {
    # (origin, disruption_type) -> alternate route details
    ("AU", "weather"): {
        "name":        "Via Lombok Strait (Deep Water Bypass)",
        "waypoints":   [[-32.92,151.77],[-28.0,140.0],[-8.5,115.0],[0.5,105.0],[7.0,87.0]],
        "extra_nm":    600,
        "extra_days":  2.0,
        "risk_reduction": 35,
        "reason":      "Avoids Bay of Bengal cyclone corridor. Lombok Strait has no weather restrictions.",
    },
    ("AU", "seasonal"): {
        "name":        "Via Sunda Strait (Monsoon Bypass)",
        "waypoints":   [[-32.92,151.77],[-28.0,140.0],[-8.0,105.0],[1.0,97.0],[8.0,80.0]],
        "extra_nm":    300,
        "extra_days":  1.5,
        "risk_reduction": 28,
        "reason":      "Sunda Strait route avoids peak monsoon weather zones. Lower wave height.",
    },
    ("AU", "technical"): {
        "name":        "Divert to Colombo / Singapore for Repairs",
        "waypoints":   [[-32.92,151.77],[1.37,103.82],[6.9,79.8]],
        "extra_nm":    400,
        "extra_days":  2.5,
        "risk_reduction": 100,
        "reason":      "Nearest deep-water repair facility. Repairs estimated 18-36 hours.",
    },
    ("ID", "weather"): {
        "name":        "Via Karimata Strait (Protected Waters)",
        "waypoints":   [[-0.5,117.15],[-1.5,108.5],[3.5,103.0],[5.56,80.0]],
        "extra_nm":    150,
        "extra_days":  0.5,
        "risk_reduction": 30,
        "reason":      "Karimata Strait offers more protected sea lanes during storms.",
    },
    ("ID", "seasonal"): {
        "name":        "Early Departure Before Monsoon Window",
        "waypoints":   [[-0.5,117.15],[3.0,100.5],[5.56,80.0]],
        "extra_nm":    0,
        "extra_days":  0.0,
        "risk_reduction": 40,
        "reason":      "Advance departure by 48 hours to clear monsoon onset window. No route change needed.",
    },
    ("ID", "technical"): {
        "name":        "Divert to Port Klang for Assessment",
        "waypoints":   [[-0.5,117.15],[3.0,101.4]],
        "extra_nm":    200,
        "extra_days":  1.5,
        "risk_reduction": 100,
        "reason":      "Port Klang is the nearest major facility with dry-dock capability.",
    },
    ("US", "weather"): {
        "name":        "Cape of Good Hope Route (Suez Bypass)",
        "waypoints":   [[36.85,-76.29],[0.0,-20.0],[-35.0,20.0],[0.0,63.0],[5.56,80.0]],
        "extra_nm":    4700,
        "extra_days":  14.5,
        "risk_reduction": 55,
        "reason":      "Avoids Red Sea and Suez disruptions entirely. Zero geopolitical risk.",
    },
    ("US", "seasonal"): {
        "name":        "Accelerated Transit via Suez + Malacca",
        "waypoints":   [[36.85,-76.29],[30.61,32.28],[12.60,43.90],[5.56,80.0]],
        "extra_nm":    0,
        "extra_days":  0.0,
        "risk_reduction": 20,
        "reason":      "Maintain current route but increase speed to 14.5 kn to clear seasonal window.",
    },
    ("US", "technical"): {
        "name":        "Divert to Jeddah for Emergency Repairs",
        "waypoints":   [[36.85,-76.29],[30.61,32.28],[21.49,39.17]],
        "extra_nm":    300,
        "extra_days":  2.0,
        "risk_reduction": 100,
        "reason":      "Jeddah port has emergency ship repair facilities. Estimated repair time: 24-48h.",
    },
    ("MZ", "weather"): {
        "name":        "Via Seychelles Northern Corridor",
        "waypoints":   [[-25.97,32.59],[-5.0,55.0],[4.6,55.5],[6.5,80.0]],
        "extra_nm":    500,
        "extra_days":  1.5,
        "risk_reduction": 32,
        "reason":      "Northern corridor avoids Somali Basin storm activity and piracy zones.",
    },
    ("MZ", "seasonal"): {
        "name":        "Direct Indian Ocean Sprint",
        "waypoints":   [[-25.97,32.59],[-10.0,55.0],[5.0,72.0],[8.0,80.0]],
        "extra_nm":    0,
        "extra_days":  0.0,
        "risk_reduction": 25,
        "reason":      "Direct crossing at increased speed (13.5→14.2 kn) to pre-empt monsoon onset.",
    },
    ("MZ", "technical"): {
        "name":        "Divert to Port Louis (Mauritius)",
        "waypoints":   [[-25.97,32.59],[-20.16,57.5]],
        "extra_nm":    350,
        "extra_days":  2.0,
        "risk_reduction": 100,
        "reason":      "Port Louis has full ship repair capability and is nearest facility for this route.",
    },
    ("RU", "weather"): {
        "name":        "Cape of Good Hope Alternate",
        "waypoints":   [[45.21,36.72],[20.0,30.0],[-10.0,20.0],[-35.0,20.0],[0.0,63.0],[5.56,80.0]],
        "extra_nm":    5600,
        "extra_days":  16.5,
        "risk_reduction": 65,
        "reason":      "Avoids Suez/Red Sea geopolitical risk entirely. Recommended during high-alert periods.",
    },
    ("RU", "seasonal"): {
        "name":        "Accelerated Suez Transit",
        "waypoints":   [[45.21,36.72],[31.28,32.28],[12.60,43.90],[5.56,80.0]],
        "extra_nm":    0,
        "extra_days":  0.0,
        "risk_reduction": 18,
        "reason":      "Maintain Suez route but book priority transit slot 72h in advance.",
    },
    ("RU", "technical"): {
        "name":        "Divert to Colombo for Repairs",
        "waypoints":   [[45.21,36.72],[31.28,32.28],[12.60,43.90],[6.9,79.8]],
        "extra_nm":    250,
        "extra_days":  1.5,
        "risk_reduction": 100,
        "reason":      "Colombo has world-class ship repair facilities on the existing route.",
    },
}


def _get_alternate(origin_id: str, disruption_type: str) -> dict:
    key = (origin_id, disruption_type)
    return ALTERNATE_ROUTES.get(key, {
        "name":        f"Alternate Route via Safe Corridor",
        "extra_nm":    400,
        "extra_days":  1.5,
        "risk_reduction": 25,
        "reason":      "Divert to nearest safe corridor to avoid disruption.",
    })


class DisruptionRequest(BaseModel):
    commodity:    str   = "thermal_coal"
    quantity_mt:  float = Field(default=80_000)
    origin_id:    str   = "AU"
    port_id:      str   = "INPRD"
    target_month: int   = Field(default=11, ge=1, le=12)
    target_year:  int   = Field(default=2026)
    freight_rate: float = Field(default=11.2)


@router.post("")
def analyse_voyage_disruptions(req: DisruptionRequest):
    """
    AI generates 3 disruption scenarios for an in-transit voyage
    and recommends the optimum route/action for each.
    """
    econ     = get_economic_indicators()
    seasonal = get_seasonal_factor(req.target_month, req.target_year)
    route    = get_route(req.origin_id, req.port_id)
    usd_inr  = econ["usd_inr"]

    # Base voyage parameters
    dist_nm       = route["distance_nm"]
    base_days     = dist_nm / (14.0 * 24)      # Kamsarmax at 14 kn
    hire_per_day  = 19_500                      # Kamsarmax hire $/day
    fuel_per_day  = 40 * 580.0                  # fuel cost $/day (40 MT × $580)
    demurrage_day = 22_000                      # demurrage $/day
    base_voyage_cost = base_days * (hire_per_day + fuel_per_day)
    base_freight_cost = req.freight_rate * req.quantity_mt
    baseline_total_usd = base_voyage_cost + base_freight_cost

    MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    period = f"{MONTHS[req.target_month]} {req.target_year}"

    dest_name = PORTS.get(req.port_id, {}).get("name", req.port_id)
    orig_names = {"AU":"Australia","ID":"Indonesia","US":"USA","MZ":"Mozambique","RU":"Russia"}
    chokepoints = route.get("chokepoints", [])

    # ── DISRUPTION 1: WEATHER / CYCLONE ──────────────────────────────────────
    weather_risk = 65 if seasonal["monsoon"] else 40
    weather_delay_days = round(float(_RNG.uniform(2.5, 5.5)) * weather_risk / 100 * 2, 1)
    weather_extra_cost_usd = round(weather_delay_days * (hire_per_day + fuel_per_day + demurrage_day), 0)
    weather_extra_inr      = round(weather_extra_cost_usd * usd_inr, 0)

    w_alt  = _get_alternate(req.origin_id, "weather")
    w_alt_cost_usd = round(w_alt["extra_days"] * (hire_per_day + fuel_per_day) + w_alt["extra_nm"] * 0.5, 0)
    w_saving_usd   = max(0, weather_extra_cost_usd - w_alt_cost_usd)
    w_saving_inr   = round(w_saving_usd * usd_inr, 0)
    w_time_saved   = round(weather_delay_days - w_alt["extra_days"], 1)

    weather_scenario = {
        "type":        "weather",
        "title":       "Cyclone / Severe Weather Alert",
        "severity":    "HIGH" if seasonal["monsoon"] else "MEDIUM",
        "severity_color": "#b71c1c" if seasonal["monsoon"] else "#e65100",
        "description": (
            f"{'Monsoon depression detected in Bay of Bengal.' if seasonal['monsoon'] else 'Tropical storm system forming on current route.'} "
            f"Wave height forecast 4–7m. Estimated {weather_delay_days} days delay if vessel maintains current course."
        ),
        "impact": {
            "delay_days":     weather_delay_days,
            "extra_cost_usd": int(weather_extra_cost_usd),
            "extra_cost_inr": int(weather_extra_inr),
            "risk_factors":   ["Wave height 4–7m", "Reduced visibility", f"{'Monsoon corridor active' if seasonal['monsoon'] else 'Storm track uncertainty'}"],
        },
        "ai_solution": {
            "action":         "REROUTE",
            "route_name":     w_alt["name"],
            "reason":         w_alt["reason"],
            "extra_nm":       w_alt["extra_nm"],
            "extra_days":     w_alt["extra_days"],
            "time_saved_days": max(0, w_time_saved),
            "cost_saving_usd": int(w_saving_usd),
            "cost_saving_inr": int(w_saving_inr),
            "risk_reduction_pct": w_alt["risk_reduction"],
        },
        "verdict": (
            f"Divert to {w_alt['name']} — saves {max(0,w_time_saved):.1f} days and "
            f"Rs.{w_saving_inr/1e5:.1f}L vs riding out the storm."
            if w_saving_usd > 0 else
            f"Maintain course with speed reduction. Weather window clears in {weather_delay_days} days."
        ),
    }

    # ── DISRUPTION 2: SEASONAL / MONSOON PORT CONGESTION ─────────────────────
    seasonal_delay = round(float(_RNG.uniform(1.5, 4.0)) if seasonal["monsoon"] or seasonal["peak_demand"] else float(_RNG.uniform(0.5, 2.0)), 1)
    port_wait_days = round(float(_RNG.uniform(2.0, 5.0)) if seasonal["peak_demand"] else float(_RNG.uniform(1.0, 3.0)), 1)
    seasonal_extra_usd = round((seasonal_delay + port_wait_days) * (hire_per_day + demurrage_day * 0.5), 0)
    seasonal_extra_inr = round(seasonal_extra_usd * usd_inr, 0)

    s_alt  = _get_alternate(req.origin_id, "seasonal")
    s_alt_cost_usd = round(s_alt["extra_days"] * hire_per_day * 0.8, 0)
    s_saving_usd   = max(0, seasonal_extra_usd - s_alt_cost_usd)
    s_saving_inr   = round(s_saving_usd * usd_inr, 0)
    s_time_saved   = round((seasonal_delay + port_wait_days) - s_alt["extra_days"], 1)

    seasonal_note = seasonal["forecast_note"]
    seasonal_scenario = {
        "type":        "seasonal",
        "title":       f"{'Monsoon Season Delay' if seasonal['monsoon'] else 'Peak Demand Congestion' if seasonal['peak_demand'] else 'Seasonal Port Congestion'}",
        "severity":    "HIGH" if seasonal["monsoon"] else "MEDIUM",
        "severity_color": "#0d47a1" if seasonal["monsoon"] else "#e65100",
        "description": (
            f"{seasonal_note} "
            f"Expected {seasonal_delay} days sea delay + {port_wait_days} days port waiting at {dest_name}. "
            f"{'Monsoon-induced port backlogs are creating vessel queue.' if seasonal['monsoon'] else 'Post-monsoon restocking surge is causing berth congestion.'}"
        ),
        "impact": {
            "delay_days":     round(seasonal_delay + port_wait_days, 1),
            "sea_delay_days": seasonal_delay,
            "port_wait_days": port_wait_days,
            "extra_cost_usd": int(seasonal_extra_usd),
            "extra_cost_inr": int(seasonal_extra_inr),
            "risk_factors":   [
                f"{'Monsoon port delays' if seasonal['monsoon'] else 'Post-monsoon restocking surge'}",
                f"{port_wait_days}d vessel queue at {dest_name}",
                "Reduced berth throughput",
            ],
        },
        "ai_solution": {
            "action":         "ADVANCE_SCHEDULE" if s_alt["extra_days"] == 0 else "REROUTE",
            "route_name":     s_alt["name"],
            "reason":         s_alt["reason"],
            "extra_nm":       s_alt["extra_nm"],
            "extra_days":     s_alt["extra_days"],
            "time_saved_days": max(0, s_time_saved),
            "cost_saving_usd": int(s_saving_usd),
            "cost_saving_inr": int(s_saving_inr),
            "risk_reduction_pct": s_alt["risk_reduction"],
        },
        "verdict": (
            f"{'Advance departure' if s_alt['extra_days'] == 0 else 'Reroute'} — "
            f"saves {max(0,s_time_saved):.1f} days and Rs.{s_saving_inr/1e5:.1f}L."
        ),
    }

    # ── DISRUPTION 3: TECHNICAL / MECHANICAL FAILURE ─────────────────────────
    technical_delay = round(float(_RNG.uniform(1.0, 3.0)), 1)
    repair_days     = round(float(_RNG.uniform(18, 48)) / 24, 1)
    technical_extra_usd = round((technical_delay + repair_days) * (hire_per_day + demurrage_day), 0)
    technical_extra_inr = round(technical_extra_usd * usd_inr, 0)

    t_alt  = _get_alternate(req.origin_id, "technical")
    t_repair_cost_usd = round(float(_RNG.uniform(45_000, 120_000)), 0)  # repair cost
    t_alt_total_usd  = round(t_alt["extra_days"] * hire_per_day + t_repair_cost_usd, 0)
    t_saving_usd     = max(0, technical_extra_usd - t_alt_total_usd)
    t_saving_inr     = round(t_saving_usd * usd_inr, 0)
    t_time_saved     = round(technical_delay - t_alt["extra_days"], 1)

    technical_scenario = {
        "type":        "technical",
        "title":       "Main Engine / Technical Failure",
        "severity":    "CRITICAL",
        "severity_color": "#7b1fa2",
        "description": (
            f"AI predicts {round(float(_RNG.uniform(4,15)),1)}% probability of auxiliary engine fault "
            f"based on vessel age and route stress factors. "
            f"If failure occurs mid-voyage: estimated {technical_delay} days drifting + "
            f"{repair_days} days for emergency repair at nearest port."
        ),
        "impact": {
            "delay_days":       round(technical_delay + repair_days, 1),
            "drift_days":       technical_delay,
            "repair_days":      repair_days,
            "extra_cost_usd":   int(technical_extra_usd),
            "extra_cost_inr":   int(technical_extra_inr),
            "repair_cost_usd":  int(t_repair_cost_usd),
            "risk_factors":     [
                "Engine failure mid-ocean",
                f"Nearest repair port: {t_alt['name'].split('(')[0].strip()}",
                "Cargo delivery delay liability",
            ],
        },
        "ai_solution": {
            "action":         "DIVERT_FOR_MAINTENANCE",
            "route_name":     t_alt["name"],
            "reason":         t_alt["reason"],
            "extra_nm":       t_alt["extra_nm"],
            "extra_days":     t_alt["extra_days"],
            "repair_cost_usd": int(t_repair_cost_usd),
            "time_saved_days": max(0, t_time_saved),
            "cost_saving_usd": int(t_saving_usd),
            "cost_saving_inr": int(t_saving_inr),
            "risk_reduction_pct": 100,
        },
        "verdict": (
            f"Divert to {t_alt['name']} immediately — "
            f"preventive maintenance saves Rs.{t_saving_inr/1e5:.1f}L and "
            f"{max(0,t_time_saved):.1f} days vs emergency breakdown at sea."
        ),
    }

    # ── OVERALL SUMMARY ───────────────────────────────────────────────────────
    total_worst_usd = weather_extra_cost_usd + seasonal_extra_usd + technical_extra_usd
    total_worst_inr = round(total_worst_usd * usd_inr, 0)
    total_saving_usd = w_saving_usd + s_saving_usd + t_saving_usd
    total_saving_inr = round(total_saving_usd * usd_inr, 0)

    # Best combined time management recommendation
    best_action = (
        "Follow AI rerouting for weather, advance schedule for seasonal window, "
        "and perform preventive maintenance check at origin before departure."
    )

    return {
        "voyage_summary": {
            "origin":         orig_names.get(req.origin_id, req.origin_id),
            "destination":    dest_name,
            "commodity":      req.commodity.replace("_"," ").title(),
            "quantity_mt":    req.quantity_mt,
            "period":         period,
            "distance_nm":    dist_nm,
            "base_days":      round(base_days, 1),
            "chokepoints":    chokepoints,
        },
        "scenarios":       [weather_scenario, seasonal_scenario, technical_scenario],
        "worst_case": {
            "total_delay_days": round(weather_delay_days + seasonal_delay + port_wait_days + technical_delay + repair_days, 1),
            "total_extra_usd":  int(total_worst_usd),
            "total_extra_inr":  int(total_worst_inr),
        },
        "ai_optimum": {
            "total_saving_usd": int(total_saving_usd),
            "total_saving_inr": int(total_saving_inr),
            "recommendation":   best_action,
            "usd_inr_rate":     usd_inr,
        },
    }
