"""
Vessel Optimizer — SIH26006

Greedy + rule-based allocation that respects:
  - Port maximum draft constraints
  - Mandatory Haldia lightering (Capesize → daughter barge at Sagar-Sandheads)
  - IMO 2026 CII grading (A–E)
  - Virtual arrival slow-steaming savings (cubic propulsion law)
"""

from __future__ import annotations
from typing import List, Dict, Any

# ── Constants ─────────────────────────────────────────────────────────────────
VLSFO_PRICE_USD   = 580.0    # $/MT bunker
CO2_FACTOR        = 3.17     # MT CO₂ per MT HFO
CARBON_LEVY_USD   = 30.0     # $/MT CO₂  (IMO CII 2026 carbon cost proxy)
FILL_FACTOR       = 0.95     # 95% DWT utilisation
PORT_DAYS         = 4        # average port stay (load + discharge)
LIGHTERING_COST   = 55_000   # $ per Capesize lightering operation at Sagar

VESSELS: List[Dict] = [
    {"type": "Handymax",  "dwt": 50_000,  "hire": 14_500, "fuel": 28, "speed": 13.0, "draft": 11.5},
    {"type": "Supramax",  "dwt": 62_000,  "hire": 16_000, "fuel": 32, "speed": 13.5, "draft": 12.5},
    {"type": "Ultramax",  "dwt": 63_500,  "hire": 17_000, "fuel": 33, "speed": 14.0, "draft": 12.8},
    {"type": "Panamax",   "dwt": 77_000,  "hire": 18_500, "fuel": 38, "speed": 13.5, "draft": 13.5},
    {"type": "Kamsarmax", "dwt": 82_000,  "hire": 19_500, "fuel": 40, "speed": 14.0, "draft": 13.8},
    {"type": "Capesize",  "dwt": 180_000, "hire": 28_000, "fuel": 55, "speed": 13.5, "draft": 18.2},
]

PORT_DRAFT: Dict[str, float] = {
    "INPRD": 17.0, "INVTZ": 14.5, "INGVP": 18.0,
    "INGPL": 12.5, "INDMA": 16.5, "INSAG": 16.0, "INHAL": 8.5,
}

ORIGIN_NM: Dict[str, float] = {
    "AU": 4800, "ID": 2200, "US": 11500, "MZ": 5600, "RU": 7200,
}

# CII reference thresholds (gCO₂ / DWT·NM)
CII_REF: Dict[str, Dict] = {
    "Handymax":  {"A": 4.2, "B": 4.8, "C": 5.5, "D": 6.5},
    "Supramax":  {"A": 4.0, "B": 4.6, "C": 5.3, "D": 6.2},
    "Ultramax":  {"A": 3.9, "B": 4.5, "C": 5.2, "D": 6.1},
    "Panamax":   {"A": 3.8, "B": 4.4, "C": 5.0, "D": 5.8},
    "Kamsarmax": {"A": 3.6, "B": 4.2, "C": 4.8, "D": 5.6},
    "Capesize":  {"A": 3.0, "B": 3.5, "C": 4.0, "D": 4.8},
}


def _cii_grade(vtype: str, gco2_dwt_nm: float) -> str:
    t = CII_REF.get(vtype, {"A": 4, "B": 5, "C": 6, "D": 7})
    if gco2_dwt_nm <= t["A"]: return "A"
    if gco2_dwt_nm <= t["B"]: return "B"
    if gco2_dwt_nm <= t["C"]: return "C"
    if gco2_dwt_nm <= t["D"]: return "D"
    return "E"


def _voyage_cost(v: Dict, dist_nm: float, lightering: bool) -> Dict[str, float]:
    days      = dist_nm / (v["speed"] * 24) + PORT_DAYS
    fuel_mt   = days * v["fuel"]
    hire_cost = days * v["hire"]
    fuel_cost = fuel_mt * VLSFO_PRICE_USD
    co2_mt    = fuel_mt * CO2_FACTOR
    carbon    = co2_mt * CARBON_LEVY_USD
    lt_cost   = LIGHTERING_COST if lightering else 0.0
    total     = hire_cost + fuel_cost + carbon + lt_cost
    cii_val   = (fuel_mt * CO2_FACTOR * 1e6) / (v["dwt"] * dist_nm)
    return {
        "total":        total,
        "hire":         hire_cost,
        "fuel":         fuel_cost,
        "carbon":       carbon,
        "lightering":   lt_cost,
        "sea_days":     days - PORT_DAYS,
        "cii_val":      cii_val,
    }


