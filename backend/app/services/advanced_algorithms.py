"""
Advanced AI/ML Algorithms — SIH26006 SAIL Freight Intelligence Platform
Implements the 4 algorithms required by the documentation that were missing:

1. M/M/c Queueing Theory  — Port berth congestion & vessel wait time
2. Weibull Reliability     — Vessel mechanical failure probability & hazard rate
3. Bayesian Probability    — Weather/disruption risk given prior + evidence
4. Graph Search (BFS/Dijkstra) — Port network adjacency for auto-divert routing
"""

from __future__ import annotations
import numpy as np
from math import factorial, exp, log, gamma
from typing import Dict, List, Tuple, Optional
import heapq

# ─────────────────────────────────────────────────────────────────────────────
# 1. M/M/c QUEUEING MODEL
#    Models port berth congestion using Erlang-C formula.
#    Inputs : λ (vessel arrival rate/day), μ (service rate/berth/day), c (berths)
#    Outputs: utilisation ρ, P_wait (probability vessel must wait),
#             E[W] expected wait (days), E[Wq] wait-in-queue (days)
# ─────────────────────────────────────────────────────────────────────────────

class MMcQueue:
    """
    M/M/c queueing model for port berth capacity.
    Arrival process  : Poisson(λ) — vessels arrive at average rate λ/day
    Service process  : Exp(μ)     — each berth serves at rate μ/day
    Servers          : c berths
    """

    def __init__(self, arrival_rate: float, service_rate: float, num_berths: int):
        """
        arrival_rate  λ — average vessels arriving per day
        service_rate  μ — average vessels served per berth per day
        num_berths    c — parallel berths (servers)
        """
        self.lam = max(arrival_rate, 1e-9)
        self.mu  = max(service_rate, 1e-9)
        self.c   = max(num_berths, 1)
        self.rho = self.lam / (self.c * self.mu)   # traffic intensity per server

    def _erlang_c(self) -> float:
        """
        Erlang-C formula — probability that an arriving vessel must wait.
        C(c, a) = [a^c / (c! * (1-ρ))] / [Σ_{k=0}^{c-1} a^k/k! + a^c/(c!*(1-ρ))]
        where a = λ/μ  (offered traffic in Erlangs)
        """
        if self.rho >= 1.0:
            return 1.0    # system overloaded — every vessel waits

        a = self.lam / self.mu   # total offered traffic (Erlangs)
        c = self.c

        # Numerator: a^c / (c! * (1-ρ))
        numerator = (a ** c) / (factorial(c) * (1 - self.rho))

        # Sum term: Σ a^k / k! for k=0..c-1
        sum_term = sum((a ** k) / factorial(k) for k in range(c))

        denominator = sum_term + numerator
        return numerator / max(denominator, 1e-12)

    def metrics(self) -> Dict[str, float]:
        """
        Returns full queueing metrics dict.
        E[Wq] = C(c,a) / (c·μ·(1-ρ))     expected wait IN QUEUE (days)
        E[W]  = E[Wq] + 1/μ               expected TOTAL time in system (days)
        E[Lq] = λ · E[Wq]                 average queue length (vessels)
        E[L]  = λ · E[W]                  average vessels in system
        """
        P_wait = self._erlang_c()
        rho    = self.rho

        if rho >= 1.0:
            # Overloaded — queue grows unboundedly
            return {
                "utilisation_pct":   100.0,
                "p_wait":            1.0,
                "expected_wait_days": 99.0,
                "expected_total_days": 99.0,
                "avg_queue_length":  99.0,
                "avg_system_vessels": 99.0,
                "overloaded":        True,
            }

        Wq = P_wait / (self.c * self.mu * (1 - rho))   # wait in queue (days)
        W  = Wq + (1 / self.mu)                         # total system time (days)
        Lq = self.lam * Wq
        L  = self.lam * W

        return {
            "utilisation_pct":    round(rho * 100, 2),
            "p_wait":             round(P_wait, 4),
            "expected_wait_days": round(Wq, 3),
            "expected_total_days": round(W, 3),
            "avg_queue_length":   round(Lq, 2),
            "avg_system_vessels": round(L, 2),
            "overloaded":         False,
        }


