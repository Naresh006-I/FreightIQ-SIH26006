"""
Advanced Algorithms API — SIH26006
Exposes the 4 newly implemented algorithms:
  GET  /api/algorithms/queueing          — M/M/c port berth queueing
  POST /api/algorithms/weibull           — Weibull vessel reliability
  POST /api/algorithms/bayesian          — Bayesian disruption probability
  POST /api/algorithms/graph/divert      — Graph search auto-divert
  GET  /api/algorithms/graph/nearby      — BFS nearby ports
  GET  /api/algorithms/graph/path        — Dijkstra shortest path
  GET  /api/algorithms/full-voyage-risk  — All algorithms combined for a voyage
"""

from __future__ import annotations
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.advanced_algorithms import (
    port_queueing_analysis,
    vessel_failure_analysis,
    bayesian_disruption_probability,
    bayesian_voyage_risk,
    dijkstra_port_route,
    bfs_nearby_ports,
    graph_auto_divert,
)
from app.data.datasets import get_port_congestion

router = APIRouter(prefix="/api/algorithms", tags=["Advanced Algorithms"])


# ── M/M/c Queueing ────────────────────────────────────────────────────────────
@router.get("/queueing")
def queueing_analysis(
    port_id:          str   = Query(default="INPRD"),
    month:            int   = Query(default=11, ge=1, le=12),
    avg_stay_days:    float = Query(default=2.5, ge=0.5, le=20),
):
    """
    M/M/c Erlang-C queueing analysis for a port.
    Returns: utilisation, P(wait), expected wait days, queue length.
    """
    cong = get_port_congestion(port_id, month)
    result = port_queueing_analysis(
        port_id=port_id,
        vessels_at_anchor=cong["vessels_at_anchor"],
        berths=cong.get("berths", 6),
        avg_stay_days=avg_stay_days,
        month=month,
    )
    result["observed_congestion"] = cong
    return result


# ── Weibull Reliability ───────────────────────────────────────────────────────
class WeibullRequest(BaseModel):
    vessel_type:      str   = "Kamsarmax"
    vessel_age_years: float = Field(default=8.0, ge=0.5, le=30.0)
    voyage_days:      float = Field(default=15.0, ge=1.0, le=60.0)

@router.post("/weibull")
def weibull_analysis(req: WeibullRequest):
    """
    Weibull reliability model — probability of mechanical failure during voyage.
    Returns: failure probability, hazard rate, reliability, MTTF.
    """
    return vessel_failure_analysis(
        vessel_type=req.vessel_type,
        vessel_age_years=req.vessel_age_years,
        voyage_days=req.voyage_days,
    )


# ── Bayesian Probability ──────────────────────────────────────────────────────
class BayesianRequest(BaseModel):
    disruption_type: str  = "cyclone"    # cyclone | port_congestion | engine_failure | geopolitical
    month:           int  = Field(default=11, ge=1, le=12)
    evidence:        dict = Field(default={})
    chokepoints:     List[str] = Field(default=[])

@router.post("/bayesian")
def bayesian_analysis(req: BayesianRequest):
    """
    Bayesian probability — updates disruption risk using prior + observed evidence.
    Returns: prior, posterior, likelihood ratio, risk level.
    """
    return bayesian_disruption_probability(
        disruption_type=req.disruption_type,
        month=req.month,
        evidence=req.evidence,
        chokepoints=req.chokepoints,
    )


# ── Graph Search: Auto-Divert ─────────────────────────────────────────────────
class DivertRequest(BaseModel):
    blocked_port:   str   = "INHAL"
    vessel_draft_m: float = Field(default=13.8, ge=5.0, le=25.0)
    commodity:      str   = "thermal_coal"
    max_hops:       int   = Field(default=2, ge=1, le=4)

@router.post("/graph/divert")
def graph_divert(req: DivertRequest):
    """
    Graph-based auto-divert: BFS + Dijkstra to find nearest compatible
    alternate port when primary port is unavailable.
    """
    return graph_auto_divert(
        blocked_port=req.blocked_port,
        vessel_draft_m=req.vessel_draft_m,
        commodity=req.commodity,
        max_hops=req.max_hops,
    )


