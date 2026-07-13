# ═══════════════════════════════════════════════════════════════
# STAGE 1: Build Angular Frontend
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package.json ./
# Note: package-lock.json is optional (can be generated from npm install)
RUN npm install --legacy-peer-deps

# Copy all frontend source files
COPY frontend/ ./

# Build Angular app for production
RUN npx ng build --configuration production --deploy-url /static/

# ═══════════════════════════════════════════════════════════════
# STAGE 2: Python Backend + Serve
# ═══════════════════════════════════════════════════════════════
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY data_extractor.py ./data_extractor.py

# Copy built Angular app
COPY --from=frontend-builder /app/frontend/dist/cfbc-frontend/browser/ ./static/

# Create empty secrets placeholder (actual secrets come from env vars via secrets_compat)
RUN mkdir -p /app/backend/.streamlit && echo "# Secrets are loaded from environment variables" > /app/backend/.streamlit/secrets.toml

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Command: run the FastAPI server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
