# FreightIQ — SIH26006 System Flowchart

## Complete MVP Workflow

```mermaid
flowchart TD
    %% ─── USER INPUT ───────────────────────────────────────────────
    A([👤 Logistics Manager]) --> B[/Input Form\]
    B --> B1[Commodity: Coal]
    B --> B2[Quantity: 80,000 MT]
    B --> B3[Origin: Australia]
    B --> B4[Destination: Paradip]
    B --> B5[Period: November 2026]
    B --> B6[Contract: 3–6 months]

    B1 & B2 & B3 & B4 & B5 & B6 --> C{POST /api/analyze}

    %% ─── BACKEND ENGINES ──────────────────────────────────────────
    C --> D1[Dataset Layer]
    D1 --> D1a[Dataset 1: Freight Rates\nBDI-correlated, route-level $/MT]
    D1 --> D1b[Dataset 2: Commodity Prices\nFOB prices per origin]
    D1 --> D1c[Dataset 3+4: Port Data + Congestion\nDraft, LOA, berths, utilisation]
    D1 --> D1d[Dataset 5: Vessel Data\nDWT, speed, hire, fuel, draft]
    D1 --> D1e[Dataset 6: Economic Indicators\nUSD/INR, IIP, GDP, Steel output]
    D1 --> D1f[Dataset 7: Seasonal Factors\nMonsoon, peak demand, holidays]
    D1 --> D1g[Dataset 8: Route Data\nDistance NM, sailing days, chokepoints]

    D1a & D1f & D1e --> E1[⚙️ Engine 1: Freight Forecast\nBase rate × Seasonal mult × Market mult\nGARCH-based confidence band]
    E1 --> E2[⚙️ Engine 2: Market Signal\nTrend + Volatility → BUY NOW/WAIT/CAUTION]
    D1d & D1c & D1g --> E3[⚙️ Engine 3: Vessel Optimizer\nDraft check → Cost score → CII grade]
    D1c --> E4[⚙️ Engine 4: Port Compatibility\nDraft, LOA, commodity, lightering check]
    E1 & E2 & E3 --> E5[⚙️ Engine 5: Contract Recommender\nSpot vs 3-Voyage CoA vs 6-Month CoA]
    D1f & D1g --> E6[⚙️ Engine 6: Risk Assessment\n4 pillars × weights → VaR 95%]
    E5 & E3 --> E7[💰 Savings Calculator\nContract saving + Vessel optimisation\nUSD → INR conversion]

    %% ─── API RESPONSE ────────────────────────────────────────────
    E1 & E2 & E3 & E4 & E5 & E6 & E7 --> F{JSON Response}

    %% ─── FRONTEND OUTPUT ─────────────────────────────────────────
    F --> G1[📈 Forecast Card\nCurrent: $12.98/MT\nForecast: $12.72/MT\n95% band chart]
    F --> G2[🎯 Signal Card\nBUY NOW — 80% confidence\nPost-monsoon peak demand]
    F --> G3[🚢 Vessel Card\nKamsarmax · 82,000 DWT\n1 voyage · CII Grade C]
    F --> G4[⚓ Port Card\nParadip — COMPATIBLE ✓\nDraft OK · 12 berths · Med congestion]
    F --> G5[📄 Contract Card\n6-Month CoA @ $11.55/MT\nSaving $685,344 vs spot]
    F --> G6[⚠️ Risk Card\nLOW · Score 28/100\nVaR 95%: $347,000]
    F --> G7[💰 Savings Banner\n₹620.7 Lakhs total saving\n$9.21 saved per tonne]

    G1 & G2 & G3 & G4 & G5 & G6 & G7 --> H([📊 Dashboard Display])
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  ┌──────────────┐   ┌──────────────────────────────────────┐ │
│  │  InputForm   │   │           ResultsPanel               │ │
│  │              │   │  ┌──────────┐  ┌──────────┐          │ │
│  │  Commodity   │──▶│  │Forecast  │  │ Signal   │          │ │
│  │  Quantity    │   │  │  Card    │  │  Card    │          │ │
│  │  Origin      │   │  ├──────────┤  ├──────────┤          │ │
│  │  Port        │   │  │ Vessel   │  │  Port    │          │ │
│  │  Period      │   │  │  Card    │  │  Card    │          │ │
│  │  Contract    │   │  ├──────────┤  ├──────────┤          │ │
│  └──────────────┘   │  │Contract  │  │  Risk    │          │ │
│                     │  │  Card    │  │  Card    │          │ │
│                     │  └──────────┴──┴──────────┘          │ │
│                     │  ┌────────────────────────┐           │ │
│                     │  │     Savings Banner     │           │ │
│                     │  └────────────────────────┘           │ │
│                     └──────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────┘
                                │ POST /api/analyze
┌───────────────────────────────▼─────────────────────────────┐
│                 BACKEND (FastAPI + Python)                    │
│                                                              │
│  ┌─────────────┐   ┌──────────────────────────────────────┐ │
│  │ Dataset     │   │         analyze_engine.py            │ │
│  │ Layer       │   │                                      │ │
│  │             │──▶│  _forecast_freight()   → rates       │ │
│  │ Freight     │   │  _market_signal()      → BUY/WAIT   │ │
│  │ Rates       │   │  _recommend_vessel()   → Kamsarmax  │ │
│  │ Ports       │   │  _port_compatibility() → COMPATIBLE │ │
│  │ Vessels     │   │  _contract_rec()       → 6M CoA     │ │
│  │ Economic    │   │  _risk_assessment()    → LOW        │ │
│  │ Seasonal    │   │  _savings_opportunity()→ ₹620L      │ │
│  │ Routes      │   │                                      │ │
│  └─────────────┘   └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow for MVP Example

| Input | Value |
|-------|-------|
| Commodity | Thermal Coal |
| Quantity | 80,000 MT |
| Origin | Australia |
| Destination | Paradip |
| Period | November 2026 |
| Contract | 6 months |

| Output | Result |
|--------|--------|
| 📈 Freight Forecast | $12.98/MT current → $12.72/MT Nov 2026 |
| 🎯 Market Signal | **BUY NOW** (80% confidence) |
| 🚢 Vessel | **Kamsarmax** 82,000 DWT · 1 voyage · CII-C |
| ⚓ Port Compat. | **COMPATIBLE** · Draft 13.8m ≤ 17.0m |
| 📄 Contract | **6-Month CoA** @ $11.55/MT (-11% vs spot) |
| ⚠️ Risk | **LOW** · Score 28/100 |
| 💰 Savings | **₹620.7 Lakhs** ($737,152 USD) |
