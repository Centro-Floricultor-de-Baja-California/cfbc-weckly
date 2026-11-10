"""
CFBC WECKLY — FastAPI Backend
Serves data from data_extractor.py as JSON API endpoints
and serves the Angular frontend static files.
"""
import json
import hmac
import os
import secrets
import sys
import math
import time
from typing import Optional
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

class SafeJSONResponse(JSONResponse):
    def render(self, content: dict) -> bytes:
        return json.dumps(
            _sanitize(content),
            ensure_ascii=True,
            default=str,
        ).encode('utf-8')

# Import secrets compatibility layer BEFORE data_extractor
# This replaces st.secrets with environment variables for Docker/FastAPI
import backend.secrets_compat  # noqa: F401

# Add parent dir for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_extractor import get_datos
from backend.headcount_upload import (
    add_dashboard_headcounts,
    parse_personnel_amount_comparison,
    parse_personnel_workbook,
    save_personnel_week,
)

app = FastAPI(title="CFBC WECKLY API", version="1.0.0")
_admin_sessions: dict[str, float] = {}
_admin_session_ttl = 30 * 60


class AdminAuthRequest(BaseModel):
    password: str


def _configured_admin_password() -> Optional[str]:
    password = os.environ.get("CFBC_ADMIN_PASSWORD")
    if password:
        return password
    try:
        import streamlit as st
        return st.secrets.get("admin", {}).get("password")
    except (ImportError, AttributeError, KeyError, TypeError):
        return None


async def _require_admin_session(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
) -> None:
    expires_at = _admin_sessions.get(x_admin_token or "")
    if expires_at is None or expires_at <= time.monotonic():
        _admin_sessions.pop(x_admin_token or "", None)
        raise HTTPException(status_code=401, detail="La sesión administrativa venció. Ingresa la contraseña nuevamente.")


