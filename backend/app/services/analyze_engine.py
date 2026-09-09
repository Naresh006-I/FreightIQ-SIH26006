"""
FreightIQ Master Analyze Engine — SIH26006

Single function that takes one user form submission and returns
all 6 MVP outputs:
  1. Freight Forecast     — expected rate $/MT for the period
  2. Market Signal        — BUY NOW / WAIT / CAUTION
  3. Vessel Recommendation— best vessel type with justification
  4. Port Compatibility   — compatible / incompatible + details
  5. Contract Recommendation — spot / multi-voyage CoA / 6-month CoA
  6. Risk Assessment      — LOW / MEDIUM / HIGH + factors
  + Savings Opportunity   — estimated ₹ saving vs reactive spot
"""

from __future__ import annotations
import numpy as np
from datetime import date
from typing import Any

# Use a fresh RNG per-call for port congestion (avoid identical values)
import random as _random

from app.data.datasets import (
    PORTS, VESSELS, BASE_FREIGHT, BASE_FOB, KCAL,
    get_route, get_economic_indicators, get_seasonal_factor, get_port_congestion,
)

_RNG = np.random.default_rng(77)

# ── Constants ─────────────────────────────────────────────────────────────────
VLSFO_USD    = 580.0    # $/MT bunker (Singapore VLSFO)
CO2_FACTOR   = 3.17     # MT CO₂ per MT HFO
CARBON_LEVY  = 30.0     # $/MT CO₂  (IMO CII 2026 carbon cost proxy)
FILL         = 0.98     # vessel fill factor (bulk coal 97-99%)
PORT_DAYS    = 4        # avg port stay days (load + discharge)
USD_TO_INR   = 94.35    # 1 USD = Rs.94.35  (current RBI rate)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Freight Forecast
# ─────────────────────────────────────────────────────────────────────────────

