"""api/routes/report_extraction.py
Extracts clinical fields from uploaded PDF/image pathology reports using OCR + LLM.
Uses Gemini REST API directly (no SDK) to keep bundle size within Vercel's 500MB limit.
"""
from __future__ import annotations

import os
import json
import asyncio
import httpx
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/reports", tags=["report-extraction"])

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "helloworld")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_BASE_URL = "https://ollama.com/api"

# Gemini REST API — no SDK needed, just httpx
GEMINI_REST_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


class ExtractionResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None
    warning: str | None = None  # non-fatal: e.g. LLM quota hit, fell back to mock data


def get_llm_prompt(ocr_text: str) -> str:
    return f"""You are a medical data extraction specialist. Read the following pathology report text and extract the specific clinical fields.

Return ONLY a raw JSON object with no markdown, no code blocks, no explanation — just the JSON itself:
{{
  "patient": {{
    "name": "patient full name or empty string if not found",
    "age": 0,
    "sex": "Female or Male or Other or empty string"
  }},
  "tumour": {{
    "stage": "I or II or III or IV or empty string",
    "grade": 0,
    "size": 0.0,
    "lymph_nodes_involved": false,
    "node_count": 0
  }},
  "biomarkers": {{
    "er_status": "Positive or Negative or Unknown",
    "pr_status": "Positive or Negative or Unknown",
    "her2_status": "Positive or Negative or Unknown",
    "ki67_percent": 0,
    "brca1_status": "Positive or Negative or Unknown",
    "brca2_status": "Positive or Negative or Unknown",
    "tils_percent": 0,
    "oncotype_dx_score": 0
  }},
  "health": {{
    "lvef_percent": 0,
    "ecog_score": 0,
    "comorbidities": [],
    "medications": []
  }}
}}

PATHOLOGY REPORT TEXT:
{ocr_text}
"""


