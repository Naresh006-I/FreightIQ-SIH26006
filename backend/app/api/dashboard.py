"""
Dashboard API — KPIs, BDI chart series, market signal, bunker snapshot.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from fastapi import APIRouter
from app.data.seed_data import (
    generate_bdi_history, generate_bunker_prices, generate_freight_rates,
)
from app.services.forecast_engine import FreightForecaster

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# ── in-process cache (generated once) ────────────────────────────────────────
_cache: dict = {}


def _load():
    if _cache:
        return _cache
    bdi_df    = generate_bdi_history(730)
    bunker_df = generate_bunker_prices(730)
    fr_df     = generate_freight_rates(bdi_df)
    series    = fr_df.set_index(pd.to_datetime(fr_df["date"]))["AU_INPRD"]
    fc        = FreightForecaster()
    fc.train(series)
    _cache.update(bdi=bdi_df, bunker=bunker_df, fr=fr_df, fc=fc, series=series)
    return _cache


SIGNAL_MAP = {
    1: ("OPTIMAL BUY",  "green",  "Rates trending down & volatility low — fix now."),
    2: ("BUY",          "green",  "Rates softening — good entry window opening."),
    3: ("HOLD",         "yellow", "Neutral — wait for clearer directional signal."),
    4: ("CAUTION",      "orange", "Rates rising — consider short CoA to cap exposure."),
    5: ("AVOID SPOT",   "red",    "Spike risk — lock in forward contracts immediately."),
}


@router.get("")
def get_dashboard():
    d = _load()

    bdi    = d["bdi"]
    bunker = d["bunker"]
    fr     = d["fr"]

    latest_bdi   = float(bdi["bdi"].iloc[-1])
    bdi_chg      = round((bdi["bdi"].iloc[-1] - bdi["bdi"].iloc[-2]) / bdi["bdi"].iloc[-2] * 100, 2)
    latest_vlsfo = float(bunker["vlsfo"].iloc[-1])
    vlsfo_chg    = round((bunker["vlsfo"].iloc[-1] - bunker["vlsfo"].iloc[-2]) / bunker["vlsfo"].iloc[-2] * 100, 2)
    latest_rate  = float(fr["AU_INPRD"].iloc[-1])
    rate_chg     = round((fr["AU_INPRD"].iloc[-1] - fr["AU_INPRD"].iloc[-2]) / fr["AU_INPRD"].iloc[-2] * 100, 2)

    fc_result = d["fc"].forecast(d["series"], horizon=10)
    score     = fc_result["market_entry_score"]
    signal, color, rationale = SIGNAL_MAP[score]

    # BDI chart — last 90 business days
    tail = bdi.tail(90)
    bdi_series = [
        {
            "date": row["date"].strftime("%Y-%m-%d"),
            "bdi":  row["bdi"],
            "ma7":  None if np.isnan(row["ma7"])  else row["ma7"],
            "ma30": None if np.isnan(row["ma30"]) else row["ma30"],
        }
        for _, row in tail.iterrows()
    ]

    # Freight snapshot across all routes
    route_snapshot = {
        col: round(float(fr[col].iloc[-1]), 2)
        for col in fr.columns if col != "date"
    }

    kpis = [
        {"label": "Baltic Dry Index",       "value": f"{latest_bdi:,.0f}",   "change": f"{bdi_chg:+.2f}%",  "trend": "up" if bdi_chg > 0 else "down",   "color": "blue"},
        {"label": "Freight Rate AU→PRD",    "value": f"${latest_rate:.2f}/MT","change": f"{rate_chg:+.2f}%", "trend": "up" if rate_chg > 0 else "down",  "color": "red" if rate_chg > 0 else "green"},
        {"label": "VLSFO Bunker Singapore", "value": f"${latest_vlsfo:.0f}/MT","change": f"{vlsfo_chg:+.2f}%","trend":"up" if vlsfo_chg > 0 else "down", "color": "red" if vlsfo_chg > 0 else "green"},
        {"label": "Market Entry Score",     "value": f"{score} / 5",          "change": signal,              "trend": "neutral",                         "color": color},
    ]

    return {
        "kpis":            kpis,
        "bdi_series":      bdi_series,
        "route_snapshot":  route_snapshot,
        "market_signal":   signal,
        "signal_score":    score,
        "signal_color":    color,
        "signal_rationale": rationale,
    }
