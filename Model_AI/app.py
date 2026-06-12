"""
==========================================================
  JABARULIN AI — FastAPI Backend Server
  Sistem Rekomendasi Wisata Cerdas Jawa Barat
  
  Hybrid Architecture:
  Semantic Review-Based Recommendation (SentenceTransformer)
  + Academic Model (TF-IDF + Logistic Regression)
  + Cosine Similarity + Negation Filtering + Hybrid Ranking
==========================================================
"""

import os
import re
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
from sentence_transformers import SentenceTransformer

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
SBERT_MODEL_PATH = os.path.join(BASE_DIR, "sbert_model")
EMBEDDINGS_PATH = os.path.join(BASE_DIR, "review_embeddings.pkl")
DATASET_PATH = os.path.join(BASE_DIR, "processed_dataset.csv")
TFIDF_PATH = os.path.join(BASE_DIR, "tfidf_vectorizer.pkl")
LR_MODEL_PATH = os.path.join(BASE_DIR, "logistic_regression_model.pkl")
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder_category.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "reviews_scaler.pkl")

# Keyword yang akan dicek di kolom name dan category untuk negation filtering
GROUP_FILTER_KEYWORDS = {
    'gunung': ['gunung', 'gn ', 'gn.', 'puncak', 'kawah', 'mendaki'],
    'pantai': ['pantai', 'beach', 'pesisir'],
    'camping': ['camping', 'camp', 'kemah', 'glamping', 'perkemahan'],
    'adventure': ['rafting', 'offroad', 'arung jeram', 'adventure'],
    'keluarga': ['zoo', 'kebun binatang'],
    'healing': ['spa', 'pemandian', 'hot spring'],
}

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
    reviews: Optional[list[str]] = None


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
    logger.info("🚀 JABARULIN AI (v2.0) — Memulai Loading Resources...")
    logger.info("=" * 60)

    # --- 1. Deteksi Device (GPU/CPU) ---
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"📱 Device: {device}")

    # --- 2. Load SentenceTransformer Model ---
    # Gunakan folder lokal jika ada config.json (model lokal lengkap), jika tidak, load dari Hugging Face
    is_local = os.path.exists(os.path.join(SBERT_MODEL_PATH, "config.json"))
    
    if is_local:
        logger.info(f"🧠 Loading SentenceTransformer Model dari folder lokal ({SBERT_MODEL_PATH})...")
        try:
            sbert_model = SentenceTransformer(SBERT_MODEL_PATH, device=str(device))
            logger.info(f"✅ SentenceTransformer Model ({SBERT_MODEL_PATH}) berhasil dimuat!")
        except Exception as e:
            logger.error(f"❌ Gagal memuat SentenceTransformer Model ({SBERT_MODEL_PATH}): {e}")
            raise RuntimeError(f"SentenceTransformer loading failed: {e}")
    else:
        hf_repo = os.getenv("SBERT_MODEL_NAME", "Dhaffa/jabarulin-semantic-model")
        hf_subfolder = os.getenv("SBERT_MODEL_SUBFOLDER", "sbert_model")
        logger.info(f"🧠 Loading SentenceTransformer Model dari Hugging Face Hub ({hf_repo}), subfolder: {hf_subfolder}...")
        try:
            sbert_model = SentenceTransformer(hf_repo, subfolder=hf_subfolder, device=str(device))
            logger.info(f"✅ SentenceTransformer Model ({hf_repo}/{hf_subfolder}) berhasil dimuat!")
        except Exception as e:
            logger.error(f"❌ Gagal memuat SentenceTransformer Model ({hf_repo}/{hf_subfolder}): {e}")
            raise RuntimeError(f"SentenceTransformer loading failed: {e}")

    # --- 3. Load Embeddings ---
    logger.info("🧠 Loading Review Embeddings...")
    try:
        with open(EMBEDDINGS_PATH, "rb") as f:
            review_embeddings = pickle.load(f)
        logger.info(f"✅ Review Embeddings dimuat! Shape: {review_embeddings.shape}")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Review Embeddings: {e}")
        raise RuntimeError(f"Review embeddings loading failed: {e}")

    # --- 4. Load & Preprocess Dataset ---
    logger.info("📊 Loading Dataset...")
    try:
        df = pd.read_csv(DATASET_PATH)
        # Samakan intent_label dengan category_group untuk kompatibilitas frontend
        df['intent_label'] = df['category_group']
        
        tourism_df = df[
            ["name", "category", "intent_label", "category_group", "rating", "cleaned_reviews", "all_reviews",
             "address", "phone", "website", "total_reviews", "google_maps_url"]
        ].copy()
        tourism_df["name"] = tourism_df["name"].astype(str).str.title().str.strip()
        tourism_df["rating"] = tourism_df["rating"].fillna(tourism_df["rating"].mean())
        tourism_df["cleaned_reviews"] = tourism_df["cleaned_reviews"].fillna("")
        tourism_df["all_reviews"] = tourism_df["all_reviews"].fillna("")
        tourism_df["address"] = tourism_df["address"].fillna("")
        tourism_df["phone"] = tourism_df["phone"].fillna("")
        tourism_df["website"] = tourism_df["website"].fillna("")
        tourism_df["google_maps_url"] = tourism_df["google_maps_url"].fillna("")
        tourism_df["total_reviews"] = tourism_df["total_reviews"].fillna(0).astype(int)
        
        logger.info(f"✅ Dataset dimuat! {len(tourism_df)} baris, {tourism_df['name'].nunique()} destinasi unik")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Dataset: {e}")
        raise RuntimeError(f"Dataset loading failed: {e}")

    # --- 5. Load Scaler & Normalise columns ---
    logger.info("⚖️ Loading Reviews Scaler...")
    try:
        with open(SCALER_PATH, "rb") as f:
            reviews_scaler = pickle.load(f)
        logger.info("✅ Reviews Scaler berhasil dimuat!")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Reviews Scaler: {e}")
        raise RuntimeError(f"Scaler loading failed: {e}")

    # Normalisasi untuk Hybrid Ranking
    tourism_df['rating_normalized'] = tourism_df['rating'] / 5.0
    tourism_df['reviews_normalized'] = reviews_scaler.transform(tourism_df[['total_reviews']])

    # --- 6. Load Academic Models (TF-IDF, LR, Label Encoder) ---
    logger.info("🏷️ Loading Academic Models (TF-IDF + Logistic Regression)...")
    try:
        with open(LABEL_ENCODER_PATH, "rb") as f:
            label_encoder = pickle.load(f)
        with open(TFIDF_PATH, "rb") as f:
            tfidf_vectorizer = pickle.load(f)
        with open(LR_MODEL_PATH, "rb") as f:
            lr_model = pickle.load(f)
        logger.info(f"✅ Academic Models dimuat! Classes: {list(label_encoder.classes_)}")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Academic Models: {e}")
        raise RuntimeError(f"Academic models loading failed: {e}")

    # --- 7. Simpan ke Global State ---
    ai_engine["device"] = device
    ai_engine["sbert_model"] = sbert_model
    ai_engine["review_embeddings"] = review_embeddings
    ai_engine["tourism_df"] = tourism_df
    ai_engine["reviews_scaler"] = reviews_scaler
    ai_engine["label_encoder"] = label_encoder
    ai_engine["tfidf_vectorizer"] = tfidf_vectorizer
    ai_engine["lr_model"] = lr_model

    logger.info("=" * 60)
    logger.info("✅ JABARULIN AI (v2.0) — Semua Resources Berhasil Dimuat!")
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
        "API ini menggunakan arsitektur Hybrid AI v2.0:\n"
        "- **SentenceTransformer (Semantic Search)** → Memahami review pengunjung sebagai corpus utama\n"
        "- **Negation Detection & Post-Filtering** → Mengabaikan jenis wisata yang dihindari user (e.g. 'tapi bukan gunung')\n"
        "- **Hybrid Ranking** → Kombinasi 75% kesesuaian semantik + 15% rating + 10% total reviews\n"
        "- **TF-IDF + Logistic Regression** → Model akademik untuk memprediksi kelompok kategori (intent)"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Core AI Functions