def port_queueing_analysis(
    port_id: str,
    vessels_at_anchor: int,
    berths: int,
    avg_stay_days: float = 2.5,
    month: int = 11,
) -> Dict:
    """
    Compute M/M/c queueing metrics for a port.
    Arrival rate estimated from vessels_at_anchor (vessels currently queued).
    Service rate = 1/avg_stay_days per berth.
    """
    # Estimate arrival rate — scale down to realistic maritime rates
    # ~2-4 vessels per day arrive at major bulk ports
    service_rate = 1.0 / max(avg_stay_days, 0.5)   # berths/day per berth
    # Use Little's Law conservatively: λ ≈ L/(W_system) capped at 3/day
    arrival_rate = min(vessels_at_anchor / max(avg_stay_days * berths, 1), 3.0)
    arrival_rate = max(arrival_rate, 0.1)

    # Monsoon season: 20% higher arrival rate
    if month in [6, 7, 8, 9]:
        arrival_rate *= 1.20

    queue = MMcQueue(arrival_rate, service_rate, berths)
    m     = queue.metrics()

    # Classify congestion based on queueing results
    util = m["utilisation_pct"]
    p_w  = m["p_wait"]
    level = "CRITICAL" if util >= 90 or p_w >= 0.8 else \
            "HIGH"     if util >= 70 or p_w >= 0.5 else \
            "MEDIUM"   if util >= 50 or p_w >= 0.3 else "LOW"

    return {
        "port_id":               port_id,
        "algorithm":             "M/M/c Erlang-C Queueing Theory",
        "arrival_rate_per_day":  round(arrival_rate, 3),
        "service_rate_per_day":  round(service_rate, 3),
        "num_berths":            berths,
        **m,
        "congestion_level":      level,
        "interpretation": (
            f"With {berths} berths at {util:.0f}% utilisation, "
            f"a vessel has {p_w*100:.0f}% probability of waiting. "
            f"Expected wait: {m['expected_wait_days']:.1f} days "
            f"({m['avg_queue_length']:.1f} vessels ahead on average)."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. WEIBULL RELIABILITY MODEL
#    Models probability of mechanical/engine failure on a voyage.
#    Weibull CDF: F(t) = 1 - exp(-(t/η)^β)
#    Hazard rate: h(t) = (β/η) · (t/η)^(β-1)
#    β > 1 → wear-out failures (increasing hazard — older vessels)
#    β = 1 → constant failure rate (exponential / random failures)
#    β < 1 → early-life failures (decreasing hazard)
# ─────────────────────────────────────────────────────────────────────────────

class WeibullReliability:
    """
    Weibull 2-parameter reliability model for vessel mechanical failures.
    shape β (beta)  — failure pattern (>1 = wear-out, common for engines)
    scale η (eta)   — characteristic life (days of operation to 63.2% failure)
    """

    def __init__(self, shape: float = 2.0, scale: float = 3650.0):
        """
        shape β = 2.0  — typical for wear-out failure mode
        scale η = 3650 — characteristic life ~10 years (3650 days)
        """
        self.beta = max(shape, 0.1)
        self.eta  = max(scale, 1.0)

    def failure_probability(self, operating_days: float) -> float:
        """F(t) = 1 - exp(-(t/η)^β)  — cumulative failure probability by time t."""
        return 1.0 - exp(-((operating_days / self.eta) ** self.beta))

    def reliability(self, operating_days: float) -> float:
        """R(t) = exp(-(t/η)^β)  — probability of NO failure up to time t."""
        return exp(-((operating_days / self.eta) ** self.beta))

    def hazard_rate(self, operating_days: float) -> float:
        """h(t) = (β/η) · (t/η)^(β-1)  — instantaneous failure rate at time t."""
        return (self.beta / self.eta) * ((operating_days / self.eta) ** (self.beta - 1))

    def mean_time_to_failure(self) -> float:
        """MTTF = η · Γ(1 + 1/β)"""
        return self.eta * gamma(1.0 + 1.0 / self.beta)

    def voyage_failure_probability(
        self, operating_days: float, voyage_days: float
    ) -> float:
        """
        Conditional probability of failure DURING a voyage of `voyage_days`,
        given the vessel has already operated `operating_days` without failure.
        P(fail during voyage | survived so far) = 1 - R(t0+t)/R(t0)
        """
        R_now = self.reliability(operating_days)
        R_end = self.reliability(operating_days + voyage_days)
        if R_now < 1e-10:
            return 1.0
        return max(0.0, 1.0 - R_end / R_now)


def vessel_failure_analysis(
    vessel_type: str,
    vessel_age_years: float,
    voyage_days: float,
) -> Dict:
    """
    Compute failure probability for a vessel given age and voyage length.
    β and η calibrated to typical dry-bulk vessel failure data.
    """
    # Age-specific Weibull parameters (calibrated to industry data)
    # Older vessels → lower η (shorter characteristic life remaining)
    # Shape β=2.2 is typical for mechanical wear-out failure mode
    VESSEL_PARAMS = {
        "Handymax":  {"beta": 2.1, "eta": 4200},
        "Supramax":  {"beta": 2.2, "eta": 4000},
        "Ultramax":  {"beta": 2.2, "eta": 3800},
        "Panamax":   {"beta": 2.3, "eta": 3600},
        "Kamsarmax": {"beta": 2.3, "eta": 3500},
        "Capesize":  {"beta": 2.5, "eta": 3200},
    }
    params     = VESSEL_PARAMS.get(vessel_type, {"beta": 2.2, "eta": 3800})
    model      = WeibullReliability(params["beta"], params["eta"])
    op_days    = vessel_age_years * 365

    p_fail     = round(model.voyage_failure_probability(op_days, voyage_days), 5)
    hazard     = round(model.hazard_rate(op_days), 8)
    mttf       = round(model.mean_time_to_failure() / 365, 1)
    cumul_fail = round(model.failure_probability(op_days), 4)
    reliability= round(model.reliability(op_days), 4)

    # Risk classification
    level = "CRITICAL" if p_fail >= 0.05 else \
            "HIGH"     if p_fail >= 0.02 else \
            "MEDIUM"   if p_fail >= 0.005 else "LOW"

    return {
        "vessel_type":             vessel_type,
        "vessel_age_years":        vessel_age_years,
        "voyage_days":             voyage_days,
        "algorithm":               "Weibull Reliability Model (2-parameter)",
        "weibull_shape_beta":      params["beta"],
        "weibull_scale_eta_days":  params["eta"],
        "voyage_failure_probability": p_fail,
        "instantaneous_hazard_rate":  hazard,
        "cumulative_failure_prob":    cumul_fail,
        "reliability":                reliability,
        "mean_time_to_failure_years": mttf,
        "failure_risk_level":         level,
        "interpretation": (
            f"{vessel_type} aged {vessel_age_years:.0f} years has a "
            f"{p_fail*100:.2f}% probability of mechanical failure during "
            f"this {voyage_days:.0f}-day voyage. "
            f"Instantaneous hazard rate: {hazard:.2e}/day. "
            f"Fleet MTTF: {mttf:.0f} years."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. BAYESIAN PROBABILITY MODEL
#    Updates weather/disruption risk using Bayes' theorem:
#    P(disruption | evidence) = P(evidence | disruption) × P(disruption) / P(evidence)
#    Prior: seasonal/historical base rate for each disruption type
#    Likelihood: how likely is the evidence if disruption is occurring?
#    Posterior: updated probability given current observations
# ─────────────────────────────────────────────────────────────────────────────

# ── Prior probabilities per season per disruption type ───────────────────────
# Calibrated from historical Bay of Bengal / Indian Ocean data
DISRUPTION_PRIORS = {
    "cyclone": {
        "monsoon":     0.35,   # Jun–Sep: elevated cyclone risk
        "post_monsoon":0.15,   # Oct–Nov: returning cyclones
        "pre_monsoon": 0.08,   # Mar–May: pre-season
        "winter":      0.03,   # Dec–Feb: low risk
    },
    "port_congestion": {
        "monsoon":      0.55,  # Port backlogs during monsoon
        "post_monsoon": 0.45,  # Restocking surge
        "pre_monsoon":  0.30,
        "winter":       0.25,
    },
    "engine_failure": {
        "monsoon":      0.04,  # Higher sea state stress
        "post_monsoon": 0.03,
        "pre_monsoon":  0.025,
        "winter":       0.02,
    },
    "geopolitical": {
        "suez_tension": 0.40,
        "normal":       0.08,
    },
}

# ── Likelihood tables: P(evidence | disruption) ───────────────────────────────
# How likely is each piece of evidence IF the disruption IS occurring?
LIKELIHOODS = {
    "cyclone": {
        "wave_height_high":   0.85,  # If cyclone: high probability of high waves
        "pressure_low":       0.78,
        "wind_speed_high":    0.82,
        "no_adverse_forecast":0.05,  # Very unlikely normal forecast if cyclone
    },
    "port_congestion": {
        "vessels_waiting_high": 0.80,
        "berth_util_high":      0.75,
        "wait_days_high":       0.70,
        "normal_throughput":    0.10,
    },
    "engine_failure": {
        "old_vessel":        0.65,
        "high_load_factor":  0.55,
        "recent_maintenance": 0.10,
    },
}


def _get_season(month: int) -> str:
    if month in [6, 7, 8, 9]:   return "monsoon"
    if month in [10, 11]:         return "post_monsoon"
    if month in [3, 4, 5]:        return "pre_monsoon"
    return "winter"


def bayesian_disruption_probability(
    disruption_type: str,
    month: int,
    evidence: Dict[str, bool],
    chokepoints: Optional[List[str]] = None,
) -> Dict:
    """
    Compute posterior disruption probability using Bayes' theorem.

    disruption_type: 'cyclone' | 'port_congestion' | 'engine_failure' | 'geopolitical'
    month:           1–12 delivery month
    evidence:        dict of observed indicators and whether they are True/False
                     e.g. {'wave_height_high': True, 'pressure_low': False}
    chokepoints:     list of route chokepoints (for geopolitical prior)
    """
    season = _get_season(month)

    # ── Step 1: Prior P(disruption) ───────────────────────────────────────────
    if disruption_type == "geopolitical":
        has_suez = chokepoints and any("Suez" in c for c in chokepoints)
        prior = DISRUPTION_PRIORS["geopolitical"]["suez_tension" if has_suez else "normal"]
    else:
        prior = DISRUPTION_PRIORS.get(disruption_type, {}).get(season, 0.10)

    # ── Step 2: Likelihood P(evidence | disruption) ───────────────────────────
    # Multiply individual likelihoods (naïve Bayes — conditional independence)
    likelihood_given_disruption    = 1.0
    likelihood_given_no_disruption = 1.0
    evidence_used = []

    lhood_table = LIKELIHOODS.get(disruption_type, {})
    for indicator, observed in evidence.items():
        if indicator in lhood_table:
            p_e_given_d    = lhood_table[indicator] if observed else (1 - lhood_table[indicator])
            p_e_given_nod  = (1 - lhood_table[indicator]) if observed else lhood_table[indicator]
            likelihood_given_disruption    *= p_e_given_d
            likelihood_given_no_disruption *= p_e_given_nod
            evidence_used.append(f"{'[+]' if observed else '[-]'} {indicator}")

    # ── Step 3: Posterior via Bayes' theorem ──────────────────────────────────
    # P(D|E) = P(E|D)·P(D) / [P(E|D)·P(D) + P(E|~D)·P(~D)]
    p_d     = prior
    p_nd    = 1 - prior
    p_e     = (likelihood_given_disruption * p_d) + (likelihood_given_no_disruption * p_nd)

    if p_e < 1e-10:
        posterior = prior
    else:
        posterior = (likelihood_given_disruption * p_d) / p_e

    posterior = min(max(posterior, 0.0), 1.0)
    update_factor = posterior / prior if prior > 0 else 1.0

    level = "CRITICAL" if posterior >= 0.60 else \
            "HIGH"     if posterior >= 0.35 else \
            "MEDIUM"   if posterior >= 0.15 else "LOW"

    return {
        "disruption_type":     disruption_type,
        "season":              season,
        "month":               month,
        "algorithm":           "Bayesian Probability (Naive Bayes update)",
        "prior_probability":   round(prior, 4),
        "posterior_probability": round(posterior, 4),
        "likelihood_ratio":    round(likelihood_given_disruption / max(likelihood_given_no_disruption, 1e-10), 3),
        "update_factor":       round(update_factor, 2),
        "evidence_used":       evidence_used,
        "risk_level":          level,
        "interpretation": (
            f"Prior probability of {disruption_type} in {season}: {prior*100:.0f}%. "
            f"After observing {len(evidence_used)} evidence indicators, "
            f"posterior probability updated to {posterior*100:.1f}% "
            f"({'↑' if posterior>prior else '↓'} {abs(posterior-prior)*100:.1f}pp). "
            f"Risk level: {level}."
        ),
    }


def bayesian_voyage_risk(
    origin_id: str,
    port_id: str,
    month: int,
    vessels_waiting: int,
    berths: int,
    chokepoints: Optional[List[str]] = None,
    vessel_age_years: float = 8.0,
) -> Dict:
    """
    Run full Bayesian risk assessment for a voyage — all three disruption types.
    Returns a unified risk profile with posterior probabilities.
    """
    season = _get_season(month)
    is_monsoon    = season == "monsoon"
    is_post_monsoon = season == "post_monsoon"
    high_congestion = (vessels_waiting / max(berths, 1)) > 0.7

    # ── Evidence for each disruption type ─────────────────────────────────────
    cyclone_evidence = {
        "wave_height_high":    is_monsoon,
        "pressure_low":        is_monsoon,
        "wind_speed_high":     is_monsoon,
        "no_adverse_forecast": not is_monsoon and not is_post_monsoon,
    }
    congestion_evidence = {
        "vessels_waiting_high": high_congestion,
        "berth_util_high":      high_congestion,
        "wait_days_high":       high_congestion,
        "normal_throughput":    not high_congestion,
    }
    engine_evidence = {
        "old_vessel":         vessel_age_years >= 10,
        "high_load_factor":   is_monsoon,
        "recent_maintenance": vessel_age_years < 5,
    }

    cyclone_result    = bayesian_disruption_probability("cyclone",          month, cyclone_evidence,    chokepoints)
    congestion_result = bayesian_disruption_probability("port_congestion",  month, congestion_evidence)
    engine_result     = bayesian_disruption_probability("engine_failure",   month, engine_evidence)
    geo_result        = bayesian_disruption_probability("geopolitical",     month, {}, chokepoints)

    # Overall voyage risk = 1 - P(none of the disruptions occur)
    p_no_disruption = (
        (1 - cyclone_result["posterior_probability"]) *
        (1 - congestion_result["posterior_probability"]) *
        (1 - engine_result["posterior_probability"]) *
        (1 - geo_result["posterior_probability"])
    )
    overall_risk = round(1 - p_no_disruption, 4)
    overall_level = "CRITICAL" if overall_risk >= 0.70 else \
                    "HIGH"     if overall_risk >= 0.45 else \
                    "MEDIUM"   if overall_risk >= 0.25 else "LOW"

    return {
        "origin_id":       origin_id,
        "port_id":         port_id,
        "month":           month,
        "cyclone":         cyclone_result,
        "port_congestion": congestion_result,
        "engine_failure":  engine_result,
        "geopolitical":    geo_result,
        "overall_voyage_risk": overall_risk,
        "overall_risk_level":  overall_level,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. GRAPH SEARCH — PORT NETWORK AUTO-DIVERT ROUTING
#    Ports and sea corridors represented as a weighted graph.
#    Nodes = ports, Edges = sea lanes with weights (distance_nm, risk_score)
#    Algorithm: Dijkstra's shortest-path for cost minimization
#               BFS for finding all ports within N hops
# ─────────────────────────────────────────────────────────────────────────────

# ── Port adjacency graph ──────────────────────────────────────────────────────
# Edge weight = (distance_nm, sea_lane_risk_score 0-100)
# East Coast India port network + major waypoints
PORT_GRAPH: Dict[str, List[Tuple[str, float, float]]] = {
    # (neighbour_port, distance_nm, risk_score)
    "INPRD": [("INVTZ", 580,  15), ("INGVP", 590,  15), ("INGPL", 120,  10),
               ("INDMA", 90,   8),  ("INCHP", 900,  18)],
    "INVTZ": [("INPRD", 580,  15), ("INGVP", 18,   5),  ("INGPL", 480,  12),
               ("INCHP", 700,  16)],
    "INGVP": [("INVTZ", 18,   5),  ("INPRD", 590,  15), ("INGPL", 500,  12),
               ("INCHP", 720,  16)],
    "INGPL": [("INPRD", 120,  10), ("INVTZ", 480,  12), ("INGVP", 500,  12),
               ("INDMA", 180,  10)],
    "INDMA": [("INPRD", 90,   8),  ("INGPL", 180,  10), ("INHAL", 200,  12)],
    "INHAL": [("INDMA", 200,  12), ("INPRD", 280,  14), ("INGVP", 950,  18)],
    "INCHP": [("INVTZ", 700,  16), ("INGVP", 720,  16), ("INKDL", 1800, 22)],
    "INKDL": [("INCHP", 1800, 22), ("INVTZ", 2100, 25)],
}

# Origin port nodes (loading ports) with distances to Indian coast entry
ORIGIN_TO_COAST: Dict[str, Tuple[str, float]] = {
    "AU": ("INPRD", 4800),   # enters via Paradip approach
    "ID": ("INPRD", 2200),
    "US": ("INPRD", 11500),
    "MZ": ("INPRD", 5600),
    "RU": ("INPRD", 7200),
    "BR": ("INPRD", 10800),
    "ZA": ("INPRD", 5200),
    "GA": ("INPRD", 8600),
}


def dijkstra_port_route(
    start_port: str,
    target_port: str,
    blocked_ports: Optional[List[str]] = None,
    weight_mode: str = "distance",   # "distance" | "risk" | "combined"
) -> Dict:
    """
    Dijkstra shortest path through the port network.
    Finds optimal divert path from start_port to target_port,
    avoiding any blocked_ports (e.g. high-congestion or incompatible ports).

    weight_mode:
      'distance' — minimize NM sailed (fastest)
      'risk'     — minimize total risk score (safest)
      'combined' — distance*0.6 + risk*0.4
    """
    blocked = set(blocked_ports or [])
    if start_port not in PORT_GRAPH:
        return {"error": f"Port {start_port} not in network"}

    # Priority queue: (cost, port_id, path)
    pq       = [(0.0, start_port, [start_port])]
    visited  = set()
    best_cost = {}

    while pq:
        cost, node, path = heapq.heappop(pq)

        if node in visited:
            continue
        visited.add(node)
        best_cost[node] = cost

        if node == target_port:
            total_dist = sum(
                next((d for n, d, _ in PORT_GRAPH.get(path[i], []) if n == path[i+1]), 0)
                for i in range(len(path)-1)
            )
            total_risk = sum(
                next((r for n, _, r in PORT_GRAPH.get(path[i], []) if n == path[i+1]), 0)
                for i in range(len(path)-1)
            )
            return {
                "algorithm":     "Dijkstra Shortest Path",
                "start_port":    start_port,
                "target_port":   target_port,
                "path":          path,
                "hops":          len(path) - 1,
                "total_distance_nm": round(total_dist, 0),
                "total_risk_score":  round(total_risk, 1),
                "weight_mode":   weight_mode,
                "found":         True,
            }

        for (neighbour, dist, risk) in PORT_GRAPH.get(node, []):
            if neighbour in visited or neighbour in blocked:
                continue
            if weight_mode == "distance":
                edge_cost = dist
            elif weight_mode == "risk":
                edge_cost = risk
            else:
                edge_cost = dist * 0.6 + risk * 0.4   # combined

            new_cost = cost + edge_cost
            if new_cost < best_cost.get(neighbour, float("inf")):
                best_cost[neighbour] = new_cost
                heapq.heappush(pq, (new_cost, neighbour, path + [neighbour]))

    return {
        "algorithm":    "Dijkstra Shortest Path",
        "start_port":   start_port,
        "target_port":  target_port,
        "found":        False,
        "message":      f"No path found from {start_port} to {target_port} (blocked: {list(blocked)})",
    }


def bfs_nearby_ports(
    start_port: str,
    max_hops: int = 2,
    min_draft: float = 0.0,
    blocked_ports: Optional[List[str]] = None,
) -> List[Dict]:
    """
    BFS to find all ports reachable within max_hops from start_port.
    Used for auto-divert: find all feasible nearby alternatives.

    min_draft: if set, only returns ports with max_draft_m >= min_draft
    """
    from app.data.datasets import PORTS as PORT_DATA

    blocked  = set(blocked_ports or [start_port])
    visited  = {start_port: 0}
    queue    = [(start_port, 0, 0.0)]
    reachable = []

    while queue:
        port, hops, cum_dist = queue.pop(0)
        if hops >= max_hops:
            continue
        for (neighbour, dist, risk) in PORT_GRAPH.get(port, []):
            if neighbour not in visited and neighbour not in blocked:
                visited[neighbour] = hops + 1
                new_dist = cum_dist + dist
                port_meta = PORT_DATA.get(neighbour, {})
                draft     = port_meta.get("max_draft_m", 0)
                if draft >= min_draft:
                    reachable.append({
                        "port_id":       neighbour,
                        "port_name":     port_meta.get("name", neighbour),
                        "state":         port_meta.get("state", ""),
                        "max_draft_m":   draft,
                        "berths":        port_meta.get("berths", 0),
                        "hops_from_start": hops + 1,
                        "distance_from_start_nm": round(new_dist, 0),
                        "risk_score":    round(risk, 1),
                        "compatible":    draft >= min_draft,
                    })
                queue.append((neighbour, hops + 1, new_dist))

    reachable.sort(key=lambda x: x["distance_from_start_nm"])
    return reachable


def graph_auto_divert(
    blocked_port: str,
    vessel_draft_m: float,
    commodity: str,
    max_hops: int = 2,
) -> Dict:
    """
    Full auto-divert logic using graph search.
    Finds the nearest compatible alternate port when primary is unavailable.
    """
    from app.data.datasets import PORTS as PORT_DATA

    # Find all nearby ports via BFS
    nearby = bfs_nearby_ports(
        start_port=blocked_port,
        max_hops=max_hops,
        min_draft=vessel_draft_m,
        blocked_ports=[blocked_port],
    )

    # Filter by commodity compatibility
    compatible = [
        p for p in nearby
        if commodity in PORT_DATA.get(p["port_id"], {}).get("commodities", [])
    ]

    if not compatible:
        return {
            "algorithm":    "BFS Graph Search",
            "blocked_port": blocked_port,
            "found":        False,
            "message":      f"No compatible alternate port found within {max_hops} hops for {commodity} with draft {vessel_draft_m}m",
        }

    best = compatible[0]

    # Find Dijkstra path from blocked port to best alternate
    path_result = dijkstra_port_route(
        blocked_port, best["port_id"],
        blocked_ports=[], weight_mode="combined"
    )

    return {
        "algorithm":           "BFS + Dijkstra Graph Search",
        "blocked_port":        blocked_port,
        "blocked_port_name":   PORT_DATA.get(blocked_port, {}).get("name", blocked_port),
        "vessel_draft_m":      vessel_draft_m,
        "commodity":           commodity,
        "found":               True,
        "recommended_port":    best,
        "all_compatible":      compatible,
        "path_to_best":        path_result,
        "interpretation": (
            f"Vessel ({vessel_draft_m}m draft, {commodity}) cannot berth at "
            f"{PORT_DATA.get(blocked_port,{}).get('name',blocked_port)}. "
            f"Graph search found {len(compatible)} compatible alternate(s). "
            f"Best: {best['port_name']} ({best['distance_from_start_nm']} NM, "
            f"{best['hops_from_start']} hop(s) away, draft {best['max_draft_m']}m)."
        ),
    }
