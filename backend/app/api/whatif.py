"""
NayaDisha — What-If Simulation Studio + Port Intelligence API
Endpoint 1: POST /api/whatif/simulate  — scenario vs baseline
Endpoint 2: POST /api/whatif/port-switch — AI alternate port recommendation
Endpoint 3: GET  /api/whatif/port-intelligence — AI port congestion + weather analysis
"""
from __future__ import annotations
import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from app.data.datasets import (
    PORTS, BASE_FREIGHT, get_route,
    get_port_congestion, get_seasonal_factor, get_economic_indicators,
)
from app.services.analyze_engine import analyze, VLSFO_USD, CO2_FACTOR, CARBON_LEVY, FILL, PORT_DAYS

router  = APIRouter(prefix="/api/whatif", tags=["What-If Studio"])
_RNG    = np.random.default_rng(55)

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    # Base shipment
    commodity:       str   = "thermal_coal"
    quantity_mt:     float = Field(default=80_000, ge=10_000, le=500_000)
    origin_id:       str   = "AU"
    port_id:         str   = "INPRD"
    target_month:    int   = Field(default=11, ge=1, le=12)
    target_year:     int   = Field(default=2026, ge=2025, le=2030)
    contract_months: int   = Field(default=6, ge=1, le=24)
    # What-If levers (deltas from baseline)
    terminal_delay_hrs:   float = Field(default=0,   ge=-48, le=72,
                                        description="Extra terminal delay in hours (+ve = worse)")
    route_capacity_pct:   float = Field(default=0,   ge=-50, le=30,
                                        description="Route capacity change % (-ve = shortage)")
    demand_spike_pct:     float = Field(default=0,   ge=-30, le=50,
                                        description="Demand spike % (+ve = more demand → higher rates)")


class PortSwitchRequest(BaseModel):
    commodity:    str   = "thermal_coal"
    quantity_mt:  float = Field(default=80_000, ge=10_000, le=500_000)
    origin_id:    str   = "AU"
    current_port: str   = "INPRD"
    target_month: int   = Field(default=11, ge=1, le=12)
    target_year:  int   = Field(default=2026, ge=2025, le=2030)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER — compute voyage cost for a port
# ─────────────────────────────────────────────────────────────────────────────

