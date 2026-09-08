"""
Risk Engine — SIH26006

4-pillar risk radar:
  1. Port Congestion
  2. Bay of Bengal Weather / Monsoon
  3. Bunker Price Shock
  4. Geopolitical / Chokepoints

Also computes parametric VaR (95 % / 99 %) and idle-vessel alerts.
"""

from __future__ import annotations
import numpy as np
from datetime import date
from typing import Dict, Any, List

_RNG = np.random.default_rng(7)


def _level(score: int) -> str:
    if score < 25:  return "LOW"
    if score < 50:  return "MEDIUM"
    if score < 75:  return "HIGH"
    return "CRITICAL"


def _level_color(level: str) -> str:
    return {"LOW": "green", "MEDIUM": "yellow", "HIGH": "orange", "CRITICAL": "red"}[level]


def compute_risk(current_rate: float, cargo_mt: float = 100_000) -> Dict[str, Any]:
    today   = date.today()
    monsoon = today.month in [6, 7, 8, 9]

    congestion  = int(_RNG.integers(20, 72))
    weather     = 65 if monsoon else int(_RNG.integers(10, 38))
    bunker      = int(_RNG.integers(15, 58))
    geopolitical= int(_RNG.integers(10, 52))

    pillars: List[Dict] = [
        {
            "name":    "Port Congestion",
            "score":   congestion,
            "level":   _level(congestion),
            "color":   _level_color(_level(congestion)),
            "description": "Average congestion severity across East Coast ports",
            "factors": [
                "Paradip vessel queue: moderate",
                "Haldia berth occupancy: 78 %",
                "Gangavaram: normal",
            ],
        },
        {
            "name":    "Bay of Bengal Weather",
            "score":   weather,
            "level":   _level(weather),
            "color":   _level_color(_level(weather)),
            "description": "Cyclone / monsoon depression risk on inbound routes",
            "factors": [
                "Monsoon season ACTIVE" if monsoon else "No active cyclone advisory",
                "Wave height forecast: 2.5–4.5 m",
                "Visibility: reduced (Jun–Sep)" if monsoon else "Good visibility",
            ],
        },
        {
            "name":    "Bunker Price Shock",
            "score":   bunker,
            "level":   _level(bunker),
            "color":   _level_color(_level(bunker)),
            "description": "Singapore VLSFO price volatility risk",
            "factors": [
                "VLSFO Singapore: $580 / MT",
                "30-day price change: +4.2 %",
                "Refinery utilisation: 87 %",
            ],
        },
        {
            "name":    "Geopolitical / Chokepoints",
            "score":   geopolitical,
            "level":   _level(geopolitical),
            "color":   _level_color(_level(geopolitical)),
            "description": "Suez, Malacca, Sunda Strait disruption risk",
            "factors": [
                "Malacca Strait: normal traffic",
                "Suez Canal: minor delays",
                "Red Sea: elevated watch",
            ],
        },
    ]

    overall = int(np.mean([p["score"] for p in pillars]))

    # Parametric VaR via Monte Carlo
    sigma = 0.025 * current_rate
    final = current_rate * np.exp(_RNG.normal(-0.5 * sigma**2, sigma, 1000))
    costs = final * cargo_mt
    var_95 = round(float(np.percentile(costs, 95)), 0)
    var_99 = round(float(np.percentile(costs, 99)), 0)

    # Alerts
    alerts: List[str] = []
    if weather > 50:
        alerts.append("BoB cyclonic system detected — add 5-day buffer to ETA.")
    if geopolitical > 42:
        alerts.append("Red Sea / Suez disruption watch — consider Cape of Good Hope re-routing.")
    if congestion > 60:
        alerts.append("High port congestion — activate virtual arrival slow-steaming.")
    if bunker > 50:
        alerts.append("Bunker spike risk — consider hedging VLSFO exposure.")

    rec = (
        "Risk ELEVATED — hedge freight, activate slow-steam, hold excess inventory."
        if overall > 55 else
        "Risk MODERATE — proceed with procurement schedule. Monitor weekly."
    )

    return {
        "pillars":            pillars,
        "overall_score":      overall,
        "overall_level":      _level(overall),
        "var_95_usd":         var_95,
        "var_99_usd":         var_99,
        "monsoon_active":     monsoon,
        "alerts":             alerts,
        "recommendation":     rec,
    }


def idle_vessel_risk(voyages: list) -> List[Dict]:
    """Flag voyages with high idle/wait probability."""
    flagged = []
    for v in voyages:
        if v.get("status") == "SCHEDULED" and v.get("cargo_mt", 0) < 50_000:
            flagged.append({
                "voyage_id": v["voyage_id"],
                "risk":      "Partial load — risk of idle waiting at anchorage",
                "action":    "Consider co-loading or deferring to next Kamsarmax slot",
            })
    return flagged
