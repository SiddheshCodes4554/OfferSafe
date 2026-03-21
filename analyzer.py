"""
SafeOffer — Deep Multi-Layer Fraud Analysis Engine
===================================================

Replaces the single-model trust score with a 6-layer composite system.
Each layer independently scores the text from 0 (dangerous) to 100 (safe),
and the final score is a weighted average with a hard cap mechanism.
"""

from __future__ import annotations

import re
import math
from dataclasses import dataclass, field, asdict

# ══════════════════════════════════════════════════════════════
# Data structures
# ══════════════════════════════════════════════════════════════

@dataclass
class Finding:
    """A single observation from an analysis layer."""
    layer: str
    status: str   # "pass" | "warn" | "fail"
    detail: str
    severity: float = 0.0  # 0-1, used for score calculation


@dataclass
class LayerResult:
    """Output of a single analysis layer."""
    name: str
    score: float          # 0-100
    weight: float         # 0-1
    findings: list[Finding] = field(default_factory=list)


@dataclass
class AnalysisReport:
    """Complete analysis output."""
    final_score: float
    risk_level: str
    layers: list[LayerResult] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    cap_applied: bool = False
    cap_reason: str = ""

    def to_dict(self) -> dict:
        return {
            "final_score": self.final_score,
            "risk_level": self.risk_level,
            "cap_applied": self.cap_applied,
            "cap_reason": self.cap_reason,
            "layers": [
                {"name": l.name, "score": round(l.score, 1), "weight": l.weight}
                for l in self.layers
            ],
            "findings": [asdict(f) for f in self.findings],
        }


# ══════════════════════════════════════════════════════════════
# Layer 1: ML Model Score (weight=0.25)
# ══════════════════════════════════════════════════════════════
def _layer_ml_model(text: str, ml_models: dict) -> LayerResult:
    """Run the DistilBERT / fake_job model and return its score."""
    import torch

    result = LayerResult(name="ML Model", score=50.0, weight=0.25)

    tokenizer = None
    model = None
    model_name = None
    for key in ("distilbert", "fake_job"):
        t = ml_models.get(f"{key}_tokenizer")
        m = ml_models.get(f"{key}_model")
        if t and m:
            tokenizer, model, model_name = t, m, key
            break

    if tokenizer is None or model is None:
        result.score = 50.0  # neutral if no model
        result.findings.append(Finding(
            layer="ML Model", status="warn",
            detail="No ML model loaded — using neutral score (50)",
        ))
        return result

    try:
        inputs = tokenizer(
            text, return_tensors="pt",
            truncation=True, padding="max_length", max_length=512,
        )
        inputs.pop("token_type_ids", None)

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)

        fake_prob = probs[0][1].item()
        result.score = round((1 - fake_prob) * 100, 2)

        result.findings.append(Finding(
            layer="ML Model", status="pass" if result.score >= 60 else "warn",
            detail=f"Model '{model_name}' assigns {round(fake_prob*100,1)}% fake probability",
            severity=fake_prob,
        ))
    except Exception as e:
        result.score = 50.0
        result.findings.append(Finding(
            layer="ML Model", status="warn",
            detail=f"ML inference error: {str(e)[:100]}",
        ))

    return result


# ══════════════════════════════════════════════════════════════
# Layer 2: Red-Flag Keywords (weight=0.20)
# ══════════════════════════════════════════════════════════════