# ============================================================
def predict_intent(user_input: str) -> tuple[str, dict[str, float]]:
    """Memprediksi kelompok kategori menggunakan model akademik TF-IDF + Logistic Regression."""
    tfidf_vectorizer = ai_engine["tfidf_vectorizer"]
    lr_model = ai_engine["lr_model"]
    label_encoder = ai_engine["label_encoder"]

    vector = tfidf_vectorizer.transform([user_input])
    probs = lr_model.predict_proba(vector)[0]
    
    predicted_class_id = probs.argmax().item()
    predicted_intent = label_encoder.inverse_transform([predicted_class_id])[0]

    confidence_scores = {}
    for idx, label in enumerate(label_encoder.classes_):
        confidence_scores[label] = round(float(probs[idx]), 4)

    return predicted_intent, confidence_scores


def detect_negated_categories(user_input: str) -> list[str]:
    """Mendeteksi kategori wisata yang dinegasikan oleh pengguna."""
    user_input_lower = user_input.lower()
    excluded = []
    
    negations = [
        'ga mau', 'gak mau', 'tidak mau', 'bukan', 'selain',
        'hindari', 'tanpa', 'jangan', 'ga usah', 'gak usah',
        'males', 'ogah', 'no'
    ]
    
    keyword_to_group = {
        'gunung': ['gunung', 'muncak', 'puncak', 'pendakian', 'nanjak', 'kawah', 'mendaki'],
        'pantai': ['pantai', 'laut', 'pesisir', 'beach'],
        'camping': ['camping', 'camp', 'ngecamp', 'kemah', 'tenda', 'glamping'],
        'adventure': ['rafting', 'offroad', 'caving', 'climbing', 'hiking',
                      'trekking', 'arung jeram', 'ekstrim', 'ekstrem'],
        'keluarga': ['keluarga', 'anak', 'family', 'zoo', 'kebun binatang'],
        'healing': ['healing', 'spa', 'pemandian', 'rendam'],
    }
    
    for neg in negations:
        for match in re.finditer(re.escape(neg), user_input_lower):
            rest = user_input_lower[match.end():]
            
            contrast = re.search(r'\b(tapi|tetapi|namun|cuma|tp)\b', rest)
            if contrast:
                rest = rest[:contrast.start()]
            
            for group, keywords in keyword_to_group.items():
                for kw in keywords:
                    if kw in rest:
                        excluded.append(group)
                        break
    
    return list(set(excluded))


