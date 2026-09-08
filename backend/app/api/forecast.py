"""
Forecast API — rate forecast, contract comparison, feature importance, Monte Carlo.
"""
from __future__ import annotations
import pandas as pd
from fastapi import APIRouter, Query
from app.data.seed_data import generate_bdi_history, generate_freight_rates
from app.services.forecast_engine import FreightForecaster, run_monte_carlo

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])

ROUTES = {
    "AU_INPRD": "Australia → Paradip",
    "ID_INVTZ": "Indonesia → Visakhapatnam",
    "US_INHAL": "USA → Haldia",
    "MZ_INGVP": "Mozambique → Gangavaram",
    "RU_INDMA": "Russia → Dhamra",
}

_fc_cache: dict = {}


def _series(route: str) -> pd.Series:
    bdi = generate_bdi_history(730)
    fr  = generate_freight_rates(bdi)
    col = route if route in fr.columns else "AU_INPRD"
    return fr.set_index(pd.to_datetime(fr["date"]))[col]


def _trained(route: str) -> FreightForecaster:
    if route not in _fc_cache:
        fc = FreightForecaster()
        fc.train(_series(route))
        _fc_cache[route] = fc
    return _fc_cache[route]


@router.get("/routes")
def list_routes():
    return [{"id": k, "label": v} for k, v in ROUTES.items()]


@router.get("")
def get_forecast(
    route:   str = Query(default="AU_INPRD"),
    horizon: int = Query(default=30, ge=1, le=90),
):
    fc     = _trained(route)
    series = _series(route)
    result = fc.forecast(series, horizon=horizon)
    return {
        "route":               route,
        "route_label":         ROUTES.get(route, route),
        "horizon_days":        horizon,
        **result,
    }


@router.get("/importance")
def feature_importance(route: str = Query(default="AU_INPRD")):
    return {"features": _trained(route).feature_importances()}


@router.get("/monte-carlo")
def monte_carlo(
    route:    str   = Query(default="AU_INPRD"),
    cargo_mt: float = Query(default=100_000, ge=10_000, le=500_000),
    horizon:  int   = Query(default=90, ge=10, le=90),
    n_paths:  int   = Query(default=1000, ge=100, le=5000),
):
    series    = _series(route)
    current   = float(series.iloc[-1])
    daily_vol = float(series.pct_change().std())
    return run_monte_carlo(current, daily_vol, cargo_mt, horizon, n_paths)


@router.get("/history")
def rate_history(route: str = Query(default="AU_INPRD"), days: int = Query(default=180)):
    bdi = generate_bdi_history(max(days + 50, 730))
    fr  = generate_freight_rates(bdi)
    col = route if route in fr.columns else "AU_INPRD"
    tail = fr.tail(days)
    return [
        {"date": row["date"].strftime("%Y-%m-%d"), "rate": round(row[col], 2)}
        for _, row in tail.iterrows()
    ]