async def _call_gemini(url: str, payload: dict) -> dict:
    """Make one Gemini REST call and return the parsed response dict."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{url}?key={GEMINI_API_KEY}",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        res.raise_for_status()
        return res.json()


def _parse_gemini_response(data: dict) -> dict:
    content = data["candidates"][0]["content"]["parts"][0]["text"]
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return json.loads(content.strip())


async def extract_with_gemini(text: str) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    payload = {
        "contents": [{"parts": [{"text": get_llm_prompt(text)}]}],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }

    data = await _call_gemini(GEMINI_REST_URL, payload)
    return _parse_gemini_response(data)


async def extract_with_ollama(text: str) -> dict:
    if not OLLAMA_API_KEY:
        raise ValueError("OLLAMA_API_KEY not configured")

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{OLLAMA_BASE_URL}/chat",
            headers={"Authorization": f"Bearer {OLLAMA_API_KEY}"},
            json={
                "model": "llama3.1:70b",
                "messages": [{"role": "user", "content": get_llm_prompt(text)}],
                "stream": False,
                "format": "json"
            }
        )
        res.raise_for_status()
        result = res.json()
        content = result.get("message", {}).get("content", "{}")
        return json.loads(content.strip())


@router.post("/extract", response_model=ExtractionResponse)
async def extract_report(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # ── Step 1: Get text from file ──────────────────────────────────────────────
    try:
        content = await file.read()
        fname = file.filename.lower()

        # ── Plain text files — already readable, skip OCR entirely ──
        if fname.endswith(".txt"):
            print(f"[report_extraction] Text file detected — reading directly ({len(content)}B)")
            ocr_text = content.decode("utf-8", errors="replace")

        # ── Images / PDFs — need OCR ──
        else:
            # Guard: OCR.space free plan has a 1MB limit
            if len(content) > 1_000_000:
                return ExtractionResponse(success=False, error="File too large — please upload a file under 1MB")

            import base64
            b64 = base64.b64encode(content).decode("utf-8")

            if fname.endswith(".pdf"):
                file_type = "PDF"
            elif fname.endswith(".png"):
                file_type = "PNG"
            elif fname.endswith(".jpg") or fname.endswith(".jpeg"):
                file_type = "JPG"
            else:
                file_type = "AUTO"

            print(f"[report_extraction] OCR start — file={file.filename}, size={len(content)}B, type={file_type}")

            async with httpx.AsyncClient(timeout=25.0) as client:
                ocr_res = await client.post(
                    "https://api.ocr.space/parse/image",
                    data={
                        "apikey": OCR_SPACE_API_KEY,
                        "OCREngine": "2",
                        "base64Image": f"data:{file.content_type or 'application/octet-stream'};base64,{b64}",
                        "filetype": file_type,
                        "isTable": "false",
                        "scale": "true",
                    },
                )
                ocr_res.raise_for_status()
                ocr_json = ocr_res.json()

            print(f"[report_extraction] OCR response: IsErrored={ocr_json.get('IsErroredOnProcessing')}, pages={len(ocr_json.get('ParsedResults', []))}")

            if ocr_json.get("IsErroredOnProcessing"):
                err = ocr_json.get("ErrorMessage", ["Unknown OCR Error"])[0]
                print(f"[report_extraction] OCR failed: {err}")
                return ExtractionResponse(success=False, error=f"OCR failed: {err}")

            parsed_results = ocr_json.get("ParsedResults", [])
            if not parsed_results:
                return ExtractionResponse(success=False, error="No text found in document")

            ocr_text = "\n".join(page.get("ParsedText", "") for page in parsed_results)

    except httpx.TimeoutException as e:
        print(f"[report_extraction] OCR timed out: {e}")
        return ExtractionResponse(success=False, error="OCR timed out — try a smaller or clearer file")
    except Exception as e:
        print(f"[report_extraction] OCR exception: {type(e).__name__}: {e}")
        return ExtractionResponse(success=False, error=f"OCR processing failed: {str(e)}")

    if not ocr_text.strip():
        return ExtractionResponse(success=False, error="Extracted text is empty")

    print(f"[report_extraction] Text ready — {len(ocr_text)} chars")


    # ── Step 2: LLM — Gemini primary, Ollama fallback ─────────────────────────
    try:
        llm_warning: str | None = None
        try:
            structured_data = await extract_with_gemini(ocr_text)
        except Exception as e_gemini:
            print(f"[report_extraction] Gemini failed: {e_gemini}. Trying Ollama...")
            try:
                structured_data = await extract_with_ollama(ocr_text)
                llm_warning = f"Gemini unavailable ({type(e_gemini).__name__}: {str(e_gemini)[:120]}). Used Ollama fallback."
            except Exception as e_ollama:
                print(f"[report_extraction] Ollama also failed: {e_ollama}. Using mock data.")
                llm_warning = (
                    f"LLM extraction failed (Gemini: {str(e_gemini)[:80]} | "
                    f"Ollama: {str(e_ollama)[:80]}). Showing placeholder data — please fill fields manually."
                )
                structured_data = {
                    "patient": {"name": "", "age": 0, "sex": ""},
                    "tumour": {"stage": "", "grade": 0, "size": 0.0, "lymph_nodes_involved": False, "node_count": 0},
                    "biomarkers": {
                        "er_status": "Unknown", "pr_status": "Unknown", "her2_status": "Unknown",
                        "ki67_percent": 0, "brca1_status": "Unknown", "brca2_status": "Unknown",
                        "tils_percent": 0, "oncotype_dx_score": 0
                    },
                    "health": {
                        "lvef_percent": 0, "ecog_score": 0,
                        "comorbidities": [], "medications": []
                    }
                }

        return ExtractionResponse(success=True, data=structured_data, warning=llm_warning)

    except Exception as e:
        return ExtractionResponse(success=False, error=f"LLM extraction failed: {str(e)}")
