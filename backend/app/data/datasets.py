"""
FreightIQ Dataset Layer — SIH26006
All 8 dataset types from the MVP plan, implemented as synthetic but
calibrated to real-world market ranges.

Dataset 1: Freight rates  (BDI-correlated, route-level $/MT)
Dataset 2: Commodity prices (coal, iron ore, limestone, bauxite $/MT)
Dataset 3: Port data       (draft, LOA, berths, capacity)
Dataset 4: Port congestion (utilisation, wait days)
Dataset 5: Vessel data     (DWT, draft, speed, hire, fuel)
Dataset 6: Economic data   (USD/INR, WPI, IIP, GDP growth)
Dataset 7: Seasonal data   (monsoon, Q-flags, holiday factor)
Dataset 8: Route data      (distance NM, sailing days, chokepoints)
"""

from __future__ import annotations
import numpy as np
from datetime import date

_RNG = np.random.default_rng(42)

# ─── Dataset 3: Port Reference ───────────────────────────────────────────────
PORTS: dict = {
    "INPRD": {
        "id": "INPRD", "name": "Paradip", "state": "Odisha",
        "lat": 20.317, "lon": 86.611,
        "max_draft_m": 17.0, "loa_max_m": 300, "beam_max_m": 50,
        "berths": 12, "annual_capacity_mt": 100_000_000,
        "commodities": ["thermal_coal", "coking_coal", "iron_ore"],
        "lightering_required": False,
    },
    "INVTZ": {
        "id": "INVTZ", "name": "Visakhapatnam", "state": "Andhra Pradesh",
        "lat": 17.686, "lon": 83.282,
        "max_draft_m": 14.5, "loa_max_m": 280, "beam_max_m": 45,
        "berths": 10, "annual_capacity_mt": 80_000_000,
        "commodities": ["coking_coal", "iron_ore", "thermal_coal"],
        "lightering_required": False,
    },
    "INGVP": {
        "id": "INGVP", "name": "Gangavaram", "state": "Andhra Pradesh",
        "lat": 17.623, "lon": 83.226,
        "max_draft_m": 18.0, "loa_max_m": 320, "beam_max_m": 55,
        "berths": 8, "annual_capacity_mt": 64_000_000,
        "commodities": ["iron_ore", "thermal_coal", "coking_coal"],
        "lightering_required": False,
    },
    "INGPL": {
        "id": "INGPL", "name": "Gopalpur", "state": "Odisha",
        "lat": 19.263, "lon": 84.893,
        "max_draft_m": 12.5, "loa_max_m": 200, "beam_max_m": 32,
        "berths": 4, "annual_capacity_mt": 20_000_000,
        "commodities": ["limestone", "bauxite"],
        "lightering_required": False,
    },
    "INDMA": {
        "id": "INDMA", "name": "Dhamra", "state": "Odisha",
        "lat": 20.892, "lon": 86.879,
        "max_draft_m": 16.5, "loa_max_m": 295, "beam_max_m": 48,
        "berths": 6, "annual_capacity_mt": 50_000_000,
        "commodities": ["thermal_coal", "coking_coal"],
        "lightering_required": False,
    },
    "INHAL": {
        "id": "INHAL", "name": "Haldia", "state": "West Bengal",
        "lat": 22.026, "lon": 88.069,
        "max_draft_m": 8.5, "loa_max_m": 180, "beam_max_m": 28,
        "berths": 9, "annual_capacity_mt": 45_000_000,
        "commodities": ["thermal_coal", "coking_coal"],
        "lightering_required": True,  # Capesize must lighter at Sagar
    },
}

# ─── Dataset 5: Vessel Reference ─────────────────────────────────────────────
VESSELS: list = [
    {"type": "Handymax",  "dwt": 50_000,  "hire_usd_day": 14_500, "fuel_tpd": 28, "speed_kn": 13.0, "draft_m": 11.5, "loa_m": 190, "beam_m": 32},
    {"type": "Supramax",  "dwt": 62_000,  "hire_usd_day": 16_000, "fuel_tpd": 32, "speed_kn": 13.5, "draft_m": 12.5, "loa_m": 200, "beam_m": 32},
    {"type": "Ultramax",  "dwt": 63_500,  "hire_usd_day": 17_000, "fuel_tpd": 33, "speed_kn": 14.0, "draft_m": 12.8, "loa_m": 210, "beam_m": 33},
    {"type": "Panamax",   "dwt": 77_000,  "hire_usd_day": 18_500, "fuel_tpd": 38, "speed_kn": 13.5, "draft_m": 13.5, "loa_m": 225, "beam_m": 32},
    {"type": "Kamsarmax", "dwt": 82_000,  "hire_usd_day": 19_500, "fuel_tpd": 40, "speed_kn": 14.0, "draft_m": 13.8, "loa_m": 229, "beam_m": 32},
    {"type": "Capesize",  "dwt": 180_000, "hire_usd_day": 28_000, "fuel_tpd": 55, "speed_kn": 13.5, "draft_m": 18.2, "loa_m": 300, "beam_m": 50},
]