# (keyword, severity 1-3)  3=critical, 2=major, 1=minor
SEVERITY_KEYWORDS: list[tuple[str, int]] = [
    # Critical (severity 3) — immediate scam indicators
    ("wire transfer", 3), ("money order", 3), ("western union", 3),
    ("moneygram", 3), ("send money", 3), ("upfront fee", 3),
    ("advance payment", 3), ("processing fee", 3), ("registration fee", 3),
    ("training fee", 3), ("equipment fee", 3), ("background check fee", 3),
    ("security deposit", 3), ("cash only", 3), ("cryptocurrency payment", 3),
    ("bitcoin payment", 3), ("pay via", 3), ("bank details", 3),
    ("personal bank", 3), ("ssn", 3), ("social security", 3),
    ("credit card number", 3), ("passport copy", 3), ("send your id", 3),
    ("reshipping", 3), ("package forwarding", 3), ("secret shopper", 3),
    ("mystery shopper", 3),

    # Major (severity 2) — strong scam signals
    ("no interview required", 2), ("no interview needed", 2),
    ("hired immediately", 2), ("instant hire", 2),
    ("guaranteed income", 2), ("guaranteed salary", 2),
    ("earn from home", 2), ("make money fast", 2), ("easy money", 2),
    ("unlimited earning", 2), ("unlimited income", 2),
    ("risk-free", 2), ("100% free", 2), ("zero investment", 2),
    ("no experience needed", 2), ("no experience required", 2),
    ("no skills required", 2), ("no qualifications needed", 2),
    ("you have been selected", 2), ("you've been chosen", 2),
    ("you have been chosen", 2), ("specially selected", 2),
    ("congratulations", 2), ("you are a winner", 2),
    ("work from home", 2), ("work from anywhere", 2),
    ("simple tasks", 2), ("easy tasks", 2),
    ("confidential opportunity", 2), ("do not share this", 2),

    # Minor (severity 1) — yellow flags (may be legitimate in context)
    ("act now", 1), ("limited time", 1), ("urgent", 1),
    ("immediately", 1), ("urgent response", 1), ("respond asap", 1),
    ("limited positions", 1), ("few spots left", 1),
    ("high salary", 1), ("competitive salary", 1),
    ("flexible hours", 1), ("part time", 1), ("part-time", 1),
    ("click here", 1), ("click the link", 1), ("apply now", 1),
    ("whatsapp", 1), ("telegram", 1), ("personal email", 1),
    ("gmail", 1), ("yahoo", 1), ("hotmail", 1),
]


def _layer_red_flags(text: str) -> LayerResult:
    """Scan for red-flag keywords with severity weighting."""
    result = LayerResult(name="Red-Flag Keywords", score=100.0, weight=0.20)
    text_lower = text.lower()

    total_penalty = 0.0
    found_keywords: list[dict] = []

    for keyword, severity in SEVERITY_KEYWORDS:
        matches = len(re.findall(re.escape(keyword), text_lower))
        if matches > 0:
            penalty = severity * matches * 4  # each critical match = -12 pts
            total_penalty += penalty
            found_keywords.append({"keyword": keyword, "count": matches, "severity": severity})

            status = "fail" if severity >= 3 else "warn" if severity >= 2 else "warn"
            result.findings.append(Finding(
                layer="Red-Flag Keywords", status=status,
                detail=f"'{keyword}' found {matches}× (severity: {'critical' if severity==3 else 'major' if severity==2 else 'minor'})",
                severity=severity / 3,
            ))

    if not found_keywords:
        result.findings.append(Finding(
            layer="Red-Flag Keywords", status="pass",
            detail="No known red-flag keywords detected",
        ))

    result.score = max(0, 100 - total_penalty)
    return result


# ══════════════════════════════════════════════════════════════
# Layer 3: Structural Analysis (weight=0.20)
# ══════════════════════════════════════════════════════════════

