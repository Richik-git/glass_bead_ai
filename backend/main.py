from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# ---------- CORS CONFIG ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request Model ----------
class ExploreRequest(BaseModel):
    topic: str


# ---------- API Endpoints ----------
@app.get("/")
def read_root():
    return {"message": "Glass Bead AI backend is running"}


@app.post("/explore")
def explore_topic(request: ExploreRequest):
    topic = request.topic

    return {
        "input_concept": topic,
        "nodes": [
            {
                "id": "concept_1",
                "label": topic,
                "domain": "Mathematics"
            },
            {
                "id": "concept_2",
                "label": "Harmonic Analysis",
                "domain": "Music"
            }
        ],
        "edges": [
            {
                "source": "concept_1",
                "target": "concept_2",
                "type": "Structural Decomposition",
                "explanation": "Both break complex patterns into simpler components to understand the whole.",
                "confidence": 0.91
            }
        ]
    }
