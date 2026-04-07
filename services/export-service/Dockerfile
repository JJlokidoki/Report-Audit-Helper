FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libreoffice-writer \
       weasyprint \
       nodejs npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Node.js renderer: install + build
COPY renderer/package.json renderer/package-lock.json renderer/
RUN cd renderer && npm ci --ignore-scripts
COPY renderer/ renderer/
RUN cd renderer && npx tsc

COPY . .

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