def _forecast_freight(
    origin_id: str, port_id: str, commodity: str,
    target_month: int, target_year: int,
) -> dict:
    base = BASE_FREIGHT.get(origin_id, {}).get(port_id, 12.0)
    seasonal = get_seasonal_factor(target_month, target_year)
    econ     = get_economic_indicators()

    # BDI momentum proxy: steel IIP * coal demand index
    market_mult = 1.0 + (econ["global_coal_demand_index"] - 100) * 0.003

    rate = base * seasonal["rate_multiplier"] * market_mult
    rate = round(rate + float(_RNG.normal(0, 0.3)), 2)  # small noise

    # 90-day forward band via simplified GARCH vol (~2.5% daily)
    vol_30d  = rate * 0.025 * (30 ** 0.5)
    upper_95 = round(rate + 1.96 * vol_30d, 2)
    lower_95 = round(max(0.1, rate - 1.96 * vol_30d), 2)

    # Seasonal-forward adjustment (months until target)
    from datetime import date
    today      = date.today()
    months_out = (target_year - today.year) * 12 + (target_month - today.month)
    months_out = max(0, months_out)

    # Holt trend: slight mean reversion over time
    trend_adj  = rate * (1 - 0.01 * months_out)   # -1% per month mean reversion
    fwd_rate   = round(max(base * 0.7, trend_adj), 2)

    return {
        "current_spot_rate":  rate,
        "forecast_rate":      fwd_rate,
        "upper_95":           upper_95,
        "lower_95":           lower_95,
        "seasonal_multiplier": seasonal["rate_multiplier"],
        "seasonal_note":      seasonal["forecast_note"],
        "months_to_delivery": months_out,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Market Entry Signal
# ─────────────────────────────────────────────────────────────────────────────

def _market_signal(forecast: dict, seasonal: dict) -> dict:
    spot    = forecast["current_spot_rate"]
    fwd     = forecast["forecast_rate"]
    trend   = (fwd - spot) / spot
    vol_pct = (forecast["upper_95"] - forecast["lower_95"]) / (2 * spot * 1.96)

    if trend < -0.04 and vol_pct < 0.04:
        signal, confidence, action = "BUY NOW", 92, "Lock in multi-voyage CoA immediately"
    elif trend < -0.01:
        signal, confidence, action = "BUY NOW", 78, "Rates trending down — good entry window"
    elif abs(trend) <= 0.01 and vol_pct < 0.05:
        signal, confidence, action = "BUY NOW", 65, "Stable market — proceed with procurement"
    elif trend > 0.03 and vol_pct > 0.05:
        signal, confidence, action = "WAIT",    60, "Rates rising with high volatility — defer 2–3 weeks"
    else:
        signal, confidence, action = "CAUTION", 55, "Mixed signals — fix 50% now, hedge remainder"

    # November override: post-monsoon peak always advises early fixing
    if seasonal["peak_demand"]:
        signal, confidence = "BUY NOW", max(confidence, 80)
        action = "Post-monsoon peak demand — fix now before rate spike"

    color = {"BUY NOW": "green", "WAIT": "red", "CAUTION": "yellow"}[signal]
    return {
        "signal":     signal,
        "color":      color,
        "confidence": confidence,
        "action":     action,
        "trend_pct":  round(trend * 100, 2),
        "vol_pct":    round(vol_pct * 100, 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Vessel Recommendation
# ─────────────────────────────────────────────────────────────────────────────

def _recommend_vessel(
    port_id: str, cargo_mt: float, origin_id: str,
) -> dict:
    port     = PORTS.get(port_id, {})
    max_draft = port.get("max_draft_m", 14.0)
    route    = get_route(origin_id, port_id)
    dist_nm  = route["distance_nm"]

    # Filter eligible vessels by port draft
    eligible = [v for v in VESSELS if v["draft_m"] <= max_draft]
    if not eligible:
        eligible = VESSELS   # fallback — will flag lightering

    # Score each vessel: lowest total cost per tonne + penalty for extra voyages
    # (fewer voyages = simpler logistics = preferred for bulk procurement)
    def score(v):
        days   = dist_nm / (v["speed_kn"] * 24) + PORT_DAYS
        fuel   = days * v["fuel_tpd"]
        cost_per_voyage = days * v["hire_usd_day"] + fuel * VLSFO_USD + fuel * CO2_FACTOR * CARBON_LEVY
        # Coal stowage factor ~1.1 MT/m³ — effective carrying capacity = DWT × FILL
        parcel = min(v["dwt"] * FILL, cargo_mt)
        n_voy  = int(np.ceil(cargo_mt / parcel))
        cpt    = cost_per_voyage * n_voy / cargo_mt
        # Penalty per extra voyage (scheduling, laycan risk, chartering cost)
        voyage_penalty = (n_voy - 1) * 1.50   # $1.50/MT per extra voyage
        return cpt + voyage_penalty

    best = min(eligible, key=score)
    # If Kamsarmax or Capesize wins but cargo is <= 80k MT, prefer Panamax as industry standard
    if best["type"] in ("Kamsarmax", "Capesize") and cargo_mt <= 80_000:
        panamax = next((v for v in eligible if v["type"] == "Panamax"), None)
        if panamax:
            p_parcel = min(panamax["dwt"] * FILL, cargo_mt)
            p_n_voy  = int(np.ceil(cargo_mt / p_parcel))
            if p_n_voy == 1:
                best = panamax
    parcel  = best["dwt"] * FILL
    n_voy   = int(np.ceil(cargo_mt / parcel))
    days    = dist_nm / (best["speed_kn"] * 24) + PORT_DAYS
    fuel    = days * best["fuel_tpd"]
    v_cost  = days * best["hire_usd_day"] + fuel * VLSFO_USD + fuel * CO2_FACTOR * CARBON_LEVY
    total   = round(v_cost * n_voy, 0)
    cpt     = round(total / cargo_mt, 2)

    # CII grade — IMO formula uses laden voyage distance only
    sea_fuel  = (dist_nm / (best["speed_kn"] * 24)) * best["fuel_tpd"]
    cii_ref   = {"Handymax": 5.5, "Supramax": 5.3, "Ultramax": 5.2,
                 "Panamax": 5.0, "Kamsarmax": 4.8, "Capesize": 4.0}
    ref       = cii_ref.get(best["type"], 5.0)
    cii_val   = (sea_fuel * CO2_FACTOR * 1e6) / (best["dwt"] * dist_nm)
    cii_grade = "A" if cii_val <= ref*0.70 else \
                "B" if cii_val <= ref*0.82 else \
                "C" if cii_val <= ref else \
                "D" if cii_val <= ref*1.18 else "E"

    # Reasoning
    reason = (
        f"Best cost-efficiency for {cargo_mt/1000:.0f}k MT over {dist_nm:,} NM. "
        f"Requires {n_voy} voyage(s), each carrying {parcel/1000:.0f}k MT."
    )
    if n_voy > 1:
        reason += f" Multi-voyage schedule recommended."

    return {
        "vessel_type":    best["type"],
        "dwt":            best["dwt"],
        "voyages_needed": n_voy,
        "sea_days":       round(days - PORT_DAYS, 1),
        "total_days":     round(days, 1),
        "cost_per_tonne": cpt,
        "total_voyage_cost_usd": int(total),
        "cii_grade":      cii_grade,
        "fuel_consumption_mt": round(fuel, 1),
        "reason":         reason,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Port Compatibility
# ─────────────────────────────────────────────────────────────────────────────

def _port_compatibility(
    port_id: str, vessel_type: str, commodity: str, target_month: int
) -> dict:
    port   = PORTS.get(port_id, {})
    vessel = next((v for v in VESSELS if v["type"] == vessel_type), VESSELS[3])

    compatible   = vessel["draft_m"] <= port.get("max_draft_m", 14.0)
    loa_ok       = vessel["loa_m"]   <= port.get("loa_max_m",  280)
    beam_ok      = vessel["beam_m"]  <= port.get("beam_max_m",  45)
    comm_ok      = commodity in port.get("commodities", [])
    lightering   = port.get("lightering_required", False) and not compatible
    congestion   = get_port_congestion(port_id, target_month)

    issues = []
    if not compatible:
        issues.append(f"Draft {vessel['draft_m']}m exceeds port limit {port.get('max_draft_m')}m")
    if not loa_ok:
        issues.append(f"LOA {vessel['loa_m']}m exceeds port limit {port.get('loa_max_m')}m")
    if not comm_ok:
        issues.append(f"{commodity} not listed as primary commodity at this port")
    if lightering:
        issues.append("Lightering required at Sagar-Sandheads anchorage (+$55,000/voyage)")

    overall_ok = compatible and loa_ok
    return {
        "port_name":          port.get("name", port_id),
        "compatible":         overall_ok,
        "status":             "COMPATIBLE" if overall_ok else "INCOMPATIBLE — LIGHTERING REQUIRED" if lightering else "INCOMPATIBLE",
        "status_color":       "green" if overall_ok else "yellow" if lightering else "red",
        "draft_ok":           compatible,
        "loa_ok":             loa_ok,
        "beam_ok":            beam_ok,
        "commodity_handled":  comm_ok,
        "lightering_needed":  lightering,
        "max_draft_m":        port.get("max_draft_m"),
        "vessel_draft_m":     vessel["draft_m"],
        "berths_available":   port.get("berths", 0),
        "congestion":         congestion,
        "issues":             issues,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Contract Recommendation
# ─────────────────────────────────────────────────────────────────────────────

def _contract_recommendation(
    cargo_mt: float, contract_months: int, forecast: dict,
    signal: dict, vessel: dict
) -> dict:
    spot_rate  = forecast["current_spot_rate"]
    fwd_rate   = forecast["forecast_rate"]
    n_voy      = vessel["voyages_needed"]

    # Discount structure
    coa_3v_rate = spot_rate * 0.94   # 6% discount for 3-voyage CoA
    coa_6m_rate = spot_rate * 0.89   # 11% discount for 6-month CoA

    spot_total  = round(spot_rate   * cargo_mt * contract_months, 0)
    coa_3v_cost = round(coa_3v_rate * cargo_mt * contract_months, 0)
    coa_6m_cost = round(coa_6m_rate * cargo_mt * contract_months, 0)

    # Decide based on signal, forecast trend, and contract duration
    if signal["signal"] == "BUY NOW" and contract_months >= 6:
        rec_type   = "6-Month CoA"
        rec_rate   = coa_6m_rate
        rec_cost   = coa_6m_cost
        rec_saving = spot_total - coa_6m_cost
        rationale  = "Forward rates likely to rise — lock in 6-month CoA for maximum savings."
    elif contract_months >= 3 or n_voy >= 2:
        rec_type   = "Multi-Voyage CoA (3–4 voyages)"
        rec_rate   = coa_3v_rate
        rec_cost   = coa_3v_cost
        rec_saving = spot_total - coa_3v_cost
        rationale  = "Volume warrants multi-voyage contract. 6% discount vs spot."
    else:
        rec_type   = "Spot Fixture"
        rec_rate   = spot_rate
        rec_cost   = spot_total
        rec_saving = 0
        rationale  = "Single-voyage, short duration — spot market is most flexible."

    return {
        "recommended_type":    rec_type,
        "recommended_rate":    round(rec_rate, 2),
        "recommended_cost_usd": int(rec_cost),
        "saving_vs_spot_usd":  int(max(0, rec_saving)),
        "rationale":           rationale,
        "options": [
            {"type": "Spot Fixture",          "rate": spot_rate,  "discount_pct": 0,   "total_usd": int(spot_total)},
            {"type": "Multi-Voyage CoA (3v)", "rate": round(coa_3v_rate,2), "discount_pct": 6,   "total_usd": int(coa_3v_cost)},
            {"type": "6-Month CoA",           "rate": round(coa_6m_rate,2), "discount_pct": 11,  "total_usd": int(coa_6m_cost)},
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Risk Assessment
# ─────────────────────────────────────────────────────────────────────────────

def _risk_assessment(
    origin_id: str, port_id: str, target_month: int,
    vessel: dict, signal: dict, route: dict,
) -> dict:
    seasonal    = get_seasonal_factor(target_month, 2026)
    congestion  = get_port_congestion(port_id, target_month)

    # Score each risk factor 0–100
    market_risk     = 30 + max(0, signal["trend_pct"] * 5)
    seasonal_risk   = 65 if seasonal["monsoon"] else 15 if seasonal["peak_demand"] else 20
    congestion_risk = congestion["utilisation_pct"]
    geopolitical    = 40 if route.get("canal") == "Suez" else 20 if route.get("chokepoints") else 10
    bunker_risk     = 35   # VLSFO price risk is always moderate

    # Weighted composite
    overall = round(
        market_risk   * 0.30 +
        seasonal_risk * 0.25 +
        congestion_risk * 0.20 +
        geopolitical  * 0.15 +
        bunker_risk   * 0.10
    )

    level = "LOW" if overall < 33 else "MEDIUM" if overall < 60 else "HIGH"
    color = {"LOW": "green", "MEDIUM": "yellow", "HIGH": "red"}[level]

    factors = []
    if seasonal["monsoon"]:
        factors.append("Monsoon season — port delays and wave height risk active")
    if seasonal["peak_demand"]:
        factors.append("Post-monsoon demand peak — vessel availability may tighten")
    if congestion_risk > 55:
        factors.append(f"Port congestion HIGH at {congestion['port_name']} (wait: {congestion['avg_wait_days']} days)")
    if route.get("canal") == "Suez":
        factors.append("Suez Canal routing — geopolitical delay risk")
    if market_risk > 50:
        factors.append("Freight rate upward trend — locking forward rate advised")
    if not factors:
        factors.append("No major risk flags — market conditions stable")

    # VaR proxy (parametric, 95%)
    var_95_usd = round(signal["vol_pct"] / 100 * vessel["cost_per_tonne"] * 80_000 * 1.96, 0)

    return {
        "overall_score":  overall,
        "level":          level,
        "color":          color,
        "factors":        factors,
        "breakdown": {
            "market_risk":    round(market_risk),
            "seasonal_risk":  round(seasonal_risk),
            "congestion_risk": congestion_risk,
            "geopolitical":   geopolitical,
            "bunker_risk":    bunker_risk,
        },
        "var_95_usd":  int(var_95_usd),
        "mitigation":  (
            "Activate virtual arrival slow-steaming and fix freight via 6M CoA."
            if level == "HIGH" else
            "Fix 60–70% cargo via multi-voyage CoA; leave remainder as spot hedge."
            if level == "MEDIUM" else
            "Proceed with standard procurement. Monitor BDI weekly."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SAVINGS CALCULATOR
# ─────────────────────────────────────────────────────────────────────────────

def _savings_opportunity(
    cargo_mt: float, contract: dict, vessel: dict, econ: dict,
) -> dict:
    """
    Savings vs reactive spot procurement.
    Two components:
      1. Contract saving  = spot_total - recommended_contract_total  (USD)
      2. Vessel optimisation saving = ~4% of vessel voyage cost only  (USD)
    Both converted to INR at live USD/INR rate.
    """
    usd_inr      = econ["usd_inr"]                          # e.g. 94.35
    contract_usd = contract["saving_vs_spot_usd"]           # already in USD

    # Vessel optimisation: 4% of the pure voyage cost (NOT total freight)
    voyage_cost_usd   = vessel["total_voyage_cost_usd"]     # hire+fuel+carbon USD
    opt_saving_usd    = round(voyage_cost_usd * 0.04, 0)    # 4% of voyage cost

    total_usd    = contract_usd + opt_saving_usd
    total_inr    = round(total_usd * usd_inr, 0)

    per_tonne_usd = round(total_usd / max(cargo_mt, 1), 2)
    per_tonne_inr = round(total_inr / max(cargo_mt, 1), 2)

    return {
        "total_saving_usd":      int(total_usd),
        "total_saving_inr":      int(total_inr),
        "per_tonne_usd":         per_tonne_usd,
        "per_tonne_inr":         per_tonne_inr,
        "contract_saving_usd":   int(contract_usd),
        "vessel_opt_saving_usd": int(opt_saving_usd),
        "usd_inr_rate":          usd_inr,
        "breakdown_note": (
            f"₹{total_inr/1_00_000:.1f} Lakhs total saving "
            f"(@ ₹{usd_inr}/USD): "
            f"₹{contract_usd*usd_inr/1_00_000:.1f}L from contract optimisation + "
            f"₹{opt_saving_usd*usd_inr/1_00_000:.1f}L from vessel selection efficiency."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# MASTER ANALYZE FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def analyze(
    commodity:        str,
    quantity_mt:      float,
    origin_id:        str,
    port_id:          str,
    target_month:     int,
    target_year:      int,
    contract_months:  int,
) -> dict[str, Any]:
    """
    Run the full 6-step analysis from a single form submission.
    Returns all MVP outputs in one dict.
    """
    # Validate
    commodity    = commodity.lower().replace(" ", "_")
    origin_id    = origin_id.upper()
    port_id      = port_id.upper()

    route    = get_route(origin_id, port_id)
    seasonal = get_seasonal_factor(target_month, target_year)
    econ     = get_economic_indicators()

    # Run all 6 engines
    forecast = _forecast_freight(origin_id, port_id, commodity, target_month, target_year)
    signal   = _market_signal(forecast, seasonal)
    vessel   = _recommend_vessel(port_id, quantity_mt, origin_id)
    port_compat = _port_compatibility(port_id, vessel["vessel_type"], commodity, target_month)
    contract = _contract_recommendation(quantity_mt, contract_months, forecast, signal, vessel)
    risk     = _risk_assessment(origin_id, port_id, target_month, vessel, signal, route)
    savings  = _savings_opportunity(quantity_mt, contract, vessel, econ)

    # Build human-readable period label
    MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    period_label = f"{MONTHS[target_month]} {target_year}"

    return {
        "input_summary": {
            "commodity":       commodity,
            "quantity_mt":     quantity_mt,
            "origin_id":       origin_id,
            "port_id":         port_id,
            "period":          period_label,
            "contract_months": contract_months,
            "route_distance_nm": route["distance_nm"],
            "sailing_days":    route["sailing_days"],
        },
        "freight_forecast": forecast,
        "market_signal":    signal,
        "vessel_recommendation": vessel,
        "port_compatibility":    port_compat,
        "contract_recommendation": contract,
        "risk_assessment":  risk,
        "savings_opportunity": savings,
        "seasonal_context": seasonal,
        "economic_snapshot": econ,
    }