STRUCTURAL_CHECKS = [
    {
        "name": "company_name",
        "patterns": [
            r"\b(?:inc|llc|ltd|corp|corporation|company|co\.|pvt|private limited|gmbh|plc)\b",
            r"(?:at|from|with|join)\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}",
        ],
        "weight": 12,
        "label": "Company name / entity",
    },
    {
        "name": "job_title",
        "patterns": [
            r"\b(?:position|role|title|designation|job\s*title)\s*[:\-–]?\s*\w+",
            r"\b(?:software|senior|junior|lead|manager|analyst|engineer|developer|designer|executive|coordinator|specialist|associate|director|consultant)\b",
        ],
        "weight": 10,
        "label": "Specific job title / role",
    },
    {
        "name": "salary_info",
        "patterns": [
            r"(?:\$|₹|€|£|usd|inr)\s*[\d,]+",
            r"\b(?:salary|compensation|ctc|package|remuneration|pay|stipend)\b",
            r"\b(?:per\s+(?:month|year|annum|hour|week))\b",
        ],
        "weight": 10,
        "label": "Salary / compensation details",
    },
    {
        "name": "start_date",
        "patterns": [
            r"\b(?:start\s*date|joining\s*date|commence|begin|report(?:ing)?\s*date)\b",
            r"\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}",
            r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}",
        ],
        "weight": 8,
        "label": "Start / joining date",
    },
    {
        "name": "company_address",
        "patterns": [
            r"\b\d+\s+\w+\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|suite|floor)\b",
            r"\b(?:address|located|office|headquarters|hq)\b.*\b(?:street|city|state|zip|country)\b",
        ],
        "weight": 8,
        "label": "Company address / location",
    },
    {
        "name": "reporting_manager",
        "patterns": [
            r"\b(?:report(?:ing)?\s*to|supervisor|manager|team\s*lead|department\s*head)\b",
        ],
        "weight": 6,
        "label": "Reporting manager / supervisor",
    },
    {
        "name": "benefits",
        "patterns": [
            r"\b(?:benefits|insurance|health|dental|vision|401k|retirement|pto|paid\s*time\s*off|vacation|sick\s*leave|equity|stock\s*options|bonus)\b",
        ],
        "weight": 8,
        "label": "Benefits / perks",
    },
    {
        "name": "formal_signature",
        "patterns": [
            r"\b(?:sincerely|regards|best\s*regards|yours\s*(?:truly|faithfully)|respectfully|thank\s*you)\b",
            r"\b(?:hr\s*(?:department|team|manager)|human\s*resources|talent\s*acquisition|recruitment)\b",
        ],
        "weight": 6,
        "label": "Formal closing / HR signature",
    },
    {
        "name": "legal_language",
        "patterns": [
            r"\b(?:terms\s*(?:and|&)\s*conditions|at-will|employment\s*agreement|non-?disclosure|nda|confidentiality|probation(?:ary)?|offer\s*(?:is\s*)?contingent|background\s*(?:check|verification)|subject\s*to)\b",
        ],
        "weight": 7,
        "label": "Legal / contractual language",
    },
]


def _layer_structural(text: str) -> LayerResult:
    """Check for the presence of expected structural elements."""
    result = LayerResult(name="Structural Analysis", score=100.0, weight=0.20)

    total_weight = sum(c["weight"] for c in STRUCTURAL_CHECKS)
    earned_weight = 0

    for check in STRUCTURAL_CHECKS:
        found = False
        for pattern in check["patterns"]:
            if re.search(pattern, text, re.IGNORECASE):
                found = True
                break

        if found:
            earned_weight += check["weight"]
            result.findings.append(Finding(
                layer="Structural Analysis", status="pass",
                detail=f"{check['label']} — detected",
            ))
        else:
            result.findings.append(Finding(
                layer="Structural Analysis", status="fail",
                detail=f"{check['label']} — missing",
                severity=check["weight"] / total_weight,
            ))

    result.score = round((earned_weight / total_weight) * 100, 1) if total_weight > 0 else 50
    return result


# ══════════════════════════════════════════════════════════════
# Layer 4: Urgency & Pressure Tactics (weight=0.15)
# ══════════════════════════════════════════════════════════════

