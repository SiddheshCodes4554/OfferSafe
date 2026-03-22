# OfferSafe 🛡️

OfferSafe is an intelligent Offer Letter Authenticator that helps candidates and organizations detect fraudulent job offers. By combining Optical Character Recognition (OCR), Machine Learning (NLP), and domain heuristics, OfferSafe analyzes offer letters and provides a comprehensive trust score to keep job seekers safe from employment scams.

---

## ✨ Features

- **📄 Smart PDF Extraction:** Extracts text directly from uploaded PDF offer letters using Tesseract OCR.
- **🧠 AI Fraud Detection:** Uses a fine-tuned Hugging Face `DistilBERT` model alongside a custom `fake_job` model to classify the text and generate a Trust Score (0-100%).
- **🚩 Red Flag Keyword Scanner:** Automatically scans for suspicious phrases common in employment scams (e.g., "wire transfer," "advance payment," "no experience needed").
- **🏢 Company Verification Engine:** Performs WHOIS lookups, DNS resolution, and TLD reputation checks on the issuing company's domain to verify their legitimacy.
- **🔐 Secure Authentication:** Full user authentication and database management powered by Supabase.
- **🚀 1-Click Deployment:** Pre-configured `render.yaml` and `Dockerfile` for seamless deployment to Render.

---

## 🏗️ Architecture

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router, Supabase Client.
- **Backend:** FastAPI, Uvicorn, PyTorch, Transformers, PyTesseract, pdf2image.
- **Database:** PostgreSQL (via Supabase).
- **Hosting:** Render.com (Frontend as Static Site, Backend as Docker Web Service).

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **System Dependencies** (Required for PDF OCR):
  - `tesseract-ocr`
  - `poppler-utils`
  *(On Mac: `brew install tesseract poppler`, On Ubuntu: `sudo apt-get install tesseract-ocr poppler-utils`)*
- **Git LFS** (Required to pull the ML models).

### 2. Clone the Repository
Because this repository stores large machine learning models (`.safetensors`, `.zip`), ensure you have Git LFS installed before cloning:
```bash
git lfs install
git clone https://github.com/SiddheshCodes4554/OfferSafe.git
cd OfferSafe
git lfs pull
```

### 3. Backend Setup
```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app:app --host 0.0.0.0 --port 10000 --reload
```
The backend API will be available at `http://localhost:10000`. You can view the interactive API documentation at `http://localhost:10000/docs`.

### 4. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will be available at `http://localhost:5173`. Make sure to configure your `.env` file in the `frontend` directory with your Supabase credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

---


## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
