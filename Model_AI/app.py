"""
==========================================================
  JABARULIN AI — FastAPI Backend Server
  Sistem Rekomendasi Wisata Cerdas Jawa Barat
  
  Hybrid Architecture:
  IndoBERT (Intent Classification) + TF-IDF (Recommendation Retrieval)
  + Cosine Similarity (Similarity Search) + Weighted Score (Ranking)
==========================================================
"""

import os
import pickle
import logging
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ============================================================
# Logging Configuration
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("jabarulin-ai")

# ============================================================
# Global State — Diisi saat startup via lifespan
# ============================================================
ai_engine: dict = {}

# ============================================================
# Path Configuration
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HF_MODEL_NAME = "Dhaffa/jabarulin-indobert"
DATASET_PATH = os.path.join(BASE_DIR, "dataset_final_jabarulin.csv")
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder.pkl")


# ============================================================
# Pydantic Models — Request & Response Schemas
# ============================================================
class RecommendRequest(BaseModel):
    """Schema untuk request rekomendasi wisata."""
    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Kalimat bahasa natural dari user, misal: 'pengen ke pantai yang sepi buat healing'",
        json_schema_extra={"examples": ["pengen ke pantai yang sepi buat healing"]},
    )
    top_n: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Jumlah rekomendasi yang diinginkan (1-20)",
    )


class IntentRequest(BaseModel):
    """Schema untuk request prediksi intent saja."""
    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Kalimat bahasa natural untuk diprediksi intent-nya",
        json_schema_extra={"examples": ["rafting dan offroad seru"]},
    )


class RecommendationItem(BaseModel):
    """Schema satu item rekomendasi wisata."""
    name: str
    category: str
    intent_label: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    total_reviews: Optional[int] = None
    google_maps_url: Optional[str] = None
    similarity_score: float
    final_score: float


class RecommendResponse(BaseModel):
    """Schema response endpoint /recommend."""
    status: str
    query: str
    predicted_intent: str
    recommendation_type: str
    total_results: int
    recommendations: list[RecommendationItem]


class IntentResponse(BaseModel):
    """Schema response endpoint /predict-intent."""
    status: str
    query: str
    predicted_intent: str
    confidence_scores: dict[str, float]


class HealthResponse(BaseModel):
    """Schema response endpoint /health."""
    status: str
    model_loaded: bool
    dataset_loaded: bool
    total_destinations: int
    available_intents: list[str]
    device: str


