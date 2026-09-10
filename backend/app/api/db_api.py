"""
Database API — SAIL Freight Intelligence Platform (SIH26006)
Endpoints for storing and retrieving all application data.
"""

from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any, Optional
from app.db.database import (
    save_cargo_dataset, get_cargo_datasets,
    save_analysis_result, get_analysis_history, get_analysis_by_id,
    save_voyage_disruption, get_disruption_history,
    upsert_bdi_snapshot, get_bdi_history_db,
    save_port_congestion_batch, get_port_congestion_history,
    get_db_stats,
)

router = APIRouter(prefix="/api/db", tags=["Database"])


# ── Stats ─────────────────────────────────────────────────────────────────────
@router.get("/stats")
def database_stats():
    """Return row counts for all tables + DB file size."""
    return get_db_stats()


# ── Cargo Datasets ────────────────────────────────────────────────────────────
class SaveCargoRequest(BaseModel):
    upload_name: str = "upload.xlsx"
    rows: list[dict] = Field(default=[])

@router.post("/cargo")
def save_cargo(req: SaveCargoRequest):
    ids = save_cargo_dataset(req.upload_name, req.rows)
    return {"saved": len(ids), "ids": ids, "message": f"Saved {len(ids)} cargo rows"}

@router.get("/cargo")
def list_cargo(limit: int = 50):
    return {"rows": get_cargo_datasets(limit), "count": len(get_cargo_datasets(limit))}


# ── Analysis Results ──────────────────────────────────────────────────────────
class SaveAnalysisRequest(BaseModel):
    request_data:      dict     = Field(default={})
    result:            dict     = Field(default={})
    cargo_dataset_id:  Optional[int] = None

@router.post("/analysis")
def save_analysis(req: SaveAnalysisRequest):
    aid = save_analysis_result(req.request_data, req.result, req.cargo_dataset_id)
    return {"id": aid, "message": "Analysis result saved"}

@router.get("/analysis")
def list_analysis(limit: int = 20):
    rows = get_analysis_history(limit)
    return {"results": rows, "count": len(rows)}

@router.get("/analysis/{result_id}")
def get_analysis(result_id: int):
    r = get_analysis_by_id(result_id)
    if not r:
        from fastapi import HTTPException
        raise HTTPException(404, f"Analysis result {result_id} not found")
    return r


# ── Voyage Disruptions ────────────────────────────────────────────────────────
class SaveDisruptionRequest(BaseModel):
    request_data:       dict         = Field(default={})
    result:             dict         = Field(default={})
    analysis_result_id: Optional[int] = None

@router.post("/disruption")
def save_disruption(req: SaveDisruptionRequest):
    did = save_voyage_disruption(req.request_data, req.result, req.analysis_result_id)
    return {"id": did, "message": "Voyage disruption record saved"}

@router.get("/disruption")
def list_disruptions(limit: int = 20):
    rows = get_disruption_history(limit)
    return {"records": rows, "count": len(rows)}


# ── BDI Snapshots ─────────────────────────────────────────────────────────────
class BDISnapshotRequest(BaseModel):
    date:       str
    bdi_value:  float
    source:     str = "synthetic"

@router.post("/bdi")
def save_bdi(req: BDISnapshotRequest):
    upsert_bdi_snapshot(req.date, req.bdi_value, req.source)
    return {"message": f"BDI {req.bdi_value} saved for {req.date}"}

@router.get("/bdi")
def list_bdi(days: int = 90):
    rows = get_bdi_history_db(days)
    return {"snapshots": rows, "count": len(rows)}


# ── Port Congestion ───────────────────────────────────────────────────────────
class SaveCongestionRequest(BaseModel):
    reports: list[dict]
    month:   int = Field(default=11, ge=1, le=12)
    year:    int = Field(default=2026)

@router.post("/congestion")
def save_congestion(req: SaveCongestionRequest):
    save_port_congestion_batch(req.reports, req.month, req.year)
    return {"message": f"Saved {len(req.reports)} port congestion records"}

@router.get("/congestion/{port_id}")
def get_congestion(port_id: str, limit: int = 12):
    rows = get_port_congestion_history(port_id, limit)
    return {"port_id": port_id, "records": rows, "count": len(rows)}
