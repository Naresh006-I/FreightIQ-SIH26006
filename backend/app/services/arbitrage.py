"""
Origin Arbitrage Engine — SIH26006
Computes delivered landed cost ($/MT) and energy cost ($/GJ) from each origin.
"""

from __future__ import annotations
from typing import List, Dict, Any

# ── Base FOB prices ($/MT) — updated from synthetic market ───────────────────
FOB: Dict[str, Dict[str, float]] = {
    "thermal_coal": {"AU": 108, "ID": 95,  "US": 125, "MZ": 102, "RU": 92},
    "coking_coal":  {"AU": 220, "ID": 198, "US": 235, "MZ": 210, "RU": 190},
    "iron_ore":     {"AU": 105, "ID": 112, "US": 140, "MZ": 98,  "RU": 88},
    "limestone":    {"AU": 20,  "ID": 18,  "US": 28,  "MZ": 22,  "RU": 16},
    "bauxite":      {"AU": 45,  "ID": 42,  "US": 55,  "MZ": 40,  "RU": 38},
}

FREIGHT: Dict[str, float] = {
    "AU": 9.5, "ID": 6.2, "US": 22.0, "MZ": 11.8, "RU": 14.5,
}

ORIGIN_NAMES = {
    "AU": "Australia", "ID": "Indonesia",
    "US": "United States", "MZ": "Mozambique", "RU": "Russia",
}

KCAL: Dict[str, float | None] = {
    "thermal_coal": 5500, "coking_coal": 6800,
    "iron_ore": None, "limestone": None, "bauxite": None,
}

BACKHAUL_OPTIONS = [
    {
        "port": "INPRD", "port_name": "Paradip",
        "cargo": "Iron Ore Pellets", "volume_mt": 80000,
        "destination": "China / Japan",
        "saving_usd": 180000,
        "detail": "Avoid empty ballast leg loading iron ore for East Asia.",
    },
    {
        "port": "INVTZ", "port_name": "Visakhapatnam",
        "cargo": "Alumina", "volume_mt": 60000,
        "destination": "Bahrain / UAE",
        "saving_usd": 140000,
        "detail": "Alumina export to Gulf smelters eliminates ballast back to Middle East.",
    },
    {
        "port": "INGPL", "port_name": "Gopalpur",
        "cargo": "Mineral Sands", "volume_mt": 45000,
        "destination": "Australia / SE Asia",
        "saving_usd": 95000,
        "detail": "Mineral sand exports on return leg to Australia / SE Asia.",
    },
]


def compute_arbitrage(commodity: str, destination_port: str, volume_mt: float) -> Dict[str, Any]:
    fob_map  = FOB.get(commodity, {})
    kcal     = KCAL.get(commodity)
    results: List[Dict] = []

    for origin_id, fob in fob_map.items():
        freight   = FREIGHT.get(origin_id, 12.0)
        insurance = fob * 0.005
        port_chg  = 1.8
        landed    = fob + freight + insurance + port_chg
        energy    = round(landed / (kcal * 4.184e-3), 4) if kcal else None

        results.append({
            "origin_id":             origin_id,
            "origin_name":           ORIGIN_NAMES[origin_id],
            "fob_usd":               round(fob,      2),
            "freight_usd":           round(freight,  2),
            "insurance_usd":         round(insurance,2),
            "port_charges_usd":      round(port_chg, 2),
            "landed_cost_usd":       round(landed,   2),
            "energy_cost_per_gj":    energy,
            "total_volume_cost_usd": round(landed * volume_mt, 0),
        })

    results.sort(key=lambda r: r["landed_cost_usd"])
    for i, r in enumerate(results):
        r["rank"] = i + 1

    best    = results[0]
    worst   = results[-1]
    saving  = round((worst["landed_cost_usd"] - best["landed_cost_usd"]) * volume_mt, 0)

    return {
        "commodity":         commodity,
        "destination_port":  destination_port,
        "volume_mt":         volume_mt,
        "results":           results,
        "best_origin":       best["origin_name"],
        "best_landed_cost":  best["landed_cost_usd"],
        "saving_vs_worst":   saving,
    }
