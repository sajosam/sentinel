FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    tar \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Gitleaks (multi-arch for Apple Silicon arm64 & Intel/AMD x86_64)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then GL_ARCH="x64"; elif [ "$ARCH" = "aarch64" ]; then GL_ARCH="arm64"; else GL_ARCH="x64"; fi && \
    curl -sSL "https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_${GL_ARCH}.tar.gz" -o gitleaks.tar.gz && \
    tar -xzf gitleaks.tar.gz gitleaks && \
    mv gitleaks /usr/local/bin/ && \
    chmod +x /usr/local/bin/gitleaks && \
    rm gitleaks.tar.gz

# Install OSV-Scanner (multi-arch for arm64 & amd64)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then OSV_ARCH="amd64"; elif [ "$ARCH" = "aarch64" ]; then OSV_ARCH="arm64"; else OSV_ARCH="amd64"; fi && \
    curl -sSL "https://github.com/google/osv-scanner/releases/download/v1.7.4/osv-scanner_linux_${OSV_ARCH}" -o /usr/local/bin/osv-scanner && \
    chmod +x /usr/local/bin/osv-scanner

# Install Python requirements and Semgrep SAST engine
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt semgrep

# Copy backend application source
COPY . .

ENV HOST=0.0.0.0
ENV PORT=8000
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["python", "run.py"]
