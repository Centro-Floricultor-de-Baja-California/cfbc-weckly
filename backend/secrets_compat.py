"""
Secrets Compatibility Layer

Replaces `st.secrets` from Streamlit with environment variables
for the Docker/FastAPI deployment. Falls back to reading
.streamlit/secrets.toml if env vars are not set.

Usage:
    import secrets_compat  # auto-patches on import
    from data_extractor import get_datos
"""

import os
import sys
import re
from pathlib import Path

ENV_MAP = {
    "urls": {
        "SHAREPOINT_URL_WK": "SHAREPOINT_URL_WK",
        "SHAREPOINT_URL_PR": "SHAREPOINT_URL_PR",
        "SHAREPOINT_URL_CONTEO": "SHAREPOINT_URL_CONTEO",
        "SHAREPOINT_URL_CONTEO_MARLEN": "SHAREPOINT_URL_CONTEO_MARLEN",
        "SHAREPOINT_URL_NOMINA": "SHAREPOINT_URL_NOMINA",
        "SHAREPOINT_URL_SIEMBRA_DETALLE": "SHAREPOINT_URL_SIEMBRA_DETALLE",
        "SHAREPOINT_URL_WEEKLY": "SHAREPOINT_URL_WEEKLY",
        "SHAREPOINT_URL_WEEKLY_2026": "SHAREPOINT_URL_WEEKLY_2026",
        "GOOGLE_DRIVE_URL_TRANSPORTE": "GOOGLE_DRIVE_URL_TRANSPORTE",
    },
    "sharepoint": {
        "tenant_id": "sharepoint__tenant_id",
        "client_id": "sharepoint__client_id",
        "client_secret": "sharepoint__client_secret",
    },
}

# Reverse map: env var name -> (section, key)
ENV_TO_TOML = {}
for section, mapping in ENV_MAP.items():
    for key, env_name in mapping.items():
        ENV_TO_TOML[env_name] = (section, key)


def _find_secrets_toml() -> dict:
    """Try to read .streamlit/secrets.toml and return as flat dict {ENV_NAME: value}."""
    # Look in project root and parent directories
    search_dirs = [
        Path.cwd(),
        Path(__file__).parent.parent,  # project root
        Path(__file__).parent,         # backend/
    ]
    for d in search_dirs:
        toml_path = d / ".streamlit" / "secrets.toml"
        alt_path = d.parent / ".streamlit" / "secrets.toml"
        for p in [toml_path, alt_path]:
            if p.exists():
                print(f"[secrets_compat] Found secrets.toml at {p}")
                return _parse_toml_simple(p)
    print("[secrets_compat] No secrets.toml found, using only env vars")
    return {}


def _parse_toml_simple(path: Path) -> dict:
    """Simple TOML parser for the secrets format."""
    result = {}
    current_section = None
    content = path.read_text(encoding="utf-8")
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Section header [section]
        m = re.match(r'^\[([^\]]+)\]$', line)
        if m:
            current_section = m.group(1)
            continue
        # key = "value" or key = 'value'
        m = re.match(r'^([^=]+)=\s*"([^"]*)"\s*$', line)
        if not m:
            m = re.match(r"^([^=]+)=\s*'([^']*)'\s*$", line)
        if m:
            key = m.group(1).strip()
            value = m.group(2).strip()
            if current_section:
                # Map to expected env var name
                section_map = ENV_MAP.get(current_section, {})
                env_name = section_map.get(key)
                if env_name:
                    result[env_name] = value
                    print(f"[secrets_compat]   {env_name} = '{value[:20]}...'")
    return result


class SecretsMock:
    """Mock object that replaces st.secrets with environment variables."""

    def __init__(self):
        self._cache = {}
        # Pre-load from toml file
        self._toml_values = _find_secrets_toml()

    def _load_section(self, section_name: str, mapping: dict) -> dict:
        result = {}
        missing = []
        for key, env_name in mapping.items():
            # Priority: 1) env var, 2) toml file
            val = os.environ.get(env_name) or self._toml_values.get(env_name)
            if val:
                result[key] = val
            else:
                missing.append(env_name)
        if missing:
            print(f"[secrets_compat] Missing '{section_name}' keys: {', '.join(missing)}")
        return result

    def __getitem__(self, key: str):
        if key not in self._cache:
            mapping = ENV_MAP.get(key)
            if mapping:
                self._cache[key] = self._load_section(key, mapping)
            else:
                self._cache[key] = {}
        return self._cache[key]

    def get(self, key: str, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def __contains__(self, key: str) -> bool:
        return key in ENV_MAP


def patch_streamlit():
    """Patches `streamlit.secrets` to use env vars / secrets.toml."""
    try:
        import streamlit as st
        if hasattr(st, 'secrets') and st.secrets:
            print("[secrets_compat] Using existing Streamlit secrets")
            return
    except ImportError:
        pass

    class StreamlitMock:
        secrets = SecretsMock()

    sys.modules['streamlit'] = StreamlitMock()
    print("[secrets_compat] Patched streamlit.secrets (env vars + secrets.toml)")


# Auto-patch on import
patch_streamlit()