def filter_negated_results(result_df: pd.DataFrame, excluded_groups: list[str]) -> pd.DataFrame:
    """Menyaring destinasi wisata jika mengandung keyword negasi pada nama, kategori, atau kelompok kategori."""
    if not excluded_groups:
        return result_df
    
    # 1. Filter berdasarkan category_group
    group_mask = result_df['category_group'].isin(excluded_groups)
    
    # 2. Kumpulkan keyword untuk dicek di name dan category
    filter_keywords = []
    for group in excluded_groups:
        if group in GROUP_FILTER_KEYWORDS:
            filter_keywords.extend(GROUP_FILTER_KEYWORDS[group])
        filter_keywords.append(group)
    
    # 3. Filter berdasarkan keyword di name
    pattern = '|'.join(re.escape(kw) for kw in filter_keywords)
    name_mask = result_df['name'].str.lower().str.contains(pattern, regex=True, na=False)
    
    # 4. Filter berdasarkan keyword di category (raw)
    category_mask = result_df['category'].str.lower().str.contains(pattern, regex=True, na=False)
    
    # 5. Gabungkan: hapus jika ditemukan di SALAH SATU kolom
    combined_mask = group_mask | name_mask | category_mask
    filtered = result_df[~combined_mask].copy()
    
    return filtered


def extract_sample_reviews(reviews_str: str, max_sentences: int = 3) -> list[str]:
    """Mengekstrak potongan kalimat ulasan riil dari kolom all_reviews."""
    if not reviews_str or not isinstance(reviews_str, str):
        return []
    # Bersihkan whitespace berlebih
    reviews_str = re.sub(r'\s+', ' ', reviews_str)
    # Pisahkan berdasarkan tanda baca kalimat
    sentences = re.split(r'[.\n!?]+', reviews_str)
    cleaned = []
    for s in sentences:
        s_clean = s.strip()
        # Filter kalimat yang informatif (tidak terlalu pendek dan tidak terlalu panjang)
        if 20 < len(s_clean) < 180:
            cleaned.append(s_clean)
        if len(cleaned) >= max_sentences:
            break
    
    # Fallback jika tidak ditemukan kalimat terpisah yang ideal
    if not cleaned and len(reviews_str.strip()) > 10:
        cleaned.append(reviews_str.strip()[:150] + "...")
        
    return cleaned


