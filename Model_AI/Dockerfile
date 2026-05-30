# Gunakan image Python 3.10 slim yang ringan
FROM python:3.10-slim

# Set environment variable untuk Python agar output log langsung muncul (tidak di-buffer)
ENV PYTHONUNBUFFERED=1

# Buat direktori kerja di dalam container
WORKDIR /app

# Copy requirement list terlebih dahulu agar Docker bisa memanfaatkan cache
COPY requirements.txt .

# Install dependencies sistem yang mungkin dibutuhkan, lalu install library Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy seluruh file AI Service ke dalam container
COPY . .

# Ekspos port 8000
EXPOSE 8000

# Jalankan server FastAPI menggunakan uvicorn
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
