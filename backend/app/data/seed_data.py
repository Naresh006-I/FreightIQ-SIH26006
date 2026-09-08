"""
Static reference data + synthetic time-series generator for FreightIQ.
All time-series use deterministic seeds so results are reproducible.
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from datetime import datetime

RNG = np.random.default_rng(42)

# ─────────────────────────────────────────────────────────────────────────────
# STATIC REFERENCE TABLES
# ─────────────────────────────────────────────────────────────────────────────

PORTS = [
    {"id": "INPRD", "name": "Paradip",        "lat": 20.317, "lon": 86.611, "max_draft_m": 17.0, "state": "Odisha",        "major_commodity": "Thermal Coal"},
    {"id": "INVTZ", "name": "Visakhapatnam",  "lat": 17.686, "lon": 83.282, "max_draft_m": 14.5, "state": "Andhra Pradesh","major_commodity": "Coking Coal"},
    {"id": "INGVP", "name": "Gangavaram",      "lat": 17.623, "lon": 83.226, "max_draft_m": 18.0, "state": "Andhra Pradesh","major_commodity": "Iron Ore"},
    {"id": "INGPL", "name": "Gopalpur",        "lat": 19.263, "lon": 84.893, "max_draft_m": 12.5, "state": "Odisha",        "major_commodity": "Limestone"},
    {"id": "INDMA", "name": "Dhamra",          "lat": 20.892, "lon": 86.879, "max_draft_m": 16.5, "state": "Odisha",        "major_commodity": "Coal"},
    {"id": "INSAG", "name": "Sagar-Sandheads", "lat": 21.652, "lon": 88.083, "max_draft_m": 16.0, "state": "West Bengal",   "major_commodity": "Lightering Anchorage"},
    {"id": "INHAL", "name": "Haldia",          "lat": 22.026, "lon": 88.069, "max_draft_m":  8.5, "state": "West Bengal",   "major_commodity": "Coal / POL"},
]

ORIGINS = [
    {"id": "AU", "name": "Australia",    "ports": ["Newcastle", "Hay Point"], "lat": -32.9, "lon": 151.8, "distance_nm": 4800},
    {"id": "ID", "name": "Indonesia",    "ports": ["Samarinda", "Taboneo"],   "lat":  -0.5, "lon": 117.1, "distance_nm": 2200},
    {"id": "US", "name": "United States","ports": ["Norfolk"],                "lat":  36.8, "lon": -76.3, "distance_nm": 11500},
    {"id": "MZ", "name": "Mozambique",   "ports": ["Maputo", "Nacala"],       "lat": -25.9, "lon":  32.6, "distance_nm": 5600},
    {"id": "RU", "name": "Russia",       "ports": ["Taman", "Ust-Luga"],      "lat":  45.2, "lon":  36.7, "distance_nm": 7200},
]

VESSEL_TYPES = [
    {"type": "Handymax",  "typical_dwt": 50000,  "daily_hire_usd": 14500, "fuel_tpd": 28, "speed_kn": 13.0, "draft_m": 11.5, "loa_m": 190},
    {"type": "Supramax",  "typical_dwt": 62000,  "daily_hire_usd": 16000, "fuel_tpd": 32, "speed_kn": 13.5, "draft_m": 12.5, "loa_m": 200},
    {"type": "Ultramax",  "typical_dwt": 63500,  "daily_hire_usd": 17000, "fuel_tpd": 33, "speed_kn": 14.0, "draft_m": 12.8, "loa_m": 210},
    {"type": "Panamax",   "typical_dwt": 77000,  "daily_hire_usd": 18500, "fuel_tpd": 38, "speed_kn": 13.5, "draft_m": 13.5, "loa_m": 225},
    {"type": "Kamsarmax", "typical_dwt": 82000,  "daily_hire_usd": 19500, "fuel_tpd": 40, "speed_kn": 14.0, "draft_m": 13.8, "loa_m": 229},
    {"type": "Capesize",  "typical_dwt": 180000, "daily_hire_usd": 28000, "fuel_tpd": 55, "speed_kn": 13.5, "draft_m": 18.2, "loa_m": 300},
]

COMMODITIES = [
    {"id": "thermal_coal", "name": "Thermal Coal", "kcal_per_kg": 5500},
    {"id": "coking_coal",  "name": "Coking Coal",  "kcal_per_kg": 6800},
    {"id": "iron_ore",     "name": "Iron Ore",      "kcal_per_kg": None},
    {"id": "limestone",    "name": "Limestone",     "kcal_per_kg": None},
    {"id": "bauxite",      "name": "Bauxite",       "kcal_per_kg": None},
]

# ─────────────────────────────────────────────────────────────────────────────
# SYNTHETIC TIME-SERIES GENERATORS
# ─────────────────────────────────────────────────────────────────────────────

def generate_bdi_history(days: int = 730) -> pd.DataFrame:
    """Two years of synthetic Baltic Dry Index with GARCH-like volatility."""
    dates = pd.date_range(end=datetime.today(), periods=days, freq="B")
    bdi = [1800.0]
    vol = 40.0
    for _ in range(days - 1):
        shock = RNG.standard_normal()
        vol = float(np.clip(vol * 0.95 + 5 * abs(shock), 20, 130))
        delta = RNG.normal(0, vol) + 0.03 * (1800 - bdi[-1])
        bdi.append(round(max(600, bdi[-1] + delta), 1))

    df = pd.DataFrame({"date": dates, "bdi": bdi})
    df["ma7"]  = df["bdi"].rolling(7).mean().round(1)
    df["ma30"] = df["bdi"].rolling(30).mean().round(1)
    df["vol14"]= df["bdi"].pct_change().rolling(14).std().mul(100).round(3)
    return df


def generate_freight_rates(bdi_df: pd.DataFrame) -> pd.DataFrame:
    """Route-level freight rates ($/MT) correlated with BDI."""
    routes = {
        "AU_INPRD": {"base": 9.5,  "sens": 0.0040},
        "ID_INVTZ": {"base": 6.2,  "sens": 0.0025},
        "US_INHAL": {"base": 22.0, "sens": 0.0055},
        "MZ_INGVP": {"base": 11.8, "sens": 0.0042},
        "RU_INDMA": {"base": 14.5, "sens": 0.0048},
    }
    df = bdi_df[["date"]].copy()
    for route, p in routes.items():
        noise = RNG.normal(0, 0.3, len(df))
        df[route] = (p["base"] + p["sens"] * bdi_df["bdi"] + noise).round(2)
    return df


def generate_bunker_prices(days: int = 730) -> pd.DataFrame:
    """Synthetic VLSFO and MGO bunker prices ($/MT)."""
    dates = pd.date_range(end=datetime.today(), periods=days, freq="B")
    vlsfo, mgo = [580.0], [650.0]
    for _ in range(days - 1):
        vlsfo.append(round(max(350, vlsfo[-1] + RNG.normal(0, 8) + 0.02*(580-vlsfo[-1])), 1))
        mgo.append(round(max(420,   mgo[-1]   + RNG.normal(0, 9) + 0.02*(650-mgo[-1])),   1))
    return pd.DataFrame({"date": dates, "vlsfo": vlsfo, "mgo": mgo})


def generate_commodity_prices(days: int = 730) -> pd.DataFrame:
    """Synthetic FOB commodity prices ($/MT)."""
    dates = pd.date_range(end=datetime.today(), periods=days, freq="B")
    specs = {
        "thermal_coal": (110.0, 3.5),
        "coking_coal":  (220.0, 7.0),
        "iron_ore":     (105.0, 4.0),
        "limestone":    ( 18.0, 0.6),
        "bauxite":      ( 45.0, 1.5),
    }
    df = pd.DataFrame({"date": dates})
    for name, (base, sig) in specs.items():
        p = [base]
        for _ in range(days - 1):
            p.append(round(max(base*0.4, p[-1] + RNG.normal(0, sig) + 0.02*(base-p[-1])), 2))
        df[name] = p
    return df
