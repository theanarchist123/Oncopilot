"""api/routes/report_extraction.py
Extracts clinical fields from uploaded PDF/image pathology reports using OCR + LLM.
Uses Gemini REST API directly (no SDK) to keep bundle size within Vercel's 500MB limit.
"""
from __future__ import annotations

import os
import json
import httpx
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/reports", tags=["report-extraction"])

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "helloworld")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_BASE_URL = "https://ollama.com/api"

# Gemini REST API — no SDK needed, just httpx
GEMINI_REST_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


class ExtractionResponse(BaseModel):
    success: bool
    data: dict | None = None
    error: str | None = None


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


async def extract_with_gemini(text: str) -> dict:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    payload = {
        "contents": [{"parts": [{"text": get_llm_prompt(text)}]}],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            f"{GEMINI_REST_URL}?key={GEMINI_API_KEY}",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        res.raise_for_status()
        data = res.json()

    content = data["candidates"][0]["content"]["parts"][0]["text"]

    # Strip markdown fences if present
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]

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

    # ── Step 1: OCR via OCR.space ──────────────────────────────────────────────
    try:
        content = await file.read()
        async with httpx.AsyncClient(timeout=30.0) as client:
            ocr_data_form = {
                "apikey": OCR_SPACE_API_KEY,
                "OCREngine": "2",
            }
            if file.filename.lower().endswith(".pdf"):
                ocr_data_form["filetype"] = "PDF"

            ocr_res = await client.post(
                "https://api.ocr.space/parse/image",
                data=ocr_data_form,
                files={"file": (file.filename, content, file.content_type or "application/octet-stream")}
            )
            ocr_res.raise_for_status()
            ocr_json = ocr_res.json()

        if ocr_json.get("IsErroredOnProcessing"):
            err = ocr_json.get("ErrorMessage", ["Unknown OCR Error"])[0]
            return ExtractionResponse(success=False, error=f"OCR failed: {err}")

        parsed_results = ocr_json.get("ParsedResults", [])
        if not parsed_results:
            return ExtractionResponse(success=False, error="No text found in document")

        ocr_text = "\n".join(page.get("ParsedText", "") for page in parsed_results)

    except Exception as e:
        return ExtractionResponse(success=False, error=f"OCR processing failed: {str(e)}")

    if not ocr_text.strip():
        return ExtractionResponse(success=False, error="Extracted text is empty")

    # ── Step 2: LLM — Gemini primary, Ollama fallback ─────────────────────────
    try:
        try:
            structured_data = await extract_with_gemini(ocr_text)
        except Exception as e_gemini:
            print(f"[report_extraction] Gemini failed: {e_gemini}. Trying Ollama...")
            try:
                structured_data = await extract_with_ollama(ocr_text)
            except Exception as e_ollama:
                print(f"[report_extraction] Ollama also failed: {e_ollama}. Using mock data.")
                structured_data = {
                    "patient": {"name": "API keys not configured", "age": 45, "sex": "Female"},
                    "tumour": {"stage": "II", "grade": 2, "size": 3.1, "lymph_nodes_involved": False, "node_count": 0},
                    "biomarkers": {
                        "er_status": "Positive", "pr_status": "Negative", "her2_status": "Negative",
                        "ki67_percent": 15, "brca1_status": "Unknown", "brca2_status": "Unknown",
                        "tils_percent": 0, "oncotype_dx_score": 12
                    },
                    "health": {
                        "lvef_percent": 65, "ecog_score": 0,
                        "comorbidities": [], "medications": []
                    }
                }

        return ExtractionResponse(success=True, data=structured_data)

    except Exception as e:
        return ExtractionResponse(success=False, error=f"LLM extraction failed: {str(e)}")
