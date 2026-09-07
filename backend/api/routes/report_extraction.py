"""api/routes/report_extraction.py
Extracts clinical fields from uploaded PDF/image pathology reports.

Pipeline for scanned PDFs:
  1. pypdf / PyMuPDF — check for real embedded text (skipped if only watermarks)
  2. Gemini Vision — render each PDF page as PNG with PyMuPDF, send images
     directly to Gemini multimodal API for structured extraction.
     (Avoids OCR.space 1 MB limit and 3-page free-tier restrictions.)
  3. OCR.space — fallback for plain image uploads (JPG/PNG).
"""
from __future__ import annotations

import os
import re
import io
import json
import base64
import httpx
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/reports", tags=["report-extraction"])

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "helloworld")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY      = os.getenv("GROQ_API_KEY", "")
OLLAMA_API_KEY    = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_BASE_URL   = "https://ollama.com/api"

# Gemini REST endpoints
GEMINI_TEXT_URL   = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
GEMINI_VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"

# Groq REST API (OpenAI-compatible)
GROQ_REST_URL = "https://api.groq.com/openai/v1/chat/completions"

# Max pages to send for Vision extraction (keeps token usage reasonable)
MAX_VISION_PAGES = 10


# ── Watermark / noise detector ────────────────────────────────────────────────
_WATERMARK_RE = re.compile(
    r"^/?[Pp]roclaim|"                       # /Proclaim- prefix
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}|" # UUID fragments
    r"\.PDF-\d{4,}-\d{2}\.\d{2}\.\d{4}",    # .PDF-NNNNN-DD.MM.YYYY
    re.IGNORECASE,
)


def _is_meaningful_pdf_text(text: str) -> bool:
    """
    Returns True only if extracted PDF text looks like real content
    (not just watermark / metadata noise from scanned PDFs).
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return False
    real = sum(
        1 for l in lines
        if not _WATERMARK_RE.search(l) and re.search(r"[A-Za-z]{3,}", l)
    )
    ratio = real / len(lines)
    print(f"[report_extraction] PDF text quality: {real}/{len(lines)} real lines ({ratio:.0%})")
    return ratio >= 0.40


# ── Prompt builders ───────────────────────────────────────────────────────────
_JSON_SCHEMA = """\
{
  "patient": {
    "name": "patient full name or empty string",
    "age": 0,
    "sex": "Female or Male or Other or empty string"
  },
  "tumour": {
    "stage": "I or II or III or IV or empty string",
    "grade": 0,
    "size": 0.0,
    "lymph_nodes_involved": false,
    "node_count": 0
  },
  "biomarkers": {
    "er_status": "Positive or Negative or Unknown",
    "pr_status": "Positive or Negative or Unknown",
    "her2_status": "Positive or Negative or Unknown",
    "ki67_percent": 0,
    "brca1_status": "Positive or Negative or Unknown",
    "brca2_status": "Positive or Negative or Unknown",
    "tils_percent": 0,
    "oncotype_dx_score": 0
  },
  "health": {
    "lvef_percent": 0,
    "ecog_score": 0,
    "comorbidities": [],
    "medications": []
  }
}"""

_SYSTEM_PROMPT = (
    "You are a medical data extraction specialist. "
    "Extract the specific clinical fields from the provided medical report. "
    "Return ONLY a raw JSON object — no markdown, no code fences, no explanation."
)


def _text_llm_prompt(ocr_text: str) -> str:
    return f"{_SYSTEM_PROMPT}\n\nReturn this exact schema:\n{_JSON_SCHEMA}\n\nREPORT TEXT:\n{ocr_text}"


def _vision_prompt() -> str:
    return (
        f"{_SYSTEM_PROMPT}\n\n"
        "The images below are pages from a medical/pathology report. "
        "Read every page carefully and extract the clinical data. "
        f"Return this exact schema:\n{_JSON_SCHEMA}"
    )


# ── Gemini helpers ────────────────────────────────────────────────────────────
def _parse_gemini_json(data: dict) -> dict:
    raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    for fence in ("```json", "```"):
        if raw.startswith(fence):
            raw = raw[len(fence):]
    if raw.endswith("```"):
        raw = raw[:-3]
    return json.loads(raw.strip())


async def _gemini_post(payload: dict) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")
    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(
            f"{GEMINI_VISION_URL}?key={GEMINI_API_KEY}",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        res.raise_for_status()
        return res.json()


async def extract_with_gemini_vision(pdf_bytes: bytes) -> dict:
    """
    Render every page of a PDF to PNG with PyMuPDF, then send all images
    to Gemini multimodal in a single request for structured extraction.
    """
    import fitz  # PyMuPDF

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    n_pages = min(len(doc), MAX_VISION_PAGES)
    print(f"[report_extraction] Gemini Vision: rendering {n_pages}/{len(doc)} pages …")

    # Build the parts list: one text prompt + one inline image per page
    parts: list[dict] = [{"text": _vision_prompt()}]

    mat = fitz.Matrix(1.5, 1.5)  # 108 DPI — good OCR quality, reasonable size
    for i in range(n_pages):
        page = doc[i]
        pix = page.get_pixmap(matrix=mat)
        png_bytes = pix.tobytes("png")
        b64 = base64.b64encode(png_bytes).decode()
        parts.append({
            "inlineData": {
                "mimeType": "image/png",
                "data": b64,
            }
        })
        print(f"  Page {i+1}: {len(png_bytes)//1024} KB PNG")

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }

    data = await _gemini_post(payload)
    return _parse_gemini_json(data)


async def extract_with_gemini_text(text: str) -> dict:
    """Send plain OCR text to Gemini for structured extraction."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")
    payload = {
        "contents": [{"parts": [{"text": _text_llm_prompt(text)}]}],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }
    data = await _gemini_post(payload)
    return _parse_gemini_json(data)


