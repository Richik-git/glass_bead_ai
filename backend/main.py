from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import json
import re
from dotenv import load_dotenv
from groq import Groq  # 👈 Change 1: Import Groq

load_dotenv()

# 👈 Change 2: Initialize Groq Client
client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExploreRequest(BaseModel):
    topic: str
    context: Optional[str] = None 

def extract_json(text):
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else None

def generate_explanation_and_connections(topic, context=None):
    context_instruction = f"Specifically link this back to {context}." if context else ""
    
    prompt = f"""
    Explain "{topic}" using a direct real-world analogy.
    
    TASK: 
    1. Provide a core analogy for "{topic}".
    2. Identify 4 NEW concepts from COMPLETELY DIFFERENT domains (e.g., if the topic is IT, pick something from Art, History, or Biology) that use the same logic as "{topic}".
    
    STRICT RULE: The 'label' in connections MUST NOT be the word "{topic}". It must be a different concept.

    Return ONLY JSON:
    {{
      "explanation": "...",
      "connections": [
        {{
          "label": "Name of Different Concept(Known Intuitive Concept)", 
          "domain": "Common Known Field",
          "relation": "Why they are similar (in simple words)",
          "explanation": "Brief metaphor linking them."
        }}
      ]
    }}
    """

    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a teacher who explains complex ideas using simple, 3-point analogies. You follow formatting instructions exactly."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        temperature=0.5, # Slightly higher to allow for descriptive language
        max_tokens=800,  
    )
    return chat_completion.choices[0].message.content

@app.post("/explore")
async def explore_topic(request: ExploreRequest):
    try:
        print(f"GROQ SEARCH: {request.topic}")
        raw_result = generate_explanation_and_connections(request.topic, request.context)
        clean_json = extract_json(raw_result)
        
        if not clean_json:
            return {"error": "AI failed to format JSON"}

        data = json.loads(clean_json)

        nodes = [{"id": "main", "label": request.topic, "domain": "Core Concept"}]
        edges = []

        for i, conn in enumerate(data.get("connections", [])):
            node_id = f"rel_{i}"
            nodes.append({
                "id": node_id,
                "label": conn.get("label", "Related"),
                "domain": conn.get("domain", "Default"),
                "explanation": conn.get("explanation", "")
            })
            edges.append({
                "source": "main",
                "target": node_id,
                "type": conn.get("relation", "connected")
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "story": data.get("explanation", "No explanation generated.")
        }
    except Exception as e:
        print(f"GROQ ERROR: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)