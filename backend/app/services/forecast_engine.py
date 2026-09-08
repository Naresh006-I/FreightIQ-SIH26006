"""
FreightIQ Forecasting Engine — SIH26006
Pure numpy/pandas implementation (no scipy/sklearn dependency).

Architecture:
  GARCH(1,1)     — volatility clustering & confidence bands
  ExponentialSmoothing (Holt) — directional trend forecast
  Ensemble       — horizon-decay blend of both branches
  Monte Carlo    — 1000-path GBM for VaR
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from datetime import timedelta
from typing import List, Dict, Any

_RNG = np.random.default_rng(42)

# ─────────────────────────────────────────────────────────────────────────────
# GARCH(1,1) volatility engine
# ─────────────────────────────────────────────────────────────────────────────

class GARCHVolatility:
    def __init__(self):
        self.omega = 1.5e-6
        self.alpha = 0.10
        self.beta  = 0.88
        self._h    = 1e-4
        self._e    = 0.0

    def fit(self, log_returns: np.ndarray) -> "GARCHVolatility":
        lr_var     = float(np.var(log_returns))
        self.omega = max(lr_var * (1 - self.alpha - self.beta) * 0.8, 1e-9)
        self._h    = float(np.var(log_returns[-30:]))
        self._e    = float(log_returns[-1])
        return self

    def forecast_std(self, horizon: int) -> np.ndarray:
        stds = []
        h, e = self._h, self._e
        for _ in range(horizon):
            h = self.omega + self.alpha * e**2 + self.beta * h
            e = 0.0
            stds.append(np.sqrt(max(h, 1e-10)))
        return np.array(stds)

    @property
    def params(self) -> Dict[str, float]:
        return {"omega": round(self.omega, 9),
                "alpha": round(self.alpha, 4),
                "beta":  round(self.beta,  4)}


# ─────────────────────────────────────────────────────────────────────────────
# Holt's Double Exponential Smoothing — directional forecaster
# ─────────────────────────────────────────────────────────────────────────────

class HoltTrend:
    """Double exponential smoothing with trend (Holt's method)."""
    def __init__(self, alpha: float = 0.3, beta: float = 0.1):
        self.alpha = alpha
        self.beta  = beta
        self._l    = 0.0   # level
        self._b    = 0.0   # trend

    def fit(self, series: np.ndarray) -> "HoltTrend":
        l = series[0]
        b = series[1] - series[0]
        for v in series[1:]:
            l_prev, b_prev = l, b
            l = self.alpha * v + (1 - self.alpha) * (l_prev + b_prev)
            b = self.beta  * (l - l_prev) + (1 - self.beta) * b_prev
        self._l, self._b = l, b
        return self

    def forecast(self, horizon: int) -> np.ndarray:
        return np.array([self._l + (h + 1) * self._b for h in range(horizon)])


# ─────────────────────────────────────────────────────────────────────────────
# Feature importance proxy (rolling correlation with next-day price)
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_LABELS = [
    "Lag 1d", "Lag 3d", "Lag 7d", "Lag 14d", "Lag 30d",
    "MA-7", "MA-14", "MA-30",
    "Vol 7d", "Vol 30d",
    "Momentum 5d", "Momentum 20d",
    "Log Return", "Monsoon Flag",
]

def _feature_importances_proxy(series: pd.Series) -> List[Dict]:
    """Estimate feature importance via absolute correlation with next-day price."""
    s = series.copy()
    features = {
        "Lag 1d":       s.shift(1),
        "Lag 3d":       s.shift(3),
        "Lag 7d":       s.shift(7),
        "Lag 14d":      s.shift(14),
        "Lag 30d":      s.shift(30),
        "MA-7":         s.rolling(7).mean(),
        "MA-14":        s.rolling(14).mean(),
        "MA-30":        s.rolling(30).mean(),
        "Vol 7d":       s.pct_change().rolling(7).std(),
        "Vol 30d":      s.pct_change().rolling(30).std(),
        "Momentum 5d":  s / s.shift(5) - 1,
        "Momentum 20d": s / s.shift(20) - 1,
        "Log Return":   np.log(s / s.shift(1)),
        "Monsoon Flag": pd.Series(
            s.index.month.isin([6,7,8,9]).astype(float), index=s.index
        ),
    }
    target = s.shift(-1)
    imps = {}
    for name, feat in features.items():
        df = pd.DataFrame({"f": feat, "t": target}).dropna()
        if len(df) > 10:
            corr = abs(float(np.corrcoef(df["f"], df["t"])[0, 1]))
        else:
            corr = 0.0
        imps[name] = corr

    total = sum(imps.values()) or 1.0
    return sorted(
        [{"name": k, "importance": round(v / total, 5)} for k, v in imps.items()],
        key=lambda x: x["importance"], reverse=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entry score
# ─────────────────────────────────────────────────────────────────────────────

def _entry_score(current: float, avg10: float, stds: np.ndarray) -> int:
    trend  = (avg10 - current) / max(current, 1e-6)
    avgvol = float(np.mean(stds[:10]))
    if trend < -0.03 and avgvol < 0.015: return 1
    if trend < 0    and avgvol < 0.025:  return 2
    if abs(trend)   < 0.02:              return 3
    if trend > 0    and avgvol < 0.025:  return 4
    return 5


# ─────────────────────────────────────────────────────────────────────────────
# Ensemble forecaster
# ─────────────────────────────────────────────────────────────────────────────

class FreightForecaster:
    def __init__(self):
        self.garch = GARCHVolatility()
        self.holt  = HoltTrend(alpha=0.35, beta=0.12)
        self._trained = False

    def train(self, series: pd.Series) -> "FreightForecaster":
        vals = series.values.astype(float)
        lr   = np.log(vals[1:] / vals[:-1])
        self.garch.fit(lr)
        self.holt.fit(vals)
        self._series  = series.copy()
        self._trained = True
        return self

    def forecast(self, series: pd.Series, horizon: int = 30) -> Dict[str, Any]:
        if not self._trained:
            self.train(series)

        current    = float(series.iloc[-1])
        vals       = series.values.astype(float)
        lr         = np.log(vals[1:] / vals[:-1])
        self.garch.fit(lr)       # refit on latest data
        self.holt.fit(vals)

        garch_stds = self.garch.forecast_std(horizon)
        holt_preds = self.holt.forecast(horizon)
        last_date  = series.index[-1]

        points = []
        for h in range(1, horizon + 1):
            w_garch = max(0.15, 0.70 - 0.006 * h)
            w_holt  = 1 - w_garch
            blended = w_garch * current + w_holt * holt_preds[h - 1]
            # dampen extreme extrapolation
            blended = float(np.clip(blended, current * 0.6, current * 1.6))
            sigma   = garch_stds[h - 1] * current
            points.append({
                "day":      h,
                "date":     (last_date + timedelta(days=h)).strftime("%Y-%m-%d"),
                "forecast": round(blended, 3),
                "upper_95": round(blended + 1.96 * sigma, 3),
                "lower_95": round(max(0.1, blended - 1.96 * sigma), 3),
                "upper_80": round(blended + 1.28 * sigma, 3),
                "lower_80": round(max(0.1, blended - 1.28 * sigma), 3),
                "vol_cone": round(sigma, 3),
            })

        avg10 = float(np.mean([p["forecast"] for p in points[:10]]))
        score = _entry_score(current, avg10, garch_stds)
        contract = {
            "spot":        round(current, 2),
            "coa_3v":      round(current * 0.94, 2),
            "coa_6m":      round(current * 0.89, 2),
            "recommended": "coa_6m" if score <= 2 else ("coa_3v" if score == 3 else "spot"),
        }
        return {
            "current_rate":        current,
            "forecast_series":     points,
            "market_entry_score":  score,
            "contract_comparison": contract,
            "garch_params":        self.garch.params,
        }

    def feature_importances(self) -> List[Dict]:
        return _feature_importances_proxy(self._series)


# ─────────────────────────────────────────────────────────────────────────────
# Monte Carlo VaR
# ─────────────────────────────────────────────────────────────────────────────

def run_monte_carlo(
    current_rate: float,
    daily_vol: float,
    cargo_mt: float,
    horizon: int = 90,
    n_paths: int = 1000,
) -> Dict[str, Any]:
    dt     = 1 / 252
    paths  = np.zeros((n_paths, horizon))
    paths[:, 0] = current_rate
    for t in range(1, horizon):
        z = _RNG.standard_normal(n_paths)
        paths[:, t] = paths[:, t - 1] * np.exp(
            (-0.5 * daily_vol**2) * dt + daily_vol * np.sqrt(dt) * z
        )
    costs     = paths[:, -1] * cargo_mt
    var_95    = float(np.percentile(costs, 95))
    var_99    = float(np.percentile(costs, 99))
    idx50     = _RNG.choice(n_paths, 50, replace=False)
    return {
        "sample_paths":   paths[idx50].round(3).tolist(),
        "mean_path":      np.mean(paths, axis=0).round(3).tolist(),
        "pct5":           np.percentile(paths, 5,  axis=0).round(3).tolist(),
        "pct95":          np.percentile(paths, 95, axis=0).round(3).tolist(),
        "var_95":         round(var_95,  0),
        "var_99":         round(var_99,  0),
        "expected_cost":  round(float(np.mean(costs)),         0),
        "worst_case":     round(float(np.percentile(costs, 99.5)), 0),
    }
