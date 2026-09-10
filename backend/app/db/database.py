"""
SAIL Freight Intelligence Platform — SQLite Database Layer
Pure stdlib sqlite3 — no external ORM required.

Tables:
  1. cargo_datasets     — uploaded Excel/CSV rows (the raw cargo data)
  2. analysis_results   — every /api/analyze run result
  3. voyage_disruptions — every /api/voyage-disruption run result
  4. bdi_snapshots      — daily BDI values cached from API
  5. port_congestion    — port congestion records over time
"""

from __future__ import annotations
import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path

# Database file stored in backend/data/ directory
DB_DIR  = Path(__file__).parent.parent.parent / "data"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "sail_freight.db"


def get_conn() -> sqlite3.Connection:
    """Get a SQLite connection with Row factory enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # better concurrent reads
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create all tables if they don't exist."""
    conn = get_conn()
    try:
        conn.executescript("""
        -- ── 1. Cargo Datasets ──────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS cargo_datasets (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_name     TEXT NOT NULL,          -- filename
            row_id          INTEGER NOT NULL,        -- ID from Excel (1,2,3...)
            commodity       TEXT NOT NULL,
            quantity_mt     REAL NOT NULL,
            origin_id       TEXT NOT NULL,
            port_id         TEXT NOT NULL,
            target_month    INTEGER,
            target_year     INTEGER,
            contract_months INTEGER,
            raw_json        TEXT,                   -- full original row JSON
            uploaded_at     TEXT DEFAULT (datetime('now'))
        );

        -- ── 2. Analysis Results ────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS analysis_results (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            cargo_dataset_id    INTEGER REFERENCES cargo_datasets(id),
            commodity           TEXT NOT NULL,
            quantity_mt         REAL NOT NULL,
            origin_id           TEXT NOT NULL,
            port_id             TEXT NOT NULL,
            target_month        INTEGER,
            target_year         INTEGER,
            contract_months     INTEGER,
            -- Freight forecast
            current_spot_rate   REAL,
            forecast_rate       REAL,
            upper_95            REAL,
            lower_95            REAL,
            -- Market signal
            market_signal       TEXT,
            signal_confidence   INTEGER,
            -- Vessel
            vessel_type         TEXT,
            vessel_dwt          INTEGER,
            vessel_cii_grade    TEXT,
            cost_per_tonne      REAL,
            total_voyage_cost   REAL,
            -- Savings
            total_saving_usd    REAL,
            total_saving_inr    REAL,
            usd_inr_rate        REAL,
            -- Risk
            risk_level          TEXT,
            risk_score          INTEGER,
            -- Contract
            contract_type       TEXT,
            contract_rate       REAL,
            -- Full JSON snapshot
            full_result_json    TEXT,
            created_at          TEXT DEFAULT (datetime('now'))
        );

        -- ── 3. Voyage Disruptions ──────────────────────────────────────
        CREATE TABLE IF NOT EXISTS voyage_disruptions (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_result_id  INTEGER REFERENCES analysis_results(id),
            origin_id           TEXT NOT NULL,
            port_id             TEXT NOT NULL,
            commodity           TEXT,
            quantity_mt         REAL,
            target_month        INTEGER,
            worst_case_inr      REAL,
            ai_saving_inr       REAL,
            weather_delay_days  REAL,
            seasonal_delay_days REAL,
            technical_delay_days REAL,
            full_result_json    TEXT,
            created_at          TEXT DEFAULT (datetime('now'))
        );

        -- ── 4. BDI Snapshots ───────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS bdi_snapshots (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            date        TEXT NOT NULL UNIQUE,
            bdi_value   REAL NOT NULL,
            source      TEXT DEFAULT 'synthetic',
            recorded_at TEXT DEFAULT (datetime('now'))
        );

        -- ── 5. Port Congestion Records ─────────────────────────────────
        CREATE TABLE IF NOT EXISTS port_congestion (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            port_id             TEXT NOT NULL,
            port_name           TEXT,
            month               INTEGER,
            year                INTEGER,
            utilisation_pct     INTEGER,
            avg_wait_days       REAL,
            vessels_at_anchor   INTEGER,
            congestion_level    TEXT,
            delay_cost_inr      REAL,
            recorded_at         TEXT DEFAULT (datetime('now'))
        );

        -- ── Indexes ────────────────────────────────────────────────────
        CREATE INDEX IF NOT EXISTS idx_analysis_created    ON analysis_results(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_analysis_origin     ON analysis_results(origin_id, port_id);
        CREATE INDEX IF NOT EXISTS idx_cargo_upload        ON cargo_datasets(uploaded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_bdi_date            ON bdi_snapshots(date DESC);
        CREATE INDEX IF NOT EXISTS idx_congestion_port     ON port_congestion(port_id, month, year);
        """)
        conn.commit()
    finally:
        conn.close()