URGENCY_PATTERNS: list[tuple[str, float]] = [
    # Artificial time pressure
    (r"\b(?:respond|reply|act|apply)\s+(?:within|in|before)\s+\d+\s*(?:hours?|hrs?|days?|minutes?)\b", 15),
    (r"\b(?:offer\s+(?:expires?|valid)\s+(?:until|before|by)|limited\s+time\s+offer|deadline)\b", 12),
    (r"\b(?:today\s+only|don'?t\s+miss|last\s+chance|final\s+(?:call|notice|warning))\b", 12),

    # Emotional manipulation
    (r"\b(?:once\s+in\s+a\s+lifetime|life[\s\-]?changing|transform\s+your\s+life|dream\s+(?:job|opportunity|career))\b", 10),
    (r"\b(?:exclusive|specially?\s+(?:chosen|selected|picked)|hand[\s\-]?picked|personally\s+(?:chosen|selected))\b", 10),
    (r"\b(?:don'?t\s+tell\s+anyone|keep\s+(?:this|it)\s+(?:secret|confidential|private|between\s+us))\b", 15),

    # Too good to be true
    (r"\b(?:no\s+(?:work|effort)\s+(?:required|needed)|passive\s+income|autopilot|auto[\s\-]?pilot)\b", 15),
    (r"\b(?:earn|make)\s+\$?\d[\d,]*\+?\s*(?:per|a|\/)\s*(?:day|week|hour)\b", 10),
    (r"\b(?:double|triple)\s+your\s+(?:income|money|salary)\b", 15),
    (r"\b(?:financial\s+freedom|be\s+your\s+own\s+boss|quit\s+your\s+(?:job|day\s+job))\b", 8),

    # Coercion patterns
    (r"\b(?:if\s+you\s+(?:don'?t|do\s+not)\s+(?:respond|reply|act|accept).+?(?:lose|miss|forfeit))\b", 15),
    (r"\b(?:this\s+(?:opportunity|offer)\s+(?:will\s+)?(?:not|won'?t)\s+(?:come|last|be\s+available))\b", 10),
]


def _layer_urgency(text: str) -> LayerResult:
    """Detect urgency, pressure, and manipulation patterns."""
    result = LayerResult(name="Urgency & Pressure", score=100.0, weight=0.15)

    total_penalty = 0.0
    for pattern, penalty in URGENCY_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            total_penalty += penalty * len(matches)
            sample = matches[0] if isinstance(matches[0], str) else matches[0]
            result.findings.append(Finding(
                layer="Urgency & Pressure", status="fail",
                detail=f"Pressure tactic detected: \"{sample[:60]}\"",
                severity=min(1.0, penalty / 15),
            ))

    if total_penalty == 0:
        result.findings.append(Finding(
            layer="Urgency & Pressure", status="pass",
            detail="No urgency or pressure tactics detected",
        ))

    result.score = max(0, 100 - total_penalty)
    return result


# ══════════════════════════════════════════════════════════════
# Layer 5: Legitimacy Signals (weight=0.10)
# ══════════════════════════════════════════════════════════════

