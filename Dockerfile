# =============================================================
# Stage 1: Build Frontend (Vite + React)
# =============================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# =============================================================
# Stage 2: Production Server (FastAPI + Embedded Frontend)
# =============================================================
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, models, and info
COPY backend/ ./backend/

# Copy built frontend from Stage 1 into /app/dist
COPY --from=frontend-builder /app/dist ./dist

WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