# ── Helper: row → dict ────────────────────────────────────────────────────────
def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


# ── Cargo Dataset operations ──────────────────────────────────────────────────

def save_cargo_dataset(upload_name: str, rows: list[dict]) -> list[int]:
    """Save all rows from an uploaded file. Returns list of inserted IDs."""
    conn = get_conn()
    ids  = []
    try:
        for row in rows:
            cur = conn.execute("""
                INSERT INTO cargo_datasets
                  (upload_name, row_id, commodity, quantity_mt, origin_id, port_id,
                   target_month, target_year, contract_months, raw_json)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, (
                upload_name,
                row.get('__id', 0),
                row.get('commodity', ''),
                row.get('quantity_mt', 0),
                row.get('origin_id', ''),
                row.get('port_id', ''),
                row.get('target_month'),
                row.get('target_year'),
                row.get('contract_months'),
                json.dumps(row),
            ))
            ids.append(cur.lastrowid)
        conn.commit()
    finally:
        conn.close()
    return ids


def get_cargo_datasets(limit: int = 50) -> list[dict]:
    """Return recent uploaded cargo datasets."""
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT * FROM cargo_datasets
            ORDER BY uploaded_at DESC LIMIT ?
        """, (limit,)).fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        conn.close()


# ── Analysis Result operations ────────────────────────────────────────────────

def save_analysis_result(request_data: dict, result: dict,
                          cargo_dataset_id: int | None = None) -> int:
    """Persist a /api/analyze result to the database."""
    fc  = result.get('freight_forecast',        {})
    sig = result.get('market_signal',            {})
    ves = result.get('vessel_recommendation',    {})
    sav = result.get('savings_opportunity',      {})
    rsk = result.get('risk_assessment',          {})
    con = result.get('contract_recommendation',  {})
    eco = result.get('economic_snapshot',        {})

    conn = get_conn()
    try:
        cur = conn.execute("""
            INSERT INTO analysis_results (
                cargo_dataset_id, commodity, quantity_mt, origin_id, port_id,
                target_month, target_year, contract_months,
                current_spot_rate, forecast_rate, upper_95, lower_95,
                market_signal, signal_confidence,
                vessel_type, vessel_dwt, vessel_cii_grade, cost_per_tonne, total_voyage_cost,
                total_saving_usd, total_saving_inr, usd_inr_rate,
                risk_level, risk_score,
                contract_type, contract_rate,
                full_result_json
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            cargo_dataset_id,
            request_data.get('commodity', ''),
            request_data.get('quantity_mt', 0),
            request_data.get('origin_id', ''),
            request_data.get('port_id', ''),
            request_data.get('target_month'),
            request_data.get('target_year'),
            request_data.get('contract_months'),
            fc.get('current_spot_rate'),
            fc.get('forecast_rate'),
            fc.get('upper_95'),
            fc.get('lower_95'),
            sig.get('signal'),
            sig.get('confidence'),
            ves.get('vessel_type'),
            ves.get('dwt'),
            ves.get('cii_grade'),
            ves.get('cost_per_tonne'),
            ves.get('total_voyage_cost_usd'),
            sav.get('total_saving_usd'),
            sav.get('total_saving_inr'),
            eco.get('usd_inr'),
            rsk.get('level'),
            rsk.get('overall_score'),
            con.get('recommended_type'),
            con.get('recommended_rate'),
            json.dumps(result),
        ))
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_analysis_history(limit: int = 20) -> list[dict]:
    """Return recent analysis results (without the large JSON blob)."""
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT id, commodity, quantity_mt, origin_id, port_id,
                   target_month, target_year, contract_months,
                   current_spot_rate, forecast_rate,
                   market_signal, signal_confidence,
                   vessel_type, vessel_cii_grade, cost_per_tonne,
                   total_saving_usd, total_saving_inr, usd_inr_rate,
                   risk_level, risk_score,
                   contract_type, contract_rate,
                   created_at
            FROM analysis_results
            ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        conn.close()


def get_analysis_by_id(result_id: int) -> dict | None:
    """Return a full analysis result including JSON."""
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM analysis_results WHERE id=?", (result_id,)
        ).fetchone()
        if not row: return None
        d = row_to_dict(row)
        if d.get('full_result_json'):
            d['full_result'] = json.loads(d['full_result_json'])
        return d
    finally:
        conn.close()


# ── Voyage Disruption operations ──────────────────────────────────────────────

def save_voyage_disruption(request_data: dict, result: dict,
                            analysis_result_id: int | None = None) -> int:
    wc = result.get('worst_case', {})
    ai = result.get('ai_optimum', {})
    sc = result.get('scenarios', [])
    weather   = next((s for s in sc if s['type'] == 'weather'),  {})
    seasonal  = next((s for s in sc if s['type'] == 'seasonal'), {})
    technical = next((s for s in sc if s['type'] == 'technical'),{})

    conn = get_conn()
    try:
        cur = conn.execute("""
            INSERT INTO voyage_disruptions (
                analysis_result_id, origin_id, port_id, commodity, quantity_mt,
                target_month, worst_case_inr, ai_saving_inr,
                weather_delay_days, seasonal_delay_days, technical_delay_days,
                full_result_json
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            analysis_result_id,
            request_data.get('origin_id', ''),
            request_data.get('port_id', ''),
            request_data.get('commodity', ''),
            request_data.get('quantity_mt', 0),
            request_data.get('target_month'),
            wc.get('total_extra_inr'),
            ai.get('total_saving_inr'),
            weather.get('impact', {}).get('delay_days'),
            seasonal.get('impact', {}).get('delay_days'),
            technical.get('impact', {}).get('delay_days'),
            json.dumps(result),
        ))
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_disruption_history(limit: int = 20) -> list[dict]:
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT id, origin_id, port_id, commodity, quantity_mt, target_month,
                   worst_case_inr, ai_saving_inr,
                   weather_delay_days, seasonal_delay_days, technical_delay_days,
                   created_at
            FROM voyage_disruptions ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        conn.close()


