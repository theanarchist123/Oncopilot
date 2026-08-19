import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

async def test_ollama():
    try:
        print("Testing Ollama API...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://ollama.com/api/chat",
                headers={"Authorization": f"Bearer {OLLAMA_API_KEY}"} if OLLAMA_API_KEY else {},
                json={
                    "model": "llama3.1",
                    "messages": [{"role": "user", "content": "Say hello"}],
                    "stream": False
                }
            )
            print(f"Ollama Response Status: {res.status_code}")
            if res.status_code == 200:
                print("Ollama is working.")
            else:
                print(f"Ollama error: {res.text}")
    except Exception as e:
        print(f"Ollama exception: {e}")

async def test_gemini():
    try:
        print("Testing Gemini API...")
        if not GEMINI_API_KEY:
            print("No GEMINI_API_KEY found.")
            return
        
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content("Say hello")
        print(f"Gemini Response: {response.text}")
    except Exception as e:
        print(f"Gemini exception: {e}")

async def main():
    await test_ollama()
    await test_gemini()

if __name__ == "__main__":
    asyncio.run(main())