async def extract_with_groq(text: str) -> dict:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not configured")
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            GROQ_REST_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "openai/gpt-oss-120b",
                "messages": [{"role": "user", "content": _text_llm_prompt(text)}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
            },
        )
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"]
        return json.loads(content.strip())


async def extract_with_ollama(text: str) -> dict:
    if not OLLAMA_API_KEY:
        raise ValueError("OLLAMA_API_KEY not configured")
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{OLLAMA_BASE_URL}/chat",
            headers={"Authorization": f"Bearer {OLLAMA_API_KEY}"},
            json={
                "model": "llama3.1:70b",
                "messages": [{"role": "user", "content": _text_llm_prompt(text)}],
                "stream": False,
                "format": "json",
            },
        )
        res.raise_for_status()
        content = res.json().get("message", {}).get("content", "{}")
        return json.loads(content.strip())


# ── Default empty response ────────────────────────────────────────────────────
_EMPTY_RESPONSE = {
    "patient":    {"name": "", "age": 0, "sex": ""},
    "tumour":     {"stage": "", "grade": 0, "size": 0.0, "lymph_nodes_involved": False, "node_count": 0},
    "biomarkers": {
        "er_status": "Unknown", "pr_status": "Unknown", "her2_status": "Unknown",
        "ki67_percent": 0, "brca1_status": "Unknown", "brca2_status": "Unknown",
        "tils_percent": 0, "oncotype_dx_score": 0,
    },
    "health": {"lvef_percent": 0, "ecog_score": 0, "comorbidities": [], "medications": []},
}


# ── Response model ────────────────────────────────────────────────────────────
class ExtractionResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None
    warning: str | None = None


