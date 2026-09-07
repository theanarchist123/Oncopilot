import asyncio, os, sys, re, json, base64, httpx
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not found in environment.")
    sys.exit(1)

GEMINI_VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
MAX_VISION_PAGES = 8

SCHEMA = """{
  "patient": {"name": "", "age": 0, "sex": ""},
  "tumour": {"stage": "", "grade": 0, "size": 0.0, "lymph_nodes_involved": false, "node_count": 0},
  "biomarkers": {"er_status": "Unknown", "pr_status": "Unknown", "her2_status": "Unknown", "ki67_percent": 0, "brca1_status": "Unknown", "brca2_status": "Unknown", "tils_percent": 0, "oncotype_dx_score": 0},
  "health": {"lvef_percent": 0, "ecog_score": 0, "comorbidities": [], "medications": []}
}"""

PROMPT = "You are a medical data extraction specialist. Extract clinical fields from these medical report pages. Return ONLY raw JSON with this schema:\n" + SCHEMA

async def test():
    import fitz
    for fname in [
        r"d:\oncopilot\MUM03783293_INVST-RPT (1).PDF",
        r"d:\oncopilot\c0b0b9f1-18f0-4c0c-b40a-9c04d4293082 (2).pdf"
    ]:
        print(f"\n=== {fname[-40:]} ===")
        with open(fname, "rb") as f:
            pdf_bytes = f.read()

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        n_pages = min(len(doc), MAX_VISION_PAGES)

        mat = fitz.Matrix(1.5, 1.5)
        parts = [{"text": PROMPT}]
        total_kb = 0
        for i in range(n_pages):
            pix = doc[i].get_pixmap(matrix=mat)
            png = pix.tobytes("png")
            total_kb += len(png) // 1024
            b64 = base64.b64encode(png).decode()
            parts.append({"inlineData": {"mimeType": "image/png", "data": b64}})
            print(f"  Page {i+1}: {len(png)//1024} KB")

        print(f"Total payload: {total_kb} KB")

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(
                GEMINI_VISION_URL + "?key=" + GEMINI_API_KEY,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            print(f"HTTP status: {res.status_code}")
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text.strip())
                print("EXTRACTED:")
                print(json.dumps(parsed, indent=2))
            else:
                print("Error:", res.text[:800])

asyncio.run(test())
