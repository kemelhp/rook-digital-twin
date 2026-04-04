# CLAUDE.md - Project Guide

## Project Overview

**Locomotive Digital Twin** - a full-stack hackathon prototype for real-time locomotive telemetry visualization with a Health Index dashboard. The system simulates telemetry for two locomotive types (KZ8A electric, TE33A diesel) and provides a unified monitoring interface.

## Tech Stack

- **Backend:** Python 3.12+ / FastAPI / SQLAlchemy (async) / Pydantic v2
- **Database:** TimescaleDB (PostgreSQL 16 with hypertables) for time-series history
- **Frontend:** Next.js 14 (App Router) / React / TypeScript / Recharts / Tailwind CSS / shadcn/ui
- **Real-time:** WebSocket (`/ws/telemetry`) with heartbeat, 1-100 Hz frequency
- **Infra:** Docker Compose (3 services: db, api, web)

## Architecture

```
Simulator → generates TelemetryFrame every tick
         → HealthEngine computes HealthIndex (0-100, A-E)
         → AlertEngine detects threshold violations
         → WebSocket sends {telemetry, health, alerts} to frontend
         → Every 5th frame persists to TimescaleDB
```

### Key Directories

```
app/
  models/         # Pydantic schemas: telemetry.py, health_index.py, alerts.py, locomotive.py
  services/       # simulator.py, health_engine.py, alert_engine.py, buffer.py, timeseries_store.py
  routers/        # FastAPI endpoints: websocket.py, health.py, history.py, alerts_router.py, export.py, config_api.py
  storage/        # In-memory ring buffer (time_series.py) for live data
  db/             # SQLAlchemy models + async repository
  auth/           # Session-based auth (session_auth.py) + basic auth
config/
  thresholds.yaml # Health index weights, alert thresholds (hot-reloadable via API)
web-app/
  app/dashboard/  # Main dashboard page + charts
  lib/            # API client, config, server-auth
```

## Development Commands

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd web-app && npm install && npm run dev

# Docker (full stack)
docker-compose up --build

# Tests
python -m pytest tests/ -v
```

## API Endpoints

- `ws://localhost:8000/ws/telemetry?loco_type=TE33A&scenario=normal&frequency=1.0&loco_id=TE33A-001`
- `GET /api/healthcheck`
- `GET /api/locomotive/profiles` - KZ8A/TE33A specs
- `GET /api/locomotives` - registered locomotive units
- `GET /api/health?loco_id=X` - current health (in-memory)
- `GET /api/health/history?loco_id=X` - health history (TimescaleDB)
- `GET /api/telemetry/history?loco_id=X`
- `GET /api/telemetry/replay?loco_id=X&minutes=5`
- `GET /api/alerts?loco_id=X` - active alerts (in-memory)
- `GET /api/alerts/history?loco_id=X` - alert history (PostgreSQL)
- `GET /api/export?loco_id=X&format=csv&minutes=15` - CSV/JSON export
- `GET/PUT /api/config/thresholds` - threshold config (requires staff auth)
- `GET /docs` - Swagger UI

## Two Locomotive Types

**TE33A (diesel):** fuel_level, fuel_consumption, engine_rpm, turbo_rpm, oil_temp/pressure, coolant_temp, exhaust_temp, battery_voltage (6 axes)
**KZ8A (electric):** catenary_voltage, dc_bus_voltage, traction_power, regen_power, igbt_current, transformer_temp, battery_voltage (8 axes)

Both share: speed, tractive_effort, motor_current, brake pressures, motor_temps, bearing_temps, fan_statuses, GPS navigation.

## Health Index Formula

```
index = sum(weight_group * score_group) - alert_penalty

Weights: traction=0.30, resources=0.25, nodes=0.25, brakes=0.15
Penalties: info=-2, warning=-5, critical=-15
Grades: A(80-100), B(60-79), C(40-59), D(20-39), E(0-19)
```

## Simulator Scenarios

`normal`, `acceleration`, `braking`, `overheat`, `fuel_low` (TE33A), `voltage_drop` (KZ8A), `emergency`, `highload` (x10 events/sec)

Switch via WS message: `{"scenario": "emergency"}`

## Auth

Session-based authentication with cookie `rook_session`. Default users bootstrapped on startup:
- admin@rook.local / ChangeMe123! (admin role)
- staff@rook.local / ChangeMe123! (staff role)

## Important Notes

- The `TelemetryFrame` TypeScript type in `web-app/lib/api.ts` uses optional fields for resources since KZ8A and TE33A have different resource schemas
- Dashboard currently defaults to TE33A-001 and hardcodes TE33A-specific fields in cards
- Thresholds are defined in `config/thresholds.yaml` and can be changed at runtime via REST API without restart
- In-memory storage keeps 72h of data; TimescaleDB persists for long-term history
- WebSocket sends heartbeat ping every 15 seconds