# ============================================================
# Lifespan — Load Semua Model & Data Saat Startup
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load AI models dan dataset saat server startup."""
    logger.info("=" * 60)
    logger.info("🚀 JABARULIN AI — Memulai Loading Resources...")
    logger.info("=" * 60)

    # --- 1. Deteksi Device (GPU/CPU) ---
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"📱 Device: {device}")

    # --- 2. Load IndoBERT Model & Tokenizer dari Hugging Face ---
    logger.info(f"🧠 Loading IndoBERT Model & Tokenizer dari Hugging Face ({HF_MODEL_NAME})...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(HF_MODEL_NAME)
        model.to(device)
        model.eval()
        logger.info("✅ IndoBERT Model berhasil dimuat!")
    except Exception as e:
        logger.error(f"❌ Gagal memuat IndoBERT Model: {e}")
        raise RuntimeError(f"Model loading failed: {e}")

    # --- 3. Load Label Encoder ---
    logger.info("🏷️  Loading Label Encoder...")
    try:
        with open(LABEL_ENCODER_PATH, "rb") as f:
            label_encoder = pickle.load(f)
        logger.info(f"✅ Label Encoder dimuat! Classes: {list(label_encoder.classes_)}")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Label Encoder: {e}")
        raise RuntimeError(f"Label encoder loading failed: {e}")

    # --- 4. Load & Preprocess Dataset ---
    logger.info("📊 Loading Dataset...")
    try:
        df = pd.read_csv(DATASET_PATH)
        tourism_df = df[
            ["name", "category", "intent_label", "rating", "cleaned_reviews",
             "address", "phone", "website", "total_reviews", "google_maps_url"]
        ].copy()
        tourism_df["name"] = tourism_df["name"].astype(str).str.title().str.strip()
        tourism_df["rating"] = tourism_df["rating"].fillna(tourism_df["rating"].mean())
        tourism_df["cleaned_reviews"] = tourism_df["cleaned_reviews"].fillna("")
        tourism_df["address"] = tourism_df["address"].fillna("")
        tourism_df["phone"] = tourism_df["phone"].fillna("")
        tourism_df["website"] = tourism_df["website"].fillna("")
        tourism_df["google_maps_url"] = tourism_df["google_maps_url"].fillna("")
        tourism_df["total_reviews"] = tourism_df["total_reviews"].fillna(0).astype(int)
        logger.info(f"✅ Dataset dimuat! {len(tourism_df)} baris, {tourism_df['name'].nunique()} destinasi unik")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Dataset: {e}")
        raise RuntimeError(f"Dataset loading failed: {e}")

    # --- 5. Build Global TF-IDF Matrix (untuk Fallback) ---
    logger.info("📐 Building Global TF-IDF Matrix...")
    tfidf_global = TfidfVectorizer(stop_words=None, ngram_range=(1, 2))
    tfidf_matrix_global = tfidf_global.fit_transform(tourism_df["cleaned_reviews"])
    logger.info(f"✅ Global TF-IDF Matrix: {tfidf_matrix_global.shape}")

    # --- 6. Simpan ke Global State ---
    ai_engine["device"] = device
    ai_engine["model"] = model
    ai_engine["tokenizer"] = tokenizer
    ai_engine["label_encoder"] = label_encoder
    ai_engine["tourism_df"] = tourism_df
    ai_engine["tfidf_global"] = tfidf_global
    ai_engine["tfidf_matrix_global"] = tfidf_matrix_global

    logger.info("=" * 60)
    logger.info("✅ JABARULIN AI — Semua Resources Berhasil Dimuat!")
    logger.info("📍 Swagger UI: http://localhost:8000/docs")
    logger.info("=" * 60)

    yield  # Server berjalan di sini

    # --- Cleanup saat shutdown ---
    logger.info("🛑 JABARULIN AI — Server shutting down...")
    ai_engine.clear()


# ============================================================
# FastAPI App Initialization
# ============================================================
app = FastAPI(
    title="Jabarulin AI API",
    description=(
        "🌴 **Sistem Rekomendasi Wisata Cerdas Jawa Barat** — Capstone Project PJK-GM049\n\n"
        "API ini menggunakan arsitektur Hybrid AI:\n"
        "- **IndoBERT** → Intent Classification (memahami makna kalimat)\n"
        "- **TF-IDF + Cosine Similarity** → Recommendation Retrieval\n"
        "- **Weighted Score** → 70% kecocokan teks + 30% rating Google Maps\n\n"
        "Kirim kalimat bahasa natural ke `/api/recommend` dan dapatkan rekomendasi wisata terbaik! 🚀"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Izinkan semua origin (sesuaikan di production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Core AI Functions
# ============================================================
def predict_intent(user_input: str) -> tuple[str, dict[str, float]]:
    model = ai_engine["model"]
    tokenizer = ai_engine["tokenizer"]
    label_encoder = ai_engine["label_encoder"]
    device = ai_engine["device"]

    inputs = tokenizer(
        user_input,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=64,
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
    predicted_class_id = probs.argmax().item()
    predicted_intent = label_encoder.inverse_transform([predicted_class_id])[0]

    confidence_scores = {}
    for idx, label in enumerate(label_encoder.classes_):
        confidence_scores[label] = round(probs[idx].item(), 4)

    return predicted_intent, confidence_scores


def global_recommendation(
    user_input: str, top_n: int = 5, similarity_threshold: float = 0.03
) -> pd.DataFrame:
    tourism_df = ai_engine["tourism_df"]
    tfidf_global = ai_engine["tfidf_global"]
    tfidf_matrix_global = ai_engine["tfidf_matrix_global"]

    user_vector = tfidf_global.transform([user_input])
    similarity_scores = cosine_similarity(user_vector, tfidf_matrix_global).flatten()

    global_df = tourism_df.copy()
    global_df["similarity_score"] = similarity_scores
    global_df = global_df[global_df["similarity_score"] > similarity_threshold].copy()

    if global_df.empty:
        return pd.DataFrame()

    global_df["final_score"] = (global_df["similarity_score"] * 0.7) + (
        (global_df["rating"] / 5) * 0.3
    )
    global_df = global_df.sort_values(by="final_score", ascending=False).drop_duplicates(
        subset="name"
    )

    recommendations = global_df.head(top_n).copy()
    recommendations[["similarity_score", "final_score"]] = recommendations[
        ["similarity_score", "final_score"]
    ].round(3)
    recommendations["rating"] = recommendations["rating"].round(1)

    return recommendations


def hybrid_recommendation(
    user_input: str, top_n: int = 5, similarity_threshold: float = 0.05
) -> tuple[pd.DataFrame, str, str]:
    tourism_df = ai_engine["tourism_df"]
    predicted_intent, _ = predict_intent(user_input)

    filtered_df = tourism_df[tourism_df["intent_label"] == predicted_intent].copy()

    filtered_tfidf = TfidfVectorizer(stop_words=None, ngram_range=(1, 2))
    filtered_matrix = filtered_tfidf.fit_transform(filtered_df["cleaned_reviews"])
    user_vector = filtered_tfidf.transform([user_input])

    similarity_scores = cosine_similarity(user_vector, filtered_matrix).flatten()
    filtered_df["similarity_score"] = similarity_scores
    filtered_df = filtered_df[filtered_df["similarity_score"] > similarity_threshold].copy()

    recommendation_type = "hybrid"
    if len(filtered_df) < top_n:
        logger.info(
            f"⚠️ Data kurang (hanya {len(filtered_df)} hasil), fallback ke Global Recommendation..."
        )
        recommendation_type = "global_fallback"
        return (
            global_recommendation(user_input, top_n, similarity_threshold=0.03),
            predicted_intent,
            recommendation_type,
        )

    filtered_df["final_score"] = (filtered_df["similarity_score"] * 0.7) + (
        (filtered_df["rating"] / 5) * 0.3
    )
    filtered_df = filtered_df.sort_values(by="final_score", ascending=False).drop_duplicates(
        subset="name"
    )

    recommendations = filtered_df.head(top_n).copy()
    recommendations[["similarity_score", "final_score"]] = recommendations[
        ["similarity_score", "final_score"]
    ].round(3)
    recommendations["rating"] = recommendations["rating"].round(1)

    return recommendations, predicted_intent, recommendation_type


def df_to_recommendation_items(df: pd.DataFrame) -> list[RecommendationItem]:
    items = []
    for _, row in df.iterrows():
        items.append(
            RecommendationItem(
                name=str(row["name"]),
                category=str(row["category"]),
                intent_label=str(row["intent_label"]),
                address=str(row.get("address", "")) or None,
                phone=str(row.get("phone", "")) or None,
                website=str(row.get("website", "")) or None,
                rating=round(float(row["rating"]), 1) if pd.notna(row["rating"]) else None,
                total_reviews=int(row.get("total_reviews", 0)) if pd.notna(row.get("total_reviews")) else None,
                google_maps_url=str(row.get("google_maps_url", "")) or None,
                similarity_score=round(float(row["similarity_score"]), 3),
                final_score=round(float(row["final_score"]), 3),
            )
        )
    return items


# ============================================================
# API Endpoints
# ============================================================
@app.get("/api/", tags=["General"])
async def root():
    return {
        "name": "Jabarulin AI API",
        "version": "1.0.0",
        "description": "Sistem Rekomendasi Wisata Cerdas Jawa Barat berbasis NLP & AI",
    }


@app.get("/api/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    model_loaded = "model" in ai_engine
    dataset_loaded = "tourism_df" in ai_engine
    return HealthResponse(
        status="healthy" if (model_loaded and dataset_loaded) else "degraded",
        model_loaded=model_loaded,
        dataset_loaded=dataset_loaded,
        total_destinations=ai_engine["tourism_df"]["name"].nunique() if dataset_loaded else 0,
        available_intents=list(ai_engine["label_encoder"].classes_) if model_loaded else [],
        device=str(ai_engine.get("device", "unknown")),
    )


@app.post("/api/recommend", response_model=RecommendResponse, tags=["AI Recommendation"])
async def recommend(request: RecommendRequest):
    if "model" not in ai_engine:
        raise HTTPException(status_code=503, detail="Model AI belum dimuat. Tunggu beberapa saat.")

    logger.info(f"📨 Request: '{request.query}' (top_n={request.top_n})")
    try:
        recommendations_df, predicted_intent, recommendation_type = hybrid_recommendation(
            request.query, top_n=request.top_n
        )
    except Exception as e:
        logger.error(f"❌ Error saat processing: {e}")
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat memproses rekomendasi: {str(e)}")

    if recommendations_df.empty:
        return RecommendResponse(
            status="success",
            query=request.query,
            predicted_intent=predicted_intent,
            recommendation_type=recommendation_type,
            total_results=0,
            recommendations=[],
        )

    items = df_to_recommendation_items(recommendations_df)
    logger.info(
        f"✅ Response: intent={predicted_intent}, type={recommendation_type}, results={len(items)}"
    )

    return RecommendResponse(
        status="success",
        query=request.query,
        predicted_intent=predicted_intent,
        recommendation_type=recommendation_type,
        total_results=len(items),
        recommendations=items,
    )


@app.post("/api/predict-intent", response_model=IntentResponse, tags=["AI Recommendation"])
async def predict_intent_endpoint(request: IntentRequest):
    if "model" not in ai_engine:
        raise HTTPException(status_code=503, detail="Model AI belum dimuat. Tunggu beberapa saat.")
    try:
        predicted_intent, confidence_scores = predict_intent(request.query)
    except Exception as e:
        logger.error(f"❌ Error saat prediksi intent: {e}")
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat prediksi intent: {str(e)}")

    return IntentResponse(
        status="success",
        query=request.query,
        predicted_intent=predicted_intent,
        confidence_scores=confidence_scores,
    )


@app.get("/api/intents", tags=["Data Reference"])
async def get_intents():
    if "label_encoder" not in ai_engine:
        raise HTTPException(status_code=503, detail="Model belum dimuat.")
    return {
        "status": "success",
        "total": len(ai_engine["label_encoder"].classes_),
        "intents": list(ai_engine["label_encoder"].classes_),
    }


@app.get("/api/categories", tags=["Data Reference"])
async def get_categories():
    if "tourism_df" not in ai_engine:
        raise HTTPException(status_code=503, detail="Dataset belum dimuat.")
    tourism_df = ai_engine["tourism_df"]
    categories = sorted(tourism_df["category"].dropna().unique().tolist())
    return {
        "status": "success",
        "total": len(categories),
        "categories": categories,
    }


# ============================================================
# Entry Point — Jalankan dengan: python app.py
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