def _layer_legitimacy(text: str) -> LayerResult:
    """Evaluate professionalism and legitimacy signals."""
    result = LayerResult(name="Legitimacy Signals", score=50.0, weight=0.10)
    text_lower = text.lower()

    score = 50  # start neutral

    # --- Positive signals (boost score) ---
    positive_signals = [
        (r"\b(?:hereby|pursuant|aforementioned|herein|thereof)\b", 8, "Legal/formal language"),
        (r"\b(?:probation(?:ary)?\s*period|notice\s*period)\b", 8, "Employment terms"),
        (r"\b(?:annual|quarterly|bi-weekly|monthly)\s+(?:review|appraisal|evaluation)\b", 7, "Review/appraisal cycle"),
        (r"\b(?:code\s+of\s+conduct|employee\s+handbook|company\s+polic(?:y|ies))\b", 7, "HR policies"),
        (r"\b(?:onboarding|orientation|induction|training\s+program)\b", 6, "Onboarding process"),
        (r"\b(?:equal\s+opportunity|eeo|diversity|inclusion)\b", 5, "Equal opportunity"),
        (r"(?:linkedin\.com|company\s+website|www\.\w+\.\w+)\b", 5, "Professional web presence"),
        (r"\b(?:direct\s+deposit|payroll)\b", 5, "Payroll details"),
    ]

    for pattern, boost, label in positive_signals:
        if re.search(pattern, text, re.IGNORECASE):
            score += boost
            result.findings.append(Finding(
                layer="Legitimacy Signals", status="pass",
                detail=f"{label} — detected",
            ))

    # --- Negative signals (lower score) ---
    negative_signals = [
        # Vague / generic job description
        (r"\b(?:various\s+(?:tasks|duties|responsibilities)|as\s+(?:needed|required|assigned))\b", -8, "Vague job responsibilities"),
        (r"\b(?:general\s+(?:duties|work|tasks))\b", -6, "Non-specific role"),

        # Excessive caps / exclamation (unprofessional)
        (r"[!]{2,}", -5, "Multiple exclamation marks"),
        (r"\b[A-Z]{5,}\b", -3, "Excessive capitalization (shouting)"),

        # Informal tone
        (r"\b(?:hey|hiya|sup|yo|dude|bro|mate)\b", -8, "Informal / slang greeting"),
        (r"\b(?:gonna|wanna|gotta|ain'?t|cuz|bcuz|coz)\b", -6, "Informal language"),

        # Suspicious formatting
        (r"[^\w\s]{3,}", -3, "Unusual character sequences"),
    ]

    for pattern, penalty, label in negative_signals:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # penalty is negative, so adding it reduces the score
            score += penalty * min(len(matches), 3)  # cap repeated hits
            result.findings.append(Finding(
                layer="Legitimacy Signals", status="warn" if penalty > -7 else "fail",
                detail=f"{label} — found ({len(matches)}×)",
                severity=min(1.0, abs(penalty) / 10),
            ))

    # --- Text quality checks ---
    words = text.split()
    word_count = len(words)

    if word_count < 50:
        score -= 15
        result.findings.append(Finding(
            layer="Legitimacy Signals", status="fail",
            detail=f"Very short text ({word_count} words) — legitimate offers are typically longer",
            severity=0.6,
        ))
    elif word_count < 150:
        score -= 5
        result.findings.append(Finding(
            layer="Legitimacy Signals", status="warn",
            detail=f"Brief text ({word_count} words) — most formal offers are 200+ words",
        ))
    else:
        score += 5
        result.findings.append(Finding(
            layer="Legitimacy Signals", status="pass",
            detail=f"Reasonable length ({word_count} words)",
        ))

    # Sentence structure (avg sentence length)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
    if sentences:
        avg_sent_len = sum(len(s.split()) for s in sentences) / len(sentences)
        if avg_sent_len < 5:
            score -= 8
            result.findings.append(Finding(
                layer="Legitimacy Signals", status="warn",
                detail=f"Very short sentences (avg {avg_sent_len:.0f} words) — may indicate unprofessional writing",
            ))

    result.score = max(0, min(100, score))
    return result


# ══════════════════════════════════════════════════════════════
# Layer 6: Contact & Domain Analysis (weight=0.10)
# ══════════════════════════════════════════════════════════════

FREE_EMAIL_PROVIDERS = {
    "gmail", "yahoo", "hotmail", "outlook", "aol", "mail",
    "protonmail", "zoho", "yandex", "icloud", "gmx",
    "mailinator", "guerrillamail", "tempmail", "throwaway",
    "10minutemail", "trashmail",
}

SUSPICIOUS_URL_TLDS = {
    ".xyz", ".top", ".club", ".work", ".click", ".link",
    ".buzz", ".surf", ".icu", ".monster", ".rest", ".gq",
    ".ml", ".tk", ".cf", ".ga", ".bit", ".ly",
}