def _voyage_cost_for_port(origin_id: str, port_id: str, cargo_mt: float,
                           freight_rate: float, extra_days: float = 0) -> dict:
    from app.data.datasets import VESSELS
    route    = get_route(origin_id, port_id)
    dist_nm  = route["distance_nm"]
    port     = PORTS.get(port_id, {})
    max_draft = port.get("max_draft_m", 14.0)

    eligible = [v for v in VESSELS if v["draft_m"] <= max_draft] or VESSELS
    def score(v):
        days  = dist_nm / (v["speed_kn"] * 24) + PORT_DAYS + extra_days
        fuel  = days * v["fuel_tpd"]
        cpv   = days * v["hire_usd_day"] + fuel * VLSFO_USD + fuel * CO2_FACTOR * CARBON_LEVY
        parcel = min(v["dwt"] * FILL, cargo_mt)
        n_voy  = int(np.ceil(cargo_mt / parcel))
        return cpv * n_voy / cargo_mt + (n_voy - 1) * 1.50

    best   = min(eligible, key=score)
    days   = dist_nm / (best["speed_kn"] * 24) + PORT_DAYS + extra_days
    fuel   = days * best["fuel_tpd"]
    cpv    = days * best["hire_usd_day"] + fuel * VLSFO_USD + fuel * CO2_FACTOR * CARBON_LEVY
    parcel = min(best["dwt"] * FILL, cargo_mt)
    n_voy  = int(np.ceil(cargo_mt / parcel))
    total  = round(cpv * n_voy, 0)
    return {
        "vessel_type":   best["type"],
        "voyages":       n_voy,
        "sea_days":      round(dist_nm / (best["speed_kn"] * 24), 1),
        "total_days":    round(days, 1),
        "total_cost_usd": int(total),
        "cost_per_tonne": round(total / cargo_mt, 2),
        "freight_charge": round(freight_rate * cargo_mt, 0),
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1 — What-If Simulation
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/simulate")
def run_simulation(req: SimulateRequest):
    """
    Runs baseline analysis + scenario analysis and computes delta.
    Terminal delay → extra port-stay days → more hire + fuel cost.
    Route capacity slash → upward freight rate pressure.
    Demand spike → rate multiplier increase.
    """
    econ     = get_economic_indicators()
    seasonal = get_seasonal_factor(req.target_month, req.target_year)
    route    = get_route(req.origin_id, req.port_id)
    base_rate = BASE_FREIGHT.get(req.origin_id, {}).get(req.port_id, 12.0)

    # ── BASELINE ────────────────────────────────────────────────────────────
    baseline_rate = base_rate * seasonal["rate_multiplier"]
    baseline_vc   = _voyage_cost_for_port(req.origin_id, req.port_id, req.quantity_mt, baseline_rate)
    # total_cost_usd = vessel hire+fuel+carbon; freight_charge = freight rate × cargo
    # These are two separate cost components — vessel logistics vs freight market
    baseline_total_usd = baseline_vc["total_cost_usd"] + int(baseline_vc["freight_charge"])
    baseline_total_inr = round(baseline_total_usd * econ["usd_inr"], 0)

    # ── SCENARIO ADJUSTMENTS ─────────────────────────────────────────────────
    # 1. Terminal delay → extra sea/port days
    extra_days   = req.terminal_delay_hrs / 24.0

    # 2. Route capacity slash → rate increases (supply squeeze)
    capacity_rate_impact = -req.route_capacity_pct * 0.003   # -1% capacity → +0.3% rate
    scenario_rate = baseline_rate * (1 + capacity_rate_impact)

    # 3. Demand spike → further rate pressure
    demand_rate_impact = req.demand_spike_pct * 0.004         # +1% demand → +0.4% rate
    scenario_rate *= (1 + demand_rate_impact)
    scenario_rate  = round(max(baseline_rate * 0.5, scenario_rate), 2)

    scenario_vc = _voyage_cost_for_port(
        req.origin_id, req.port_id, req.quantity_mt, scenario_rate, extra_days
    )
    scenario_total_usd = scenario_vc["total_cost_usd"] + int(scenario_vc["freight_charge"])
    scenario_total_inr = round(scenario_total_usd * econ["usd_inr"], 0)

    delta_cost_inr = scenario_total_inr - baseline_total_inr
    delta_cost_usd = round(delta_cost_inr / econ["usd_inr"], 0)
    impact_pct     = round((delta_cost_inr / max(baseline_total_inr, 1)) * 100, 2)

    # ── RISK LEVEL ────────────────────────────────────────────────────────────
    abs_impact = abs(impact_pct)
    risk_level = "CRITICAL" if abs_impact > 15 else "HIGH" if abs_impact > 8 else "MEDIUM" if abs_impact > 3 else "LOW"
    risk_color = {"CRITICAL": "red", "HIGH": "orange", "MEDIUM": "yellow", "LOW": "green"}[risk_level]

    # ── OPERATIONAL SHIFTS ────────────────────────────────────────────────────
    # AI-generated re-routing / mitigation suggestions
    shifts = []
    if req.terminal_delay_hrs > 12:
        shifts.append({
            "from": req.port_id, "to": "alternate route",
            "mode": "VIRTUAL ARRIVAL",
            "impact_mt": round(req.quantity_mt * 0.3),
            "description": f"Slow-steam to absorb {req.terminal_delay_hrs:.0f}h terminal backlog — saves ≈ ${req.terminal_delay_hrs * 900:,.0f} in demurrage.",
        })
    if req.route_capacity_pct < -10:
        shifts.append({
            "from": req.origin_id, "to": "ID (alternate supply)",
            "mode": "ORIGIN SWITCH",
            "impact_mt": round(req.quantity_mt * 0.5),
            "description": f"Route capacity -{abs(req.route_capacity_pct):.0f}% — shift 50% volume to Indonesia to bypass squeeze.",
        })
    if req.demand_spike_pct > 10:
        shifts.append({
            "from": "SPOT", "to": "6M CoA",
            "mode": "CONTRACT LOCK",
            "impact_mt": round(req.quantity_mt),
            "description": f"Demand +{req.demand_spike_pct:.0f}% expected — lock 6-month CoA immediately at current rate.",
        })
    if not shifts:
        shifts.append({
            "from": "current", "to": "current",
            "mode": "NO ACTION",
            "impact_mt": 0,
            "description": "Scenario impact is within tolerance. Proceed with standard schedule.",
        })

    # ── AI RECOMMENDATION ─────────────────────────────────────────────────────
    if risk_level in ("CRITICAL", "HIGH"):
        recommendation = (
            f"Scenario stress is {risk_level}. Cost impact ₹{abs(delta_cost_inr)/1_00_000:.1f}L "
            f"({impact_pct:+.1f}%). "
            + (f"Terminal delay of {req.terminal_delay_hrs:.0f}h will add significant demurrage — activate virtual arrival. " if req.terminal_delay_hrs > 0 else "")
            + (f"Route capacity -{abs(req.route_capacity_pct):.0f}% will spike rates — diversify origin mix. " if req.route_capacity_pct < 0 else "")
            + (f"Demand spike +{req.demand_spike_pct:.0f}% detected — fix forward contract immediately." if req.demand_spike_pct > 0 else "")
        )
    else:
        recommendation = (
            f"Scenario within acceptable range ({impact_pct:+.1f}%). "
            "Monitor conditions but no immediate action required."
        )

    return {
        "baseline": {
            "rate_usd_mt":    round(baseline_rate, 2),
            "total_cost_inr": int(baseline_total_inr),
            "total_cost_usd": int(baseline_total_usd),
            "vessel":         baseline_vc,
            "label":          "Baseline (No Disruption)",
        },
        "scenario": {
            "rate_usd_mt":    round(scenario_rate, 2),
            "total_cost_inr": int(scenario_total_inr),
            "total_cost_usd": int(scenario_total_usd),
            "vessel":         scenario_vc,
            "extra_days":     round(extra_days, 1),
            "label":          "What-If Scenario",
        },
        "delta": {
            "cost_inr":      int(delta_cost_inr),
            "cost_usd":      int(delta_cost_usd),
            "impact_pct":    impact_pct,
            "rate_change":   round(scenario_rate - baseline_rate, 2),
        },
        "risk_level":        risk_level,
        "risk_color":        risk_color,
        "operational_shifts": shifts,
        "recommendation":    recommendation,
        "levers_applied": {
            "terminal_delay_hrs":  req.terminal_delay_hrs,
            "route_capacity_pct":  req.route_capacity_pct,
            "demand_spike_pct":    req.demand_spike_pct,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 2 — Smart Port Switcher
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/port-switch")
def port_switch_analysis(req: PortSwitchRequest):
    """
    AI compares all eligible alternate ports and ranks by total landed cost.
    """
    econ     = get_economic_indicators()
    seasonal = get_seasonal_factor(req.target_month, req.target_year)
    results  = []

    for port_id, port in PORTS.items():
        if req.commodity not in port.get("commodities", []):
            continue

        base_rate = BASE_FREIGHT.get(req.origin_id, {}).get(port_id)
        if base_rate is None:
            base_rate = BASE_FREIGHT.get(req.origin_id, {}).get("INPRD", 11.0) * (
                1 + (port["max_draft_m"] - 17.0) * -0.02
            )

        scenario_rate = base_rate * seasonal["rate_multiplier"]
        cong          = get_port_congestion(port_id, req.target_month)
        route         = get_route(req.origin_id, port_id)
        extra_days    = cong["avg_wait_days"] * 0.5   # congestion penalty
        vc            = _voyage_cost_for_port(req.origin_id, port_id, req.quantity_mt,
                                               scenario_rate, extra_days)
        # total_cost = vessel logistics cost + freight market cost
        total_usd     = vc["total_cost_usd"] + int(vc["freight_charge"])
        total_inr     = round(total_usd * econ["usd_inr"], 0)

        results.append({
            "port_id":           port_id,
            "port_name":         port["name"],
            "state":             port["state"],
            "is_current":        port_id == req.current_port,
            "freight_rate":      round(scenario_rate, 2),
            "total_cost_usd":    int(total_usd),
            "total_cost_inr":    int(total_inr),
            "cost_per_tonne_usd": vc["cost_per_tonne"],
            "congestion_level":  cong["congestion_level"],
            "avg_wait_days":     cong["avg_wait_days"],
            "distance_nm":       route["distance_nm"],
            "sailing_days":      route["sailing_days"],
            "vessel_type":       vc["vessel_type"],
            "max_draft_m":       port["max_draft_m"],
            "lightering":        port.get("lightering_required", False),
        })

    results.sort(key=lambda r: r["total_cost_inr"])
    for i, r in enumerate(results):
        r["rank"] = i + 1

    current  = next((r for r in results if r["is_current"]), results[0])
    best     = results[0]
    saving   = current["total_cost_inr"] - best["total_cost_inr"]

    # AI narrative
    if best["port_id"] != req.current_port and saving > 0:
        ai_recommendation = (
            f"AI recommends switching from {current['port_name']} to {best['port_name']}. "
            f"Estimated saving: ₹{saving/1_00_000:.1f} Lakhs (${saving/econ['usd_inr']:,.0f}). "
            f"{best['port_name']} has {best['congestion_level'].lower()} congestion and "
            f"{best['avg_wait_days']}d avg wait vs {current['avg_wait_days']}d at {current['port_name']}."
        )
    else:
        ai_recommendation = (
            f"{current['port_name']} is already the optimal port for this shipment. "
            f"No port switch recommended at this time."
        )

    return {
        "current_port":      current,
        "best_port":         best,
        "all_ports":         results,
        "saving_vs_current_inr": int(max(0, saving)),
        "saving_vs_current_usd": int(max(0, saving / econ["usd_inr"])),
        "ai_recommendation": ai_recommendation,
        "commodity":         req.commodity,
        "origin_id":         req.origin_id,
        "quantity_mt":       req.quantity_mt,
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 3 — AI Port Intelligence (auto-analysis)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/port-intelligence")
def port_intelligence(month: int = 11):
    """
    AI analyses every port for congestion severity, weather risk,
    berth utilisation, and cost impact — fully automatic.
    """
    from datetime import date
    seasonal = get_seasonal_factor(month, 2026)
    econ     = get_economic_indicators()
    reports  = []

    for port_id, port in PORTS.items():
        cong    = get_port_congestion(port_id, month)
        monsoon = seasonal["monsoon"]

        # Weather risk model
        # Paradip/Dhamra/Sagar: BoB cyclone corridor — highest weather risk
        # Visakhapatnam/Gangavaram: moderate
        # Haldia: river silting risk year-round
        weather_risk_base = {
            "INPRD": 65, "INDMA": 60, "INSAG": 58,
            "INVTZ": 42, "INGVP": 40, "INGPL": 45, "INHAL": 38,
        }
        weather_score = weather_risk_base.get(port_id, 40)
        if monsoon:
            weather_score = min(100, weather_score + 25)
        weather_level = "CRITICAL" if weather_score > 75 else "HIGH" if weather_score > 55 else "MEDIUM" if weather_score > 35 else "LOW"

        # Cost impact of delay (avg Panamax hire = $18,500/day)
        delay_cost_per_day = 18_500 + 580 * 38 * 0.1   # hire + bunker idle
        weather_delay_days = (weather_score / 100) * 3.5 if monsoon else (weather_score / 100) * 1.5
        congestion_delay   = cong["avg_wait_days"]
        total_delay_days   = round(weather_delay_days + congestion_delay, 1)
        delay_cost_usd     = round(total_delay_days * delay_cost_per_day, 0)
        delay_cost_inr     = round(delay_cost_usd * econ["usd_inr"], 0)

        # Berth throughput efficiency
        berths           = port.get("berths", 6)
        vessels_waiting  = cong["vessels_at_anchor"]
        berth_efficiency = max(0, round(100 - (vessels_waiting / berths) * 15, 1))

        # Silting/dredging risk (Haldia specific)
        silting_risk = port_id == "INHAL"

        # AI insight
        if cong["congestion_level"] == "HIGH" and weather_level in ("HIGH", "CRITICAL"):
            ai_insight = f"AVOID: Combined congestion + weather risk at {port['name']}. Reroute via alternate port."
            alert_level = "CRITICAL"
        elif cong["congestion_level"] == "HIGH":
            ai_insight = f"CAUTION: High congestion at {port['name']} — {vessels_waiting} vessels waiting. Consider 48h early berth request."
            alert_level = "HIGH"
        elif weather_level in ("HIGH", "CRITICAL"):
            ai_insight = f"WEATHER WATCH: {port['name']} in monsoon/cyclone corridor. Add {weather_delay_days:.1f}d weather buffer."
            alert_level = "HIGH"
        elif silting_risk:
            ai_insight = f"SILTING ALERT: Haldia draft restrictions may require lightering. Confirm vessel draft vs tidal window."
            alert_level = "MEDIUM"
        else:
            ai_insight = f"{port['name']} operating normally. {total_delay_days:.1f}d average total delay expected."
            alert_level = "LOW"

        reports.append({
            "port_id":           port_id,
            "port_name":         port["name"],
            "state":             port["state"],
            "alert_level":       alert_level,
            "congestion": {
                "level":         cong["congestion_level"],
                "utilisation_pct": cong["utilisation_pct"],
                "vessels_waiting": vessels_waiting,
                "avg_wait_days": congestion_delay,
            },
            "weather": {
                "level":          weather_level,
                "score":          weather_score,
                "is_monsoon":     monsoon,
                "expected_delay_days": round(weather_delay_days, 1),
            },
            "berth_efficiency_pct": berth_efficiency,
            "total_delay_days":  total_delay_days,
            "delay_cost_usd":    int(delay_cost_usd),
            "delay_cost_inr":    int(delay_cost_inr),
            "silting_risk":      silting_risk,
            "max_draft_m":       port["max_draft_m"],
            "ai_insight":        ai_insight,
        })

    # Sort by alert severity
    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    reports.sort(key=lambda r: order.get(r["alert_level"], 4))

    summary_cost = round(sum(r["delay_cost_inr"] for r in reports) / len(reports), 0)
    return {
        "month":           month,
        "monsoon_active":  seasonal["monsoon"],
        "reports":         reports,
        "avg_delay_cost_inr": int(summary_cost),
        "highest_risk_port": reports[0]["port_name"] if reports else None,
        "analysis_note":   seasonal["forecast_note"],
    }