def optimize_vessels(
    origin_id: str,
    port_id: str,
    cargo_mt: float,
    freight_rate: float,
) -> Dict[str, Any]:
    max_draft = PORT_DRAFT.get(port_id, 14.0)
    dist_nm   = ORIGIN_NM.get(origin_id, 5000)
    haldia    = port_id == "INHAL"

    # Eligible vessels: respect port draft. For Haldia, force Capesize via lightering.
    eligible  = [v for v in VESSELS if v["draft"] <= max_draft or haldia]

    # Pick best by cost-per-tonne
    def cpt(v):
        lt = haldia and v["draft"] > 8.5
        c  = _voyage_cost(v, dist_nm, lt)
        return c["total"] / (v["dwt"] * FILL_FACTOR)

    best  = sorted(eligible, key=cpt)[0]   # lowest cost-per-tonne first
    # For bulk, largest fitting vessel usually wins — try largest eligible too
    by_size = sorted(eligible, key=lambda v: v["dwt"], reverse=True)
    for candidate in by_size:
        if _voyage_cost(candidate, dist_nm, haldia and candidate["draft"] > 8.5)["total"] / (candidate["dwt"] * FILL_FACTOR) <= cpt(best) * 1.05:
            best = candidate
            break

    allocations = []
    remaining   = cargo_mt
    total_cost  = 0.0
    while remaining > 1000:
        parcel   = min(remaining, best["dwt"] * FILL_FACTOR)
        lt_flag  = haldia and best["draft"] > 8.5
        vc       = _voyage_cost(best, dist_nm, lt_flag)
        cost     = vc["total"] * (parcel / (best["dwt"] * FILL_FACTOR))
        allocations.append({
            "vessel_type":         best["type"],
            "dwt":                 best["dwt"],
            "cargo_mt":            round(parcel, 0),
            "total_cost_usd":      round(cost, 0),
            "cost_per_tonne":      round(cost / parcel, 2),
            "cii_grade":           _cii_grade(best["type"], vc["cii_val"]),
            "sea_days":            round(vc["sea_days"], 1),
            "requires_lightering": lt_flag,
            "lightering_cost_usd": round(vc["lightering"], 0),
        })
        total_cost += cost
        remaining  -= parcel

    spot_cost = freight_rate * cargo_mt
    saving    = max(0.0, spot_cost - total_cost)

    return {
        "origin":               origin_id,
        "port":                 port_id,
        "total_cargo_mt":       cargo_mt,
        "allocations":          allocations,
        "total_cost_usd":       round(total_cost, 0),
        "spot_cost_usd":        round(spot_cost, 0),
        "saving_vs_spot_usd":   round(saving, 0),
        "recommendation": (
            f"Optimized allocation saves ${saving:,.0f} vs spot market."
            if saving > 0 else
            "Spot rate currently competitive — no significant saving from optimization."
        ),
    }


def virtual_arrival(
    vessel_type: str,
    design_speed: float,
    slow_speed: float,
    distance_nm: float,
    fuel_price: float,
    wait_days: float,
) -> Dict[str, Any]:
    """Cubic propulsion law: Fuel ∝ V³."""
    hire_map = {v["type"]: v["hire"] for v in VESSELS}
    fuel_map = {v["type"]: v["fuel"] for v in VESSELS}
    tpd_design = fuel_map.get(vessel_type, 45)
    hire_day   = hire_map.get(vessel_type, 22000)

    days_design  = distance_nm / (design_speed * 24)
    days_slow    = distance_nm / (slow_speed   * 24)
    tpd_slow     = tpd_design * (slow_speed / design_speed) ** 3

    fuel_design  = days_design * tpd_design
    fuel_slow    = days_slow   * tpd_slow
    bunker_saved = (fuel_design - fuel_slow) * fuel_price
    co2_saved    = (fuel_design - fuel_slow) * CO2_FACTOR
    extra_days   = days_slow - days_design
    hire_extra   = extra_days * hire_day
    net_saving   = bunker_saved - hire_extra

    return {
        "vessel_type":       vessel_type,
        "design_speed_kn":   design_speed,
        "slow_speed_kn":     slow_speed,
        "sea_days_design":   round(days_design, 1),
        "sea_days_slow":     round(days_slow,   1),
        "extra_sea_days":    round(extra_days,  1),
        "fuel_saved_mt":     round(fuel_design - fuel_slow, 1),
        "bunker_saving_usd": round(bunker_saved, 0),
        "hire_extra_usd":    round(hire_extra,   0),
        "net_saving_usd":    round(net_saving,   0),
        "co2_saved_mt":      round(co2_saved,    1),
        "worthwhile":        net_saving > 0,
        "recommendation": (
            f"Slow-steam at {slow_speed} kn — net saving ${net_saving:,.0f}, "
            f"CO₂ avoided {co2_saved:.0f} MT."
            if net_saving > 0 else
            "Virtual arrival not beneficial at current hire/bunker ratio."
        ),
    }
