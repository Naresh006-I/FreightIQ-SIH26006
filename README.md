# 🌊 FreightIQ — SIH 2026 · Problem SIH26006

> **Intelligent Freight Forecasting & Optimized Vessel Chartering Platform**  
> Ministry of Steel · Smart India Hackathon 2026

---

## 🎯 Problem Statement

**SIH26006** — Development of an Intelligent Freight Forecasting Model for Optimized Vessel Chartering and Bulk Cargo Procurement from overseas to East Coast of India.

Current process relies on reactive daily spot-market monitoring. FreightIQ shifts logistics managers from reactive spot procurement to **data-driven multi-voyage chartering**.

---

## ✨ MVP Workflow

Enter one form → get 6 AI-powered outputs instantly:

| Input | Example |
|-------|---------|
| Commodity | Thermal Coal |
| Quantity | 80,000 MT |
| Origin | Australia |
| Destination | Paradip |
| Period | November 2026 |
| Contract | 6 months |

| Output | Result |
|--------|--------|
| 📈 Freight Forecast | $12.98/MT → $12.72/MT (Nov 2026) |
| 🎯 Market Signal | **BUY NOW** — 80% confidence |
| 🚢 Vessel Recommendation | **Kamsarmax** 82,000 DWT · CII-C |
| ⚓ Port Compatibility | **COMPATIBLE** — Paradip ✓ |
| 📄 Contract Recommendation | **6-Month CoA** @ $11.55/MT |
| ⚠️ Risk Level | **LOW** — Score 28/100 |
| 💰 Estimated Savings | **₹620.7 Lakhs** ($737,152 USD) |

---

## 🏗️ Architecture

```
FreightIQ/
├── backend/                  # FastAPI + Python
│   ├── app/
│   │   ├── api/              # 7 API route modules
│   │   │   ├── analyze.py    # ⭐ Master MVP endpoint
│   │   │   ├── dashboard.py
│   │   │   ├── forecast.py
│   │   │   ├── vessels.py
│   │   │   ├── arbitrage.py
│   │   │   ├── risk.py
│   │   │   └── scheduler.py
│   │   ├── services/         # AI/ML engines
│   │   │   ├── analyze_engine.py   # 6 engines in one
│   │   │   ├── forecast_engine.py  # GARCH + Holt's
│   │   │   ├── vessel_optimizer.py # Draft/CII/lightering
│   │   │   ├── arbitrage.py        # 5-origin landed cost
│   │   │   ├── risk_engine.py      # 4-pillar VaR
│   │   │   └── scheduler.py        # Voyage planner
│   │   └── data/
│   │       ├── datasets.py   # All 8 dataset types
│   │       └── seed_data.py  # Synthetic market data
│   ├── requirements.txt
│   └── run.py
│
├── frontend/                 # React 18 + Vite + Tailwind
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── InputForm.jsx
│       │   ├── ResultsPanel.jsx
│       │   └── cards/
│       │       ├── ForecastCard.jsx
│       │       ├── SignalCard.jsx
│       │       ├── VesselCard.jsx
│       │       ├── PortCard.jsx
│       │       ├── ContractCard.jsx
│       │       ├── RiskCard.jsx
│       │       ├── SavingsCard.jsx
│       │       └── SummaryBanner.jsx
│
├── docs/
│   └── FLOWCHART.md          # System flowchart (Mermaid)
└── start.bat                 # One-click launcher (Windows)
```

---

## 🧠 AI/ML Engines

| Engine | Method | Output |
|--------|--------|--------|
| Freight Forecast | GARCH(1,1) + Holt's Double Exp. Smoothing | Rate $/MT + confidence bands |
| Market Signal | Trend + Volatility scoring | BUY NOW / WAIT / CAUTION |
| Vessel Optimizer | Cost-score + port draft constraint + CII | Vessel type recommendation |
| Port Compatibility | Draft / LOA / commodity / lightering check | Compatible / Incompatible |
| Contract Recommender | Spot vs 3-Voyage vs 6-Month CoA discount | Contract type + savings |
| Risk Assessment | 4-pillar weighted composite + parametric VaR | LOW / MEDIUM / HIGH |

---

## 📊 Dataset Coverage

| # | Dataset | Coverage |
|---|---------|---------|
| 1 | Freight Rates | BDI-correlated route-level $/MT |
| 2 | Commodity Prices | FOB prices (coal, iron ore, limestone, bauxite) |
| 3 | Port Data | 7 East Coast ports — draft, LOA, berths |
| 4 | Port Congestion | Utilisation %, avg wait days, vessels at anchor |
| 5 | Vessel Data | 6 vessel types — DWT, speed, hire, fuel, draft |
| 6 | Economic Data | USD/INR, IIP, GDP, steel output |
| 7 | Seasonal Data | Monsoon, peak demand, holiday factors |
| 8 | Route Data | Distance NM, sailing days, chokepoints |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ 
- Node.js 18+

### Option 1 — Windows one-click
```
Double-click start.bat
```

### Option 2 — Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python run.py
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🔌 Key API Endpoint

```
POST /api/analyze
```

```json
{
  "commodity": "thermal_coal",
  "quantity_mt": 80000,
  "origin_id": "AU",
  "port_id": "INPRD",
  "target_month": 11,
  "target_year": 2026,
  "contract_months": 6
}
```

Returns all 6 outputs in a single response.

---

## 🛳️ Supported Ports (East Coast India)

| Port | State | Max Draft |
|------|-------|-----------|
| Paradip | Odisha | 17.0m |
| Visakhapatnam | Andhra Pradesh | 14.5m |
| Gangavaram | Andhra Pradesh | 18.0m |
| Gopalpur | Odisha | 12.5m |
| Dhamra | Odisha | 16.5m |
| Sagar-Sandheads | West Bengal | 16.0m |
| Haldia | West Bengal | 8.5m |

---

## 👥 Team

Built for **Smart India Hackathon 2026** · Problem SIH26006  
Ministry of Steel · Transportation & Logistics Theme

---

## 📄 License

MIT — open for everyone to use, learn from, and build upon.
