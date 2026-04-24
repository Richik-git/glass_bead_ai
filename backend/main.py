from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional # Import this for safer types
import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporarily allow all for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- THE FIX: Use Optional and a default value ---
class ExploreRequest(BaseModel):
    topic: str
    context: Optional[str] = None 

def extract_json(text):
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else None

def generate_explanation_and_connections(topic, context=None):
    context_instruction = f"Specifically, explain how this relates back to {context}." if context else ""
    
    prompt = f"""
    Explain "{topic}" using a simple real-world analogy.
    {context_instruction}
    
    Return ONLY valid JSON:
    {{
      "explanation": "Think of {topic} as...",
      "connections": [
        {{
          "label": "Concept",
          "domain": "Field",
          "relation": "Link",
          "explanation": "Comparison"
        }}
      ]
    }}
    """

    response = client.chat.completions.create(
        model="deepseek/deepseek-chat",
        messages=[
            {"role": "system", "content": "You are a teacher who explains concepts through analogies."},
            {"role": "user", "content": prompt}
        ],
        response_format={ "type": "json_object" },
        max_tokens=1000,
        temperature=0.5
    )
    return response.choices[0].message.content

@app.post("/explore")
async def explore_topic(request: ExploreRequest):
    try:
        # Debug print to see what's actually arriving in your terminal
        print(f"RECEIVED DATA: topic={request.topic}, context={request.context}")
        
        raw_result = generate_explanation_and_connections(request.topic, request.context)
        clean_json = extract_json(raw_result)
        
        if not clean_json:
            return {"error": "AI failed to format JSON"}

        data = json.loads(clean_json)

        # Build Graph Data
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
        print(f"ERROR: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)