# Lentera API image. Built by .github/workflows/api.yml, run on Azure Container Apps.
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never PYTHONUNBUFFERED=1
# One thread per vCPU of the Container App (1): OpenMP (LightGBM) and OpenBLAS (numpy) otherwise start one spinning
# thread per host core under a 1-CPU quota. Raise both together with the vCPU count.
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1

WORKDIR /app
# LightGBM needs the OpenMP runtime, which the slim image does not ship.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
# Dependencies first so code changes reuse the cached layer.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project
COPY app ./app
COPY artifacts ./artifacts

RUN useradd --system --uid 1001 lentera
USER lentera
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
# One worker: the model and the per-cohort plan cache live in process memory.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
