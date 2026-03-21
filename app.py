from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pdf2image import convert_from_bytes
import pytesseract
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import re
import whois
import socket
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from analyzer import deep_analyze

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────
FAKE_JOB_MODEL_PATH = "./fake_job_model"   # Original model (from .zip)
DISTILBERT_MODEL_PATH = "./model"           # DistilBERT model directory

# Red-flag keywords commonly found in fraudulent job offers
RED_FLAG_KEYWORDS: list[str] = [
    "wire transfer", "money order", "western union", "moneygram",
    "upfront fee", "advance payment", "processing fee", "registration fee",
    "guaranteed income", "earn from home", "no experience needed",
    "act now", "limited time", "urgent", "immediately",
    "personal bank", "bank details", "ssn", "social security",
    "credit card", "100% free", "risk-free",
    "congratulations", "you have been selected", "you've been chosen",
    "work from home", "make money fast", "easy money",
    "send money", "cash only", "cryptocurrency payment",
    "no interview required", "hired immediately",
    "confidential", "do not share", "secret shopper",
    "reshipping", "package forwarding",
]

# ──────────────────────────────────────────────────────────────
# Global model registry
# ──────────────────────────────────────────────────────────────
ml_models: dict = {}


def _try_load_model(name: str, path: str) -> None:
    """Attempt to load a HuggingFace model + tokenizer into ml_models."""
    try:
        ml_models[f"{name}_tokenizer"] = AutoTokenizer.from_pretrained(path)
        ml_models[f"{name}_model"] = AutoModelForSequenceClassification.from_pretrained(path)
        print(f"✅  '{name}' model loaded from {path}")
    except Exception as e:
        print(f"⚠️  Could not load '{name}' model from {path}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load both models at startup (either or both may succeed)
    _try_load_model("fake_job", FAKE_JOB_MODEL_PATH)
    _try_load_model("distilbert", DISTILBERT_MODEL_PATH)
    yield
    ml_models.clear()


app = FastAPI(
    title="SafeOffer – Offer Letter Authenticator API",
    description=(
        "Backend API for extracting text from PDFs via OCR, "
        "running AI-based fraud detection, and flagging suspicious keywords."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


# ──────────────────────────────────────────────────────────────
# Utility functions
# ──────────────────────────────────────────────────────────────
def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Convert every page of a PDF to an image, then OCR each page."""
    images = convert_from_bytes(pdf_bytes)
    full_text = ""
    for img in images:
        full_text += pytesseract.image_to_string(img) + "\n"
    return full_text.strip()


def predict_trust_score(
    text: str,
    model_key: str = "distilbert",
    max_length: int = 512,
) -> dict:
    """
    Tokenize *text* and run it through the specified model.

    Returns a dict with:
        trust_score   – float 0-100 (higher = more trustworthy)
        risk_level    – human-readable label
        fake_probability – float 0-100
    
    Raises RuntimeError if the requested model is not loaded.
    """
    tokenizer = ml_models.get(f"{model_key}_tokenizer")
    model = ml_models.get(f"{model_key}_model")

    if tokenizer is None or model is None:
        raise RuntimeError(
            f"Model '{model_key}' is not loaded. "
            f"Make sure the model directory exists and contains valid HuggingFace files."
        )

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=max_length,
    )

    # DistilBERT does not accept token_type_ids
    inputs.pop("token_type_ids", None)

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)

    # Convention: label 1 = fake, label 0 = real
    fake_prob = probabilities[0][1].item()
    trust_score = round((1 - fake_prob) * 100, 2)

    if trust_score < 40:
        risk_level = "High Risk 🚨"
    elif trust_score < 75:
        risk_level = "Medium Risk ⚠️"
    else:
        risk_level = "Safe / Low Risk ✅"

    return {
        "trust_score": trust_score,
        "risk_level": risk_level,
        "fake_probability": round(fake_prob * 100, 2),
    }


def scan_red_flag_keywords(text: str) -> list[dict]:
    """
    Scan *text* for known red-flag keywords / phrases.

    Returns a list of dicts, each with:
        keyword  – the matched phrase
        count    – how many times it appears
    """
    text_lower = text.lower()
    found: list[dict] = []

    for keyword in RED_FLAG_KEYWORDS:
        count = len(re.findall(re.escape(keyword), text_lower))
        if count > 0:
            found.append({"keyword": keyword, "count": count})

    # Sort by count descending so the most frequent flags come first
    found.sort(key=lambda x: x["count"], reverse=True)
    return found


def _validate_pdf_upload(file: UploadFile) -> None:
    """Raise HTTPException if the uploaded file is not a PDF."""
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only application/pdf is accepted.",
        )


async def _read_and_ocr(file: UploadFile) -> tuple[bytes, str]:
    """Read the uploaded file bytes and run OCR. Returns (raw_bytes, text)."""
    try:
        pdf_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    try:
        extracted_text = extract_text_from_pdf(pdf_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Error extracting text from PDF. "
                "Ensure poppler and tesseract are installed. "
                f"Details: {str(e)}"
            ),
        )

    if not extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Could not read any text from this PDF. It might be empty or unreadable.",
        )

    return pdf_bytes, extracted_text


# ──────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────
@app.post("/upload", tags=["OCR"])
async def upload_pdf(file: UploadFile = File(...)):
    """
    Extract raw text from a PDF using Tesseract OCR.

    Optionally runs the *fake_job* model if it was loaded at startup.
    """
    _validate_pdf_upload(file)
    _, extracted_text = await _read_and_ocr(file)

    response_data: dict = {
        "filename": file.filename,
        "extracted_text": extracted_text,
    }

    # Run legacy fake-job model if available
    try:
        analysis = predict_trust_score(extracted_text, model_key="fake_job")
        response_data["ai_analysis"] = analysis
    except RuntimeError:
        pass  # Model not loaded – skip silently for /upload
    except Exception as e:
        response_data["ai_analysis_error"] = f"AI processing error: {str(e)}"

    return JSONResponse(content=response_data)


@app.post("/analyze", tags=["Analysis"])
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Full deep‑analysis pipeline:
      1. OCR the uploaded PDF → raw text
      2. Run 6‑layer composite analysis engine
    """
    _validate_pdf_upload(file)
    _, extracted_text = await _read_and_ocr(file)

    report = deep_analyze(extracted_text, ml_models)
    report_dict = report.to_dict()

    # Also run legacy keyword scan for backward-compat
    red_flags = scan_red_flag_keywords(extracted_text)

    return JSONResponse(content={
        "filename": file.filename,
        "trust_score": report.final_score,
        "risk_level": report.risk_level,
        "fake_probability": round(100 - report.final_score, 2),
        "model_used": "deep_analysis_engine",
        "red_flag_keywords": red_flags,
        "red_flag_count": len(red_flags),
        "extracted_text_preview": extracted_text[:500],
        "analysis_layers": report_dict["layers"],
        "findings": report_dict["findings"],
        "cap_applied": report_dict["cap_applied"],
        "cap_reason": report_dict["cap_reason"],
    })


# ──────────────────────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────────────────────
class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=20, description="The offer letter text to analyze")


class CompanyVerifyRequest(BaseModel):
    company: str = Field(..., min_length=2, description="Company name or domain to verify (e.g. 'Google' or 'google.com')")


# ──────────────────────────────────────────────────────────────
# Company / Domain verification utilities
# ──────────────────────────────────────────────────────────────
SUSPICIOUS_TLDS = {
    ".xyz", ".top", ".club", ".work", ".click", ".link",
    ".buzz", ".surf", ".icu", ".monster", ".rest", ".gq",
    ".ml", ".tk", ".cf", ".ga",
}

FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "aol.com", "mail.com", "protonmail.com", "zoho.com",
    "yandex.com", "icloud.com", "gmx.com",
}


def _normalise_domain(company_or_domain: str) -> str:
    """Best-effort extraction of a domain from user input."""
    value = company_or_domain.strip().lower()
    # Strip protocol if pasted as URL
    value = re.sub(r"^https?://", "", value)
    value = value.split("/")[0]  # remove path
    # If it looks like a domain already, return it
    if "." in value:
        return value
    # Otherwise, guess .com
    return f"{value}.com"


def verify_company_domain(company_or_domain: str) -> dict:
    """
    Run heuristic checks on a company name or domain.

    Returns a dict with verification results and a trust_score (0-100).
    """
    domain = _normalise_domain(company_or_domain)
    checks: list[dict] = []
    score = 100  # start perfect, deduct for red flags

    # 1. WHOIS lookup
    whois_data: dict = {}
    try:
        w = whois.whois(domain)
        whois_data["registrar"] = w.registrar
        whois_data["org"] = w.org

        # Creation date
        creation = w.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation:
            whois_data["creation_date"] = str(creation)
            if isinstance(creation, datetime):
                age_days = (datetime.now(timezone.utc) - creation.replace(tzinfo=timezone.utc)).days
                whois_data["domain_age_days"] = age_days
                if age_days < 90:
                    score -= 30
                    checks.append({"check": "domain_age", "status": "fail", "detail": f"Domain is only {age_days} days old — very new"})
                elif age_days < 365:
                    score -= 15
                    checks.append({"check": "domain_age", "status": "warn", "detail": f"Domain is {age_days} days old — relatively new"})
                else:
                    checks.append({"check": "domain_age", "status": "pass", "detail": f"Domain is {age_days} days old"})

        # Expiration date
        expiry = w.expiration_date
        if isinstance(expiry, list):
            expiry = expiry[0]
        if expiry:
            whois_data["expiration_date"] = str(expiry)

        # Country
        if w.country:
            whois_data["country"] = w.country

        checks.append({"check": "whois_lookup", "status": "pass", "detail": f"WHOIS data retrieved for {domain}"})
    except Exception:
        score -= 20
        checks.append({"check": "whois_lookup", "status": "fail", "detail": f"WHOIS lookup failed for {domain} — domain may not exist"})

    # 2. DNS resolution
    try:
        ip = socket.gethostbyname(domain)
        checks.append({"check": "dns_resolves", "status": "pass", "detail": f"{domain} resolves to {ip}"})
    except socket.gaierror:
        score -= 25
        checks.append({"check": "dns_resolves", "status": "fail", "detail": f"{domain} does not resolve — no website found"})

    # 3. Suspicious TLD
    tld = "." + domain.rsplit(".", 1)[-1]
    if tld in SUSPICIOUS_TLDS:
        score -= 15
        checks.append({"check": "tld_reputation", "status": "warn", "detail": f"TLD '{tld}' is commonly associated with spam domains"})
    else:
        checks.append({"check": "tld_reputation", "status": "pass", "detail": f"TLD '{tld}' is standard"})

    # 4. Free email domain check
    if domain in FREE_EMAIL_DOMAINS:
        score -= 20
        checks.append({"check": "free_email_domain", "status": "warn", "detail": f"{domain} is a free email provider — not a company domain"})

    # Clamp score
    score = max(0, min(100, score))

    if score < 40:
        risk_level = "High Risk 🚨"
    elif score < 75:
        risk_level = "Medium Risk ⚠️"
    else:
        risk_level = "Low Risk ✅"

    return {
        "domain": domain,
        "trust_score": score,
        "risk_level": risk_level,
        "checks": checks,
        "whois": whois_data,
    }


# ──────────────────────────────────────────────────────────────
# New Endpoints
# ──────────────────────────────────────────────────────────────
@app.post("/analyze-text", tags=["Analysis"])
async def analyze_text(body: TextAnalysisRequest):
    """
    Analyze pasted offer letter text with the deep analysis engine.
    """
    text = body.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    report = deep_analyze(text, ml_models)
    report_dict = report.to_dict()

    red_flags = scan_red_flag_keywords(text)

    return JSONResponse(content={
        "filename": "pasted_text",
        "trust_score": report.final_score,
        "risk_level": report.risk_level,
        "fake_probability": round(100 - report.final_score, 2),
        "model_used": "deep_analysis_engine",
        "red_flag_keywords": red_flags,
        "red_flag_count": len(red_flags),
        "extracted_text_preview": text[:500],
        "analysis_layers": report_dict["layers"],
        "findings": report_dict["findings"],
        "cap_applied": report_dict["cap_applied"],
        "cap_reason": report_dict["cap_reason"],
    })


@app.post("/verify-company", tags=["Verification"])
async def verify_company(body: CompanyVerifyRequest):
    """
    Verify a company name or domain using WHOIS, DNS, and heuristic checks.

    Returns a trust score (0-100 %) and a list of individual check results.
    """
    try:
        result = verify_company_domain(body.company)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during company verification: {str(e)}",
        )

    return JSONResponse(content=result)