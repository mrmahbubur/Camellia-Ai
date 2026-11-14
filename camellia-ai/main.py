import json
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None
MODEL = os.getenv("GEMINI_MODEL", "gemini-4-hydrogen")

SYSTEM_INSTRUCTION = """
You are Camellia, a general-purpose AI assistant built by M R S,
powered by Google Gemini.

Your work is like ChatGPT and Claude:
- Answer questions and explain topics clearly
- Write, edit, summarize, and translate text
- Write, debug, and explain code
- Help with math, study, planning, and creative work

Rules:
- Your name is Camellia. Your creator is M R S.
- If asked who made you, say: "I am Camellia, built by M R S."
- Be warm, clear, and helpful. Match the user's language.
- If you don't know something, say so honestly. Never invent facts.
"""

app = FastAPI(title="Camellia AI", description="AI Assistant of M R S")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str  # "user" or "assistant" or "model"
    content: str | None = None
    text: str | None = None


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []
    model: str | None = None
    webSearchEnabled: bool = True
    systemInstruction: str | None = None
    language: str | None = None


def build_contents(req: ChatRequest) -> list[dict]:
    contents = []
    for m in req.history:
        msg_text = (m.content if m.content is not None else m.text) or ""
        if not msg_text.strip():
            continue
        role = "model" if m.role in ("assistant", "model") else "user"
        contents.append({"role": role, "parts": [{"text": msg_text}]})

    contents.append({"role": "user", "parts": [{"text": req.message}]})
    return contents


@app.get("/")
def home():
    return {"name": "Camellia", "creator": "M R S", "status": "running"}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": "Camellia AI",
        "creator": "M R S",
        "hasApiKey": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.get("/api/voice/config")
def voice_config():
    return {
        "voice": {
            "provider": "Camellia Voice Engine",
            "name": "Claude AI Female Voice",
            "gender": "female",
            "preferredLang": "en-US",
            "rate": 1.0,
            "pitch": 1.04,
            "volume": 1.0,
            "persona": "Calm, articulate female assistant voice",
            "description": "On-demand message narration supporting English and Bengali.",
            "priorityVoices": [
                "Google UK English Female",
                "Microsoft Sonia Online (Natural) - English (United Kingdom)",
                "Microsoft Jenny Online (Natural) - English (United States)",
                "Samantha",
                "Serena",
                "Google US English Female",
            ],
        }
    }


@app.get("/api/models")
def public_models():
    return {
        "defaultModelId": MODEL,
        "enforceFreeModelsOnly": False,
        "freeOnlyApplied": False,
        "configuredProviders": {"gemini": bool(api_key), "anthropic": False, "openrouter": False},
        "models": [
            {
                "id": MODEL,
                "provider": "gemini",
                "name": MODEL,
                "tag": "Default · Grounded",
                "description": "Primary Google Gemini model.",
                "pricingTier": "free",
                "pricingNote": "Free tier / quota limited",
                "capabilities": {"streaming": True, "searchGrounding": True, "thinking": True, "multimodal": True},
                "isDefault": True,
                "providerConfigured": bool(api_key),
            }
        ],
    }


@app.post("/chat")
def chat(req: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")

    contents = build_contents(req)
    instruction = (req.systemInstruction or "").strip() or SYSTEM_INSTRUCTION

    try:
        response = client.models.generate_content(
            model=req.model or MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=instruction,
                max_output_tokens=8192,
            ),
        )
        return {"name": "Camellia", "reply": response.text}
    except Exception:
        raise HTTPException(status_code=500, detail="Camellia is temporarily unavailable. Please try again.")


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")

    contents = build_contents(req)
    instruction = (req.systemInstruction or "").strip() or SYSTEM_INSTRUCTION
    if req.language in ("bn", "bengali"):
        instruction += "\nAlways reply in natural, fluent Bengali unless explicitly asked otherwise."
    elif req.language in ("en", "english"):
        instruction += "\nAlways reply in clear, professional English."

    selected_model = req.model or MODEL

    def event_generator():
        try:
            tools = [{"google_search": {}}] if req.webSearchEnabled and selected_model != "gemini-3.1-flash-lite" else None
            config = types.GenerateContentConfig(
                system_instruction=instruction,
                tools=tools,
            )
            stream = client.models.generate_content_stream(
                model=selected_model,
                contents=contents,
                config=config,
            )
            for chunk in stream:
                if getattr(chunk, "text", None):
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            yield f"data: {json.dumps({'done': True, 'modelUsed': selected_model, 'modelIdUsed': selected_model, 'providerUsed': 'gemini', 'pricingTier': 'free', 'sources': [], 'searchQueries': []})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': f'Camellia is temporarily unavailable: {exc}', 'errorType': 'network'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