# ─── Dataset 8: Route Reference ──────────────────────────────────────────────
ROUTES: dict = {
    ("AU", "INPRD"): {"distance_nm": 4_800, "sailing_days": 15, "chokepoints": ["Malacca"], "canal": None},
    ("AU", "INVTZ"): {"distance_nm": 4_600, "sailing_days": 14, "chokepoints": ["Malacca"], "canal": None},
    ("AU", "INGVP"): {"distance_nm": 4_600, "sailing_days": 14, "chokepoints": ["Malacca"], "canal": None},
    ("AU", "INGPL"): {"distance_nm": 4_750, "sailing_days": 15, "chokepoints": ["Malacca"], "canal": None},
    ("AU", "INDMA"): {"distance_nm": 4_850, "sailing_days": 15, "chokepoints": ["Malacca"], "canal": None},
    ("AU", "INHAL"): {"distance_nm": 5_100, "sailing_days": 16, "chokepoints": ["Malacca"], "canal": None},
    ("ID", "INPRD"): {"distance_nm": 2_200, "sailing_days":  7, "chokepoints": ["Malacca"], "canal": None},
    ("ID", "INVTZ"): {"distance_nm": 2_100, "sailing_days":  7, "chokepoints": ["Malacca"], "canal": None},
    ("ID", "INGVP"): {"distance_nm": 2_100, "sailing_days":  7, "chokepoints": ["Malacca"], "canal": None},
    ("ID", "INGPL"): {"distance_nm": 2_250, "sailing_days":  7, "chokepoints": ["Malacca"], "canal": None},
    ("ID", "INDMA"): {"distance_nm": 2_300, "sailing_days":  8, "chokepoints": ["Malacca"], "canal": None},
    ("ID", "INHAL"): {"distance_nm": 2_500, "sailing_days":  8, "chokepoints": ["Malacca"], "canal": None},
    ("US", "INPRD"): {"distance_nm": 11_500,"sailing_days": 35, "chokepoints": ["Suez","Malacca"], "canal": "Suez"},
    ("US", "INHAL"): {"distance_nm": 11_800,"sailing_days": 36, "chokepoints": ["Suez","Malacca"], "canal": "Suez"},
    ("MZ", "INPRD"): {"distance_nm": 5_600, "sailing_days": 17, "chokepoints": [],           "canal": None},
    ("MZ", "INGVP"): {"distance_nm": 5_400, "sailing_days": 17, "chokepoints": [],           "canal": None},
    ("RU", "INPRD"): {"distance_nm": 7_200, "sailing_days": 22, "chokepoints": ["Suez"],     "canal": "Suez"},
    ("RU", "INDMA"): {"distance_nm": 7_300, "sailing_days": 23, "chokepoints": ["Suez"],     "canal": "Suez"},
}

def get_route(origin_id: str, port_id: str) -> dict:
    key = (origin_id, port_id)
    if key in ROUTES:
        return ROUTES[key]
    # fallback: estimate from known distances
    fallback_nm = {"AU": 4800, "ID": 2200, "US": 11500, "MZ": 5600, "RU": 7200}
    nm = fallback_nm.get(origin_id, 5000)
    return {"distance_nm": nm, "sailing_days": round(nm / (13.5 * 24)), "chokepoints": [], "canal": None}


# ─── Dataset 6: Economic Indicators ──────────────────────────────────────────
def get_economic_indicators() -> dict:
    """Current macro snapshot (synthetic but realistic for Sep 2026)."""
    return {
        "usd_inr":           84.20,
        "wpi_index":         165.3,
        "iip_growth_pct":    4.8,
        "gdp_growth_pct":    6.9,
        "india_steel_output_mt_month": 12.4,
        "global_coal_demand_index":    108.2,
    }