def hybrid_recommendation(
    user_input: str, top_n: int = 5, similarity_threshold: float = 0.1
) -> tuple[pd.DataFrame, str, str]:
    """Sistem rekomendasi berbasis semantic search + hybrid ranking + negation filter."""
    sbert_model = ai_engine["sbert_model"]
    review_embeddings = ai_engine["review_embeddings"]
    tourism_df = ai_engine["tourism_df"]

    # Predict intent menggunakan model akademik
    predicted_intent, _ = predict_intent(user_input)

    # Deteksi negasi
    excluded_groups = detect_negated_categories(user_input)
    
    # Encode query
    query_embedding = sbert_model.encode([user_input])
    
    # Hitung cosine similarity
    similarity_scores = cosine_similarity(query_embedding, review_embeddings).flatten()
    
    # Buat dataframe hasil
    result_df = tourism_df.copy()
    result_df['semantic_similarity'] = similarity_scores
    result_df['similarity_score'] = similarity_scores  # Alias untuk kompatibilitas frontend

    # Post-filter negasi
    if excluded_groups:
        result_df = filter_negated_results(result_df, excluded_groups)
    
    # Filter threshold
    result_df = result_df[result_df['semantic_similarity'] > similarity_threshold].copy()
    
    if result_df.empty:
        return pd.DataFrame(), predicted_intent, "semantic_empty"
    
    # Hitung Hybrid Score: 75% semantic_similarity + 15% rating_normalized + 10% reviews_normalized
    result_df['final_score'] = (
        0.75 * result_df['semantic_similarity'] +
        0.15 * result_df['rating_normalized'] +
        0.10 * result_df['reviews_normalized']
    )
    
    # Sort & Deduplicate
    result_df = result_df.sort_values(by='final_score', ascending=False)
    result_df = result_df.drop_duplicates(subset='name', keep='first')
    
    # Ambil Top-N
    recommendations = result_df.head(top_n).copy()
    
    recommendations['semantic_similarity'] = recommendations['semantic_similarity'].round(4)
    recommendations['similarity_score'] = recommendations['similarity_score'].round(4)
    recommendations['final_score'] = recommendations['final_score'].round(4)
    recommendations['rating'] = recommendations['rating'].round(1)
    
    return recommendations, predicted_intent, "semantic_hybrid"


def df_to_recommendation_items(df: pd.DataFrame) -> list[RecommendationItem]:
    """Mengubah pandas DataFrame ke list of RecommendationItem pydantic model."""
    items = []
    for _, row in df.iterrows():
        # Ekstrak sample reviews dari all_reviews
        all_revs = row.get("all_reviews", "")
        sample_revs = extract_sample_reviews(str(all_revs))
        
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
                reviews=sample_revs,
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
        "version": "2.0.0",
        "description": "Sistem Rekomendasi Wisata Cerdas Jawa Barat berbasis NLP & AI v2.0",
    }


@app.get("/api/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    sbert_loaded = "sbert_model" in ai_engine
    dataset_loaded = "tourism_df" in ai_engine
    academic_loaded = "lr_model" in ai_engine
    
    is_healthy = sbert_loaded and dataset_loaded and academic_loaded
    
    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        model_loaded=sbert_loaded,
        dataset_loaded=dataset_loaded,
        total_destinations=ai_engine["tourism_df"]["name"].nunique() if dataset_loaded else 0,
        available_intents=list(ai_engine["label_encoder"].classes_) if academic_loaded else [],
        device=str(ai_engine.get("device", "unknown")),
    )


@app.post("/api/recommend", response_model=RecommendResponse, tags=["AI Recommendation"])
async def recommend(request: RecommendRequest):
    if "sbert_model" not in ai_engine:
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
    if "lr_model" not in ai_engine:
        raise HTTPException(status_code=503, detail="Model belum dimuat. Tunggu beberapa saat.")
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