def _layer_contact(text: str) -> LayerResult:
    """Analyze contact information and domains mentioned in the text."""
    result = LayerResult(name="Contact & Domain", score=80.0, weight=0.10)
    text_lower = text.lower()

    score = 80  # start slightly positive

    # Check for email addresses
    emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.-]+', text_lower)

    if emails:
        for email in emails:
            domain = email.split("@")[1].split(".")[0]
            if domain in FREE_EMAIL_PROVIDERS:
                score -= 20
                result.findings.append(Finding(
                    layer="Contact & Domain", status="fail",
                    detail=f"Free email provider used: {email} — legitimate companies use corporate domains",
                    severity=0.7,
                ))
            else:
                score += 5
                result.findings.append(Finding(
                    layer="Contact & Domain", status="pass",
                    detail=f"Corporate email detected: {email}",
                ))
    else:
        score -= 10
        result.findings.append(Finding(
            layer="Contact & Domain", status="warn",
            detail="No email address found in the offer letter",
        ))

    # Check for URLs
    urls = re.findall(r'https?://[\w\-\.]+\.\w+[/\w\-\.]*', text_lower)
    for url in urls:
        for tld in SUSPICIOUS_URL_TLDS:
            if tld in url:
                score -= 15
                result.findings.append(Finding(
                    layer="Contact & Domain", status="fail",
                    detail=f"Suspicious URL found: {url}",
                    severity=0.6,
                ))
                break

    # Check for phone numbers (positive signal)
    phones = re.findall(r'[\+]?\d[\d\s\-\(\)]{7,}\d', text)
    if phones:
        score += 5
        result.findings.append(Finding(
            layer="Contact & Domain", status="pass",
            detail=f"Phone number(s) provided ({len(phones)})",
        ))

    # Check for suspicious communication channels
    if re.search(r'\b(?:whatsapp|telegram|signal|wechat)\b', text_lower):
        score -= 12
        result.findings.append(Finding(
            layer="Contact & Domain", status="warn",
            detail="Communication via messaging app (WhatsApp/Telegram) — unusual for formal offers",
            severity=0.4,
        ))

    result.score = max(0, min(100, score))
    return result


# ══════════════════════════════════════════════════════════════
# Composite Scoring Engine
# ══════════════════════════════════════════════════════════════

HARD_CAP_THRESHOLD = 25   # If any layer < this, cap final score
HARD_CAP_VALUE = 50       # Max final score when cap is applied


def deep_analyze(text: str, ml_models: dict) -> AnalysisReport:
    """
    Run the full 6-layer analysis pipeline and return a composite report.

    Parameters
    ----------
    text : str
        The offer letter text to analyze.
    ml_models : dict
        The ml_models dict from app.py (may be empty).

    Returns
    -------
    AnalysisReport
        Complete analysis with final_score, per-layer breakdown, and findings.
    """
    # Run all 6 layers
    layers: list[LayerResult] = [
        _layer_ml_model(text, ml_models),
        _layer_red_flags(text),
        _layer_structural(text),
        _layer_urgency(text),
        _layer_legitimacy(text),
        _layer_contact(text),
    ]

    # Weighted average
    total_weight = sum(l.weight for l in layers)
    weighted_sum = sum(l.score * l.weight for l in layers)
    final_score = round(weighted_sum / total_weight, 1) if total_weight > 0 else 50.0

    # Hard cap: if any layer is very bad, cap the final score
    cap_applied = False
    cap_reason = ""
    for layer in layers:
        if layer.score < HARD_CAP_THRESHOLD:
            if final_score > HARD_CAP_VALUE:
                cap_applied = True
                cap_reason = f"'{layer.name}' scored critically low ({layer.score:.0f}/100)"
                final_score = min(final_score, HARD_CAP_VALUE)
                break

    final_score = max(0, min(100, final_score))

    # Risk level
    if final_score < 40:
        risk_level = "High Risk 🚨"
    elif final_score < 60:
        risk_level = "Medium-High Risk ⚠️"
    elif final_score < 75:
        risk_level = "Medium Risk ⚠️"
    else:
        risk_level = "Low Risk ✅"

    # Collect all findings
    all_findings: list[Finding] = []
    for layer in layers:
        all_findings.extend(layer.findings)

    # Sort: fails first, then warns, then passes
    status_order = {"fail": 0, "warn": 1, "pass": 2}
    all_findings.sort(key=lambda f: (status_order.get(f.status, 3), -f.severity))

    return AnalysisReport(
        final_score=final_score,
        risk_level=risk_level,
        layers=layers,
        findings=all_findings,
        cap_applied=cap_applied,
        cap_reason=cap_reason,
    )
