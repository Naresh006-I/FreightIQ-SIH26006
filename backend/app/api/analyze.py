"""
/api/analyze — Master MVP endpoint.
Accepts one form POST, returns all 6 analysis outputs.
"""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.analyze_engine import analyze
from app.data.datasets import PORTS, VESSELS, BASE_FOB

router = APIRouter(prefix="/api", tags=["Analyze"])


class AnalyzeRequest(BaseModel):
    commodity:       str   = Field(default="thermal_coal",
                                   description="thermal_coal | coking_coal | iron_ore | limestone | bauxite")
    quantity_mt:     float = Field(default=80_000, ge=10_000, le=500_000,
                                   description="Cargo quantity in metric tonnes")
    origin_id:       str   = Field(default="AU",
                                   description="AU | ID | US | MZ | RU")
    port_id:         str   = Field(default="INPRD",
                                   description="INPRD | INVTZ | INGVP | INGPL | INDMA | INHAL")
    target_month:    int   = Field(default=11, ge=1, le=12)
    target_year:     int   = Field(default=2026, ge=2025, le=2030)
    contract_months: int   = Field(default=6, ge=1, le=24,
                                   description="Desired contract duration in months")


@router.post("/analyze")
def run_analysis(req: AnalyzeRequest):
    return analyze(
        commodity=req.commodity,
        quantity_mt=req.quantity_mt,
        origin_id=req.origin_id,
        port_id=req.port_id,
        target_month=req.target_month,
        target_year=req.target_year,
        contract_months=req.contract_months,
    )


@router.get("/analyze/defaults")
def get_form_defaults():
    """Return dropdown options for the frontend form."""
    return {
        "commodities": [
            {"id": "thermal_coal", "label": "Thermal Coal"},
            {"id": "coking_coal",  "label": "Coking Coal"},
            {"id": "iron_ore",     "label": "Iron Ore"},
            {"id": "limestone",    "label": "Limestone"},
            {"id": "bauxite",      "label": "Bauxite"},
        ],
        "origins": [
            {"id": "AU", "label": "Australia",     "ports": ["Newcastle", "Hay Point"]},
            {"id": "ID", "label": "Indonesia",     "ports": ["Samarinda", "Taboneo"]},
            {"id": "US", "label": "United States", "ports": ["Norfolk"]},
            {"id": "MZ", "label": "Mozambique",    "ports": ["Maputo", "Nacala"]},
            {"id": "RU", "label": "Russia",        "ports": ["Taman", "Ust-Luga"]},
        ],
        "ports": [
            {"id": p["id"], "label": p["name"], "state": p["state"], "max_draft": p["max_draft_m"]}
            for p in PORTS.values()
        ],
        "contract_options": [1, 3, 6, 9, 12, 18, 24],
    }