@router.get("/graph/nearby")
def graph_nearby(
    port_id:    str   = Query(default="INPRD"),
    max_hops:   int   = Query(default=2, ge=1, le=4),
    min_draft:  float = Query(default=0.0, ge=0.0, le=25.0),
):
    """BFS — find all ports reachable within N hops from a given port."""
    return {
        "start_port": port_id,
        "max_hops":   max_hops,
        "min_draft_m": min_draft,
        "nearby_ports": bfs_nearby_ports(port_id, max_hops, min_draft),
        "algorithm": "Breadth-First Search (BFS)",
    }


@router.get("/graph/path")
def graph_path(
    from_port:    str = Query(default="INHAL"),
    to_port:      str = Query(default="INPRD"),
    weight_mode:  str = Query(default="combined"),
    blocked:      str = Query(default=""),
):
    """Dijkstra shortest path between two ports in the network."""
    blocked_list = [p.strip() for p in blocked.split(",") if p.strip()]
    return dijkstra_port_route(from_port, to_port, blocked_list, weight_mode)


# ── Full Voyage Risk (all algorithms combined) ────────────────────────────────
@router.get("/full-voyage-risk")
def full_voyage_risk(
    origin_id:         str   = Query(default="AU"),
    port_id:           str   = Query(default="INPRD"),
    month:             int   = Query(default=11, ge=1, le=12),
    vessel_type:       str   = Query(default="Kamsarmax"),
    vessel_age_years:  float = Query(default=8.0, ge=0.5, le=30.0),
    voyage_days:       float = Query(default=15.0, ge=1.0, le=60.0),
    vessel_draft_m:    float = Query(default=13.8, ge=5.0, le=25.0),
):
    """
    Combined risk analysis using all 4 algorithms for a single voyage:
    - M/M/c queueing for destination port
    - Weibull reliability for vessel
    - Bayesian probability for all disruption types
    - Graph search for auto-divert if needed
    """
    from app.data.datasets import get_route, PORTS

    cong       = get_port_congestion(port_id, month)
    port_meta  = PORTS.get(port_id, {})
    route      = get_route(origin_id, port_id)
    chokepoints = route.get("chokepoints", [])

    # 1. M/M/c Queueing
    queueing = port_queueing_analysis(
        port_id=port_id,
        vessels_at_anchor=cong["vessels_at_anchor"],
        berths=port_meta.get("berths", 6),
        avg_stay_days=cong["avg_wait_days"],
        month=month,
    )

    # 2. Weibull Reliability
    weibull = vessel_failure_analysis(vessel_type, vessel_age_years, voyage_days)

    # 3. Bayesian Voyage Risk
    bayesian = bayesian_voyage_risk(
        origin_id=origin_id,
        port_id=port_id,
        month=month,
        vessels_waiting=cong["vessels_at_anchor"],
        berths=port_meta.get("berths", 6),
        chokepoints=chokepoints,
        vessel_age_years=vessel_age_years,
    )

    # 4. Graph auto-divert check
    port_compatible = vessel_draft_m <= port_meta.get("max_draft_m", 17.0)
    divert = None
    if not port_compatible:
        from app.data.datasets import PORTS as PORT_DATA
        commodity = PORT_DATA.get(port_id, {}).get("commodities", ["thermal_coal"])[0]
        divert = graph_auto_divert(port_id, vessel_draft_m, commodity)

    # Combined risk summary
    q_risk = min(queueing["utilisation_pct"] / 100, 1.0)
    w_risk = weibull["voyage_failure_probability"]
    b_risk = bayesian["overall_voyage_risk"]
    combined = round(1 - (1-q_risk*0.3) * (1-w_risk) * (1-b_risk), 4)
    combined_level = "CRITICAL" if combined >= 0.70 else \
                     "HIGH"     if combined >= 0.45 else \
                     "MEDIUM"   if combined >= 0.25 else "LOW"

    return {
        "voyage": {
            "origin_id":    origin_id,
            "port_id":      port_id,
            "month":        month,
            "vessel_type":  vessel_type,
            "voyage_days":  voyage_days,
            "chokepoints":  chokepoints,
        },
        "queueing_analysis":    queueing,
        "weibull_reliability":  weibull,
        "bayesian_risk":        bayesian,
        "graph_divert":         divert,
        "combined_risk_score":  combined,
        "combined_risk_level":  combined_level,
        "algorithms_used": [
            "M/M/c Erlang-C Queueing Theory",
            "Weibull Reliability Model (2-parameter)",
            "Bayesian Probability (Naive Bayes update)",
            "Dijkstra / BFS Graph Search",
        ],
    }
