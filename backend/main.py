"""
CFBC WECKLY — FastAPI Backend
Serves data from data_extractor.py as JSON API endpoints
and serves the Angular frontend static files.
"""
import json
import os
import sys
import math
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

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

app = FastAPI(title="CFBC WECKLY API", version="1.0.0")

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
        return FileResponse(str(STATIC_DIR / "index.html"))

    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        # For SPA routing, serve index.html for non-API routes
        path = request.url.path
        if not path.startswith("/api/"):
            return FileResponse(str(STATIC_DIR / "index.html"))
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
        _data_cache = _sanitize(raw)
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
