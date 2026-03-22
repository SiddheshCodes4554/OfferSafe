# Use an official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OCR and PDF processing
# - tesseract-ocr: Required for pytesseract
# - poppler-utils: Required for pdf2image
# - git: Required in case Git LFS isn't fully pulled yet, and for standard pip installs
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy local code to the container
COPY . ./

# Install python dependencies.
# We skip the specific torch CUDA dependencies if it's CPU-only on Render, 
# but requirements.txt will handle it fine.
RUN pip install --no-cache-dir -r requirements.txt

# Run the web service on port 10000 (Render's default PORT or custom)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "10000"]
