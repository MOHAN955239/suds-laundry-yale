import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Suds ML")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "model/suds_model.joblib"

if not os.path.exists(MODEL_PATH):
    raise RuntimeError("Model not found. Run `python train.py` first.")

model = joblib.load(MODEL_PATH)


class PredictRequest(BaseModel):
    machine_type: str
    hour: int
    day_of_week: int
    minutes_since_report: int


class PredictResponse(BaseModel):
    minutes_until_available: float
    confidence: float


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    mt = 0 if req.machine_type == "washer" else 1
    X = pd.DataFrame([{
        "hour": req.hour,
        "day_of_week": req.day_of_week,
        "machine_type": mt,
        "minutes_since_report": req.minutes_since_report,
    }])
    minutes = float(max(1.0, model.predict(X)[0]))
    confidence = float(max(0.4, min(0.95, 1.0 - minutes / 200)))
    return PredictResponse(
        minutes_until_available=round(minutes, 1),
        confidence=round(confidence, 2),
    )