# ─── Dataset 7: Seasonal Factors ─────────────────────────────────────────────
def get_seasonal_factor(target_month: int, target_year: int) -> dict:
    """
    Returns seasonal adjustment factors for a given month.
    Nov–Feb: post-monsoon peak demand (steel/power plants restocking).
    Jun–Sep: monsoon — port delays, reduced vessel availability.
    """
    monsoon     = target_month in [6, 7, 8, 9]
    peak_demand = target_month in [11, 12, 1, 2]
    holiday     = target_month in [10, 11]   # Diwali/Dussehra restocking

    # Freight rate seasonal multiplier
    if peak_demand:
        rate_mult = 1.12   # +12% post-monsoon restocking surge
    elif monsoon:
        rate_mult = 0.93   # -7% reduced demand but port congestion risk up
    else:
        rate_mult = 1.02

    # Port congestion seasonal score (0–100)
    if monsoon:
        congestion_score = int(_RNG.integers(55, 80))
    elif peak_demand:
        congestion_score = int(_RNG.integers(50, 75))
    else:
        congestion_score = int(_RNG.integers(20, 50))

    return {
        "month":             target_month,
        "year":              target_year,
        "monsoon":           monsoon,
        "peak_demand":       peak_demand,
        "holiday_factor":    holiday,
        "rate_multiplier":   rate_mult,
        "congestion_score":  congestion_score,
        "forecast_note": (
            "Post-monsoon demand surge — rates likely elevated. Lock in early."
            if peak_demand else
            "Monsoon season — port delays likely. Build in weather buffer."
            if monsoon else
            "Normal season — stable market conditions expected."
        ),
    }


# ─── Dataset 4: Port Congestion ───────────────────────────────────────────────
def get_port_congestion(port_id: str, month: int) -> dict:
    monsoon = month in [6, 7, 8, 9]
    if monsoon:
        idx  = int(_RNG.integers(55, 82))
        wait = round(float(_RNG.uniform(3.5, 7.0)), 1)
    else:
        idx  = int(_RNG.integers(18, 55))
        wait = round(float(_RNG.uniform(1.2, 4.0)), 1)

    port_name = PORTS.get(port_id, {}).get("name", port_id)
    return {
        "port_id":           port_id,
        "port_name":         port_name,
        "utilisation_pct":   idx,
        "avg_wait_days":     wait,
        "vessels_at_anchor": int(_RNG.integers(3, 18)),
        "congestion_level":  "HIGH" if idx > 65 else "MEDIUM" if idx > 40 else "LOW",
    }


# ─── Dataset 1+2: Market Rates ───────────────────────────────────────────────
# Base freight rates ($/MT) by origin — calibrated to real BCI/BPI averages
BASE_FREIGHT: dict = {
    "AU": {"INPRD": 11.2, "INVTZ": 10.8, "INGVP": 10.8, "INGPL": 11.5, "INDMA": 11.8, "INHAL": 13.2},
    "ID": {"INPRD":  7.1, "INVTZ":  6.8, "INGVP":  6.8, "INGPL":  7.3, "INDMA":  7.5, "INHAL":  8.4},
    "US": {"INPRD": 24.5, "INVTZ": 23.8, "INGVP": 23.8, "INGPL": 24.8, "INDMA": 25.2, "INHAL": 27.0},
    "MZ": {"INPRD": 13.5, "INVTZ": 13.0, "INGVP": 13.0, "INGPL": 13.8, "INDMA": 14.2, "INHAL": 15.5},
    "RU": {"INPRD": 16.8, "INVTZ": 16.2, "INGVP": 16.2, "INGPL": 17.0, "INDMA": 17.5, "INHAL": 19.0},
}

# Base FOB commodity prices ($/MT)
BASE_FOB: dict = {
    "thermal_coal": {"AU": 108, "ID": 95,  "US": 125, "MZ": 102, "RU": 92},
    "coking_coal":  {"AU": 220, "ID": 198, "US": 235, "MZ": 210, "RU": 190},
    "iron_ore":     {"AU": 105, "ID": 112, "US": 140, "MZ": 98,  "RU": 88},
    "limestone":    {"AU": 20,  "ID": 18,  "US": 28,  "MZ": 22,  "RU": 16},
    "bauxite":      {"AU": 45,  "ID": 42,  "US": 55,  "MZ": 40,  "RU": 38},
}

# Kcal per kg for energy commodities
KCAL: dict = {
    "thermal_coal": 5500,
    "coking_coal": 6800,
    "iron_ore": None,
    "limestone": None,
    "bauxite": None,
}