@app.post("/api/admin/auth")
async def authenticate_admin(request: AdminAuthRequest):
    expected_password = _configured_admin_password()
    if not expected_password:
        raise HTTPException(status_code=503, detail="La contraseña administrativa no está configurada en el servidor.")
    if not hmac.compare_digest(request.password, expected_password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta. Intenta nuevamente.")

    now = time.monotonic()
    for token, expires_at in list(_admin_sessions.items()):
        if expires_at <= now:
            _admin_sessions.pop(token, None)
    token = secrets.token_urlsafe(32)
    _admin_sessions[token] = now + _admin_session_ttl
    return {"token": token, "expires_in": _admin_session_ttl}


@app.post("/api/admin/logout", dependencies=[Depends(_require_admin_session)])
async def logout_admin(x_admin_token: str = Header(alias="X-Admin-Token")):
    _admin_sessions.pop(x_admin_token, None)
    return {"status": "Sesión administrativa cerrada."}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve Angular static files ──────────────────────────
STATIC_DIR = Path(__file__).parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(
            str(STATIC_DIR / "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
        )

    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        # For SPA routing, serve index.html for non-API routes
        path = request.url.path
        if not path.startswith("/api/"):
            return FileResponse(
                str(STATIC_DIR / "index.html"),
                headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
            )
        return JSONResponse(content={"error": "Not found"}, status_code=404)


# ── Cache ────────────────────────────────────────────────
_data_cache: Optional[dict] = None


import numpy as np

def _sanitize(obj):
    """Recursively convert non-JSON-serializable types for valid JSON."""
    if isinstance(obj, float):
        return 0 if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        v = float(obj)
        return 0 if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, (np.ndarray,)):
        return _sanitize(obj.tolist())
    if isinstance(obj, (bytes,)):
        return obj.decode('utf-8', errors='replace')
    return obj


def _load_data() -> dict:
    global _data_cache
    if _data_cache is None:
        raw = get_datos()
        if "error" in raw:
            raise RuntimeError(raw["error"])
        loaded = _sanitize(raw)
        try:
            add_dashboard_headcounts(loaded)
        except Exception as exc:
            print(f"[WARN] Conteos semanales no disponibles ({type(exc).__name__}).")
        _data_cache = loaded
    return _data_cache


@app.on_event("startup")
async def startup():
    """Startup tasks — cache loads lazily on first API call."""
    print("[OK] Server started. Data will load on first API request.")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/data")
async def get_all_data():
    """Return the full sanitized dataset."""
    return SafeJSONResponse(content=_load_data())


@app.post("/api/reload", dependencies=[Depends(_require_admin_session)])
async def reload_data():
    """Clear the data cache so the next request fetches fresh data."""
    global _data_cache
    _data_cache = None
    return {"status": "Cache cleared."}


@app.post("/api/admin/headcount/upload", dependencies=[Depends(_require_admin_session)])
async def upload_headcount(week_code: str = Form(...), file: UploadFile = File(...)):
    global _data_cache
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Selecciona un archivo Excel .xlsx.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo seleccionado está vacío.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 10 MB.")

    try:
        rows = parse_personnel_workbook(content)
        result = save_personnel_week(week_code, rows)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        print(f"[ERR] Falló la carga del conteo semanal ({type(exc).__name__}).")
        raise HTTPException(status_code=502, detail="No se pudo guardar el conteo en SharePoint. Intenta nuevamente.") from exc

    _data_cache = None
    return result


@app.post("/api/admin/headcount/compare", dependencies=[Depends(_require_admin_session)])
async def compare_headcount_amounts(week_code: str = Form(...), file: UploadFile = File(...)):
    """Read Excel amount totals for a temporary local comparison; never writes to SharePoint."""
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Selecciona un archivo Excel .xlsx.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="El archivo seleccionado está vacío.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 10 MB.")

    try:
        return parse_personnel_amount_comparison(week_code, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/config")
async def get_config():
    data = _load_data()
    return SafeJSONResponse(content={
        "ranch_order": data.get("config", {}).get("ranch_order", []),
        "ranch_colors": data.get("config", {}).get("ranch_colors", {}),
        "categories": data.get("categories", []),
        "years": data.get("years", []),
        "ranches": data.get("ranches", []),
    })


@app.get("/api/summary")
async def get_summary(category: Optional[str] = None, year: Optional[int] = None):
    data = _load_data()
    summary = data.get("summary", {})

    if category:
        summary = {category: summary.get(category, {})}
    if year is not None:
        filtered = {}
        for cat, years in summary.items():
            if year in years:
                filtered.setdefault(cat, {})[year] = years[year]
        summary = filtered

    return SafeJSONResponse(content=summary)


@app.get("/api/weekly-detail")
async def get_weekly_detail(
    category: Optional[str] = None,
    year: Optional[int] = None,
    week: Optional[int] = None,
    from_week: Optional[int] = Query(None, alias="from"),
    to_week: Optional[int] = Query(None, alias="to"),
):
    data = _load_data()
    detail = data.get("weekly_detail", [])

    if category:
        detail = [r for r in detail if r.get("categoria") == category]
    if year is not None:
        detail = [r for r in detail if r.get("year") == year]
    if week is not None:
        detail = [r for r in detail if r.get("week") == week]
    if from_week is not None:
        detail = [r for r in detail if r.get("week", 0) >= from_week]
    if to_week is not None:
        detail = [r for r in detail if r.get("week", 0) <= to_week]

    return SafeJSONResponse(content=detail)


@app.get("/api/servicios")
async def get_servicios(
    year: Optional[int] = None,
    week: Optional[int] = None,
    from_week: Optional[int] = Query(None, alias="from"),
    to_week: Optional[int] = Query(None, alias="to"),
):
    data = _load_data()
    servicios = data.get("servicios_data", [])

    if year is not None:
        servicios = [r for r in servicios if r.get("year") == year]
    if week is not None:
        servicios = [r for r in servicios if r.get("week") == week]
    if from_week is not None:
        servicios = [r for r in servicios if r.get("week", 0) >= from_week]
    if to_week is not None:
        servicios = [r for r in servicios if r.get("week", 0) <= to_week]

    return SafeJSONResponse(content=servicios)


@app.get("/api/mano-obra")
async def get_mano_obra(
    year: Optional[int] = None,
    week: Optional[int] = None,
    from_week: Optional[int] = Query(None, alias="from"),
    to_week: Optional[int] = Query(None, alias="to"),
):
    data = _load_data()
    mo = data.get("mano_obra_data", [])

    if year is not None:
        mo = [r for r in mo if r.get("year") == year]
    if week is not None:
        mo = [r for r in mo if r.get("week") == week]
    if from_week is not None:
        mo = [r for r in mo if r.get("week", 0) >= from_week]
    if to_week is not None:
        mo = [r for r in mo if r.get("week", 0) <= to_week]

    return SafeJSONResponse(content=mo)


@app.get("/api/unit-costs")
async def get_unit_costs():
    data = _load_data()
    return SafeJSONResponse(content=data.get("unit_costs_data", {}))


@app.get("/api/siembra")
async def get_siembra():
    data = _load_data()
    return SafeJSONResponse(content=data.get("siembra_data", {}))


@app.get("/api/productos/{tipo}")
async def get_productos(tipo: str):
    key_map = {"pr": "productos", "mp": "productos_mp", "me": "productos_me", "mv": "productos_mv"}
    key = key_map.get(tipo)
    if not key:
        return SafeJSONResponse(content={"error": f"Unknown type: {tipo}"}, status_code=404)
    data = _load_data()
    return SafeJSONResponse(content=data.get(key, {}))


@app.get("/api/detalle-weekly")
async def get_detalle_weekly():
    data = _load_data()
    return SafeJSONResponse(content=data.get("detalle_weekly", {}))


@app.get("/api/metros-acumulados")
async def get_metros_acumulados():
    data = _load_data()
    return SafeJSONResponse(content=data.get("metros_acumulados", []))


@app.get("/api/plantas-metros")
async def get_plantas_metros():
    data = _load_data()
    return SafeJSONResponse(content=data.get("plantas_metros", []))


@app.get("/api/esquejes")
async def get_esquejes():
    data = _load_data()
    return JSONResponse(content=_sanitize(data.get("esquejes_data", [])))


@app.get("/api/horas-transporte")
async def get_horas_transporte():
    data = _load_data()
    return JSONResponse(content=_sanitize(data.get("horas_transporte", {})))


@app.get("/api/tractores")
async def get_tractores():
    data = _load_data()
    return JSONResponse(content=_sanitize(data.get("tractores", {})))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