# ── BDI Snapshot operations ───────────────────────────────────────────────────

def upsert_bdi_snapshot(date_str: str, bdi_value: float, source: str = 'synthetic') -> None:
    conn = get_conn()
    try:
        conn.execute("""
            INSERT INTO bdi_snapshots (date, bdi_value, source)
            VALUES (?,?,?)
            ON CONFLICT(date) DO UPDATE SET bdi_value=excluded.bdi_value, source=excluded.source
        """, (date_str, bdi_value, source))
        conn.commit()
    finally:
        conn.close()


def get_bdi_history_db(days: int = 90) -> list[dict]:
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT date, bdi_value, source FROM bdi_snapshots
            ORDER BY date DESC LIMIT ?
        """, (days,)).fetchall()
        return list(reversed([row_to_dict(r) for r in rows]))
    finally:
        conn.close()


# ── Port Congestion operations ────────────────────────────────────────────────

def save_port_congestion_batch(reports: list[dict], month: int, year: int = 2026) -> None:
    conn = get_conn()
    try:
        for r in reports:
            cong = r.get('congestion', {})
            conn.execute("""
                INSERT INTO port_congestion
                  (port_id, port_name, month, year, utilisation_pct,
                   avg_wait_days, vessels_at_anchor, congestion_level, delay_cost_inr)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (
                r.get('port_id'),
                r.get('port_name'),
                month, year,
                cong.get('utilisation_pct'),
                cong.get('avg_wait_days'),
                cong.get('vessels_waiting'),
                cong.get('level'),
                r.get('delay_cost_inr'),
            ))
        conn.commit()
    finally:
        conn.close()


def get_port_congestion_history(port_id: str, limit: int = 12) -> list[dict]:
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT * FROM port_congestion
            WHERE port_id=? ORDER BY recorded_at DESC LIMIT ?
        """, (port_id, limit)).fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        conn.close()


# ── Database statistics ───────────────────────────────────────────────────────

def get_db_stats() -> dict:
    conn = get_conn()
    try:
        stats = {}
        for table in ['cargo_datasets','analysis_results','voyage_disruptions',
                       'bdi_snapshots','port_congestion']:
            row = conn.execute(f"SELECT COUNT(*) as cnt FROM {table}").fetchone()
            stats[table] = row['cnt']
        # Latest analysis
        latest = conn.execute("""
            SELECT commodity, origin_id, port_id, created_at
            FROM analysis_results ORDER BY created_at DESC LIMIT 1
        """).fetchone()
        stats['latest_analysis'] = row_to_dict(latest) if latest else None
        stats['db_path'] = str(DB_PATH)
        stats['db_size_kb'] = round(os.path.getsize(DB_PATH) / 1024, 1) if DB_PATH.exists() else 0
        return stats
    finally:
        conn.close()


# Initialise on import
init_db()