# ── Main endpoint ─────────────────────────────────────────────────────────────
@router.post("/extract", response_model=ExtractionResponse)
async def extract_report(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    content = await file.read()
    fname   = file.filename.lower()
    print(f"[report_extraction] Received: {file.filename} ({len(content)//1024} KB)")

    # ══════════════════════════════════════════════════════════════════════════
    # BRANCH A — PDF files
    # ══════════════════════════════════════════════════════════════════════════
    if fname.endswith(".pdf"):

        # Step A1: try native text extraction (only for digital/text PDFs)
        embedded_text: str = ""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            raw = "\n".join(p.extract_text() or "" for p in reader.pages).strip()
            if len(raw) > 100 and _is_meaningful_pdf_text(raw):
                embedded_text = raw
                print(f"[report_extraction] pypdf: got {len(embedded_text)} chars of real text")
        except Exception as e:
            print(f"[report_extraction] pypdf failed: {e}")

        if not embedded_text:
            try:
                import fitz
                doc = fitz.open(stream=content, filetype="pdf")
                raw = "\n".join(p.get_text() for p in doc).strip()
                if len(raw) > 100 and _is_meaningful_pdf_text(raw):
                    embedded_text = raw
                    print(f"[report_extraction] PyMuPDF text: got {len(embedded_text)} chars")
            except Exception as e:
                print(f"[report_extraction] PyMuPDF text extraction failed: {e}")

        # Step A2: if we have real embedded text → use LLM chain on text
        if embedded_text:
            print("[report_extraction] Digital PDF — using text LLM chain")
            return await _run_text_llm_chain(embedded_text)

        # Step A3: scanned PDF — use Gemini Vision directly on page images
        # (Avoids OCR.space 1 MB limit entirely)
        print("[report_extraction] Scanned PDF — using Gemini Vision on page images")
        try:
            structured = await extract_with_gemini_vision(content)
            return ExtractionResponse(success=True, data=structured)
        except Exception as e_vision:
            print(f"[report_extraction] Gemini Vision failed: {e_vision}")
            # Last resort: try OCR.space page-by-page (individual page PNGs are small)
            return await _ocr_space_page_by_page(content, file.filename)

    # ══════════════════════════════════════════════════════════════════════════
    # BRANCH B — Plain text
    # ══════════════════════════════════════════════════════════════════════════
    elif fname.endswith(".txt"):
        text = content.decode("utf-8", errors="replace")
        print(f"[report_extraction] Text file: {len(text)} chars")
        return await _run_text_llm_chain(text)

    # ══════════════════════════════════════════════════════════════════════════
    # BRANCH C — Image files (JPG / PNG)
    # ══════════════════════════════════════════════════════════════════════════
    else:
        print("[report_extraction] Image file — OCR.space")
        try:
            ocr_text = await _ocr_space_image(content, file.content_type or "image/jpeg", fname)
        except Exception as e:
            return ExtractionResponse(success=False, error=f"OCR failed: {e}")
        if not ocr_text.strip():
            return ExtractionResponse(success=False, error="No text found in image")
        return await _run_text_llm_chain(ocr_text)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _run_text_llm_chain(text: str) -> ExtractionResponse:
    """Groq → Gemini text → Ollama → empty fallback."""
    warning: str | None = None
    try:
        data = await extract_with_groq(text)
        return ExtractionResponse(success=True, data=data)
    except Exception as e_groq:
        print(f"[report_extraction] Groq failed: {e_groq} — trying Gemini text …")

    try:
        data = await extract_with_gemini_text(text)
        warning = f"Groq unavailable. Used Gemini fallback."
        return ExtractionResponse(success=True, data=data, warning=warning)
    except Exception as e_gemini:
        print(f"[report_extraction] Gemini text failed: {e_gemini} — trying Ollama …")

    try:
        data = await extract_with_ollama(text)
        warning = "Groq & Gemini unavailable. Used Ollama fallback."
        return ExtractionResponse(success=True, data=data, warning=warning)
    except Exception as e_ollama:
        print(f"[report_extraction] Ollama also failed: {e_ollama}")
        warning = "All LLMs unavailable — please fill fields manually."
        return ExtractionResponse(success=True, data=_EMPTY_RESPONSE, warning=warning)


async def _ocr_space_image(image_bytes: bytes, mime: str, fname: str) -> str:
    """Send a single image to OCR.space and return the parsed text."""
    b64 = base64.b64encode(image_bytes).decode()
    ext = fname.rsplit(".", 1)[-1].upper()
    file_type = ext if ext in ("PNG", "JPG", "JPEG", "GIF", "BMP", "TIFF", "PDF") else "AUTO"

    async with httpx.AsyncClient(timeout=45.0) as client:
        res = await client.post(
            "https://api.ocr.space/parse/image",
            data={
                "apikey": OCR_SPACE_API_KEY,
                "OCREngine": "2",
                "base64Image": f"data:{mime};base64,{b64}",
                "filetype": file_type,
                "isTable": "false",
                "scale": "true",
            },
        )
        res.raise_for_status()
        ocr_json = res.json()

    if ocr_json.get("IsErroredOnProcessing"):
        err = ocr_json.get("ErrorMessage", ["Unknown OCR error"])[0]
        raise RuntimeError(err)

    return "\n".join(p.get("ParsedText", "") for p in ocr_json.get("ParsedResults", []))


async def _ocr_space_page_by_page(pdf_bytes: bytes, original_fname: str) -> ExtractionResponse:
    """
    Fallback: render each PDF page to a small PNG and OCR them individually.
    Used only when Gemini Vision fails. Each page PNG is well under 1 MB.
    """
    import fitz

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        return ExtractionResponse(success=False, error=f"Could not open PDF: {e}")

    all_text: list[str] = []
    mat = fitz.Matrix(1.5, 1.5)

    for i, page in enumerate(doc):
        try:
            pix  = page.get_pixmap(matrix=mat)
            png  = pix.tobytes("png")
            print(f"[report_extraction] OCR.space page {i+1}: {len(png)//1024} KB")
            text = await _ocr_space_image(png, "image/png", f"page{i+1}.png")
            all_text.append(text)
        except Exception as e:
            print(f"[report_extraction] OCR.space page {i+1} failed: {e}")

    combined = "\n".join(all_text).strip()
    if not combined:
        return ExtractionResponse(success=False, error="OCR produced no text from any page")

    return await _run_text_llm_chain(combined)
