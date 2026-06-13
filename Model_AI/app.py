"""
==========================================================
  JABARULIN AI — FastAPI Backend Server (IndoBERT v3.0)
  Sistem Rekomendasi Wisata Cerdas Jawa Barat
  
  Hybrid Architecture:
  Semantic Search (TF-IDF + IndoBERT Embeddings)
  + IndoBERT Category Classifier Probability Boost
  + Region/Location Filter + Negation Post-Filtering
==========================================================
"""

import os
import re
import pickle
import logging
from contextlib import asynccontextmanager
from typing import Optional, Tuple

import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
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
INDOBERT_MODEL_PATH = os.path.join(BASE_DIR, "indobert_classifier")
DATASET_PATH = os.path.join(BASE_DIR, "data wisata jawabarat.xlsx")
LABEL_ENCODER_PATH = os.path.join(INDOBERT_MODEL_PATH, "label_encoder.pkl")
TOURISM_EMBEDDINGS_PATH = os.path.join(INDOBERT_MODEL_PATH, "tourism_embeddings.pkl")

MAIN_CATEGORY_DESCRIPTIONS = {
    "Wisata Alam": "Air Terjun, Danau, Cagar Alam, Bukit",
    "Pantai": "Pantai, Pantai Umum, Pesisir Laut",
    "Camping": "Bumi Perkemahan, Kabin Perkemahan, Glamping",
    "Keluarga": "Kebun Binatang, Kolam Renang, Taman Rekreasi Air, Taman Bermain",
    "Adventure": "Rafting, Offroad, Gunung Berapi, Puncak Gunung, Area Mendaki",
    "Fotografi": "Titik Pemandangan, Bangunan Bersejarah",
    "Healing": "Pemandian Air Panas, Spa, Hotel Resor, Pemandian Terbuka",
    "Lainnya": "Hotel, Produsen Makanan, Pembangkit Listrik, Event Organizer, dan kategori lain"
}

category_mapping = {
    "wisata alam": "wisata_alam",
    "pantai": "pantai",
    "camping": "camping",
    "keluarga": "keluarga",
    "adventure": "adventure",
    "fotografi": "fotografi",
    "healing / relaksasi": "healing",
    "healing": "healing",
    "lainnya": "wisata_alam"
}

NEGATION_FILTER_KEYWORDS = {
    'pantai': ['pantai', 'beach', 'pesisir'],
    'camping': ['camping', 'camp', 'kemah', 'tenda', 'glamping'],
    'keluarga': ['zoo', 'kebun binatang', 'taman bermain', 'taman rekreasi'],
    'adventure': ['rafting', 'offroad', 'hiking', 'trekking', 'arung jeram', 'mendaki', 'climbing', 'caving'],
    'gunung': ['gunung', 'gn', 'puncak', 'kawah', 'volcano'],
    'healing': ['spa', 'pemandian', 'hot spring', 'hangat'],
    'fotografi': ['titik pemandangan', 'candi', 'monumen', 'sejarah'],
    'kuliner': ['produsen makanan', 'kuliner', 'makanan', 'resto']
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
        description="Kalimat bahasa natural dari user, misal: 'tempat dingin tapi bukan gunung'",
        json_schema_extra={"examples": ["tempat dingin tapi bukan gunung"]},
    )
    category: Optional[str] = Field(
        default=None,
        description="Kategori utama terpilih dari Tahap 1, misal: 'Keluarga' atau 'Adventure'",
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
        json_schema_extra={"examples": ["camping yang adem dan murah"]},
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
    preference_match: Optional[float] = None
    category_match: Optional[float] = None


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
    logger.info("🚀 JABARULIN AI (v3.0) — Memulai Loading Resources...")
    logger.info("=" * 60)

    # --- 1. Deteksi Device (GPU/CPU) ---
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"📱 Device: {device}")

    # --- 2. Load IndoBERT Model & Tokenizer ---
    is_local = os.path.exists(os.path.join(INDOBERT_MODEL_PATH, "config.json"))
    
    if is_local:
        logger.info(f"🧠 Loading IndoBERT Model dari folder lokal ({INDOBERT_MODEL_PATH})...")
        try:
            tokenizer = AutoTokenizer.from_pretrained(INDOBERT_MODEL_PATH)
            model = AutoModelForSequenceClassification.from_pretrained(INDOBERT_MODEL_PATH)
            logger.info("✅ IndoBERT Model lokal berhasil dimuat!")
        except Exception as e:
            logger.error(f"❌ Gagal memuat IndoBERT Model lokal: {e}")
            raise RuntimeError(f"IndoBERT local loading failed: {e}")
    else:
        hf_repo = os.getenv("HF_REPO_ID", "Dhaffa/jabarulin-indobert-recommendation")
        logger.info(f"🧠 Loading IndoBERT Model dari Hugging Face Hub ({hf_repo})...")
        try:
            tokenizer = AutoTokenizer.from_pretrained(hf_repo)
            model = AutoModelForSequenceClassification.from_pretrained(hf_repo)
            logger.info(f"✅ IndoBERT Model ({hf_repo}) dari Hugging Face Hub berhasil dimuat!")
        except Exception as e:
            logger.error(f"❌ Gagal memuat IndoBERT Model dari Hugging Face Hub: {e}")
            raise RuntimeError(f"IndoBERT Hugging Face loading failed: {e}")

    model.to(device)

    # --- 3. Load Label Encoder ---
    if is_local:
        logger.info("🏷️ Loading Label Encoder dari folder lokal...")
        local_le_path = LABEL_ENCODER_PATH
    else:
        hf_repo = os.getenv("HF_REPO_ID", "Dhaffa/jabarulin-indobert-recommendation")
        logger.info("🏷️ Downloading Label Encoder dari Hugging Face Hub...")
        try:
            from huggingface_hub import hf_hub_download
            local_le_path = hf_hub_download(repo_id=hf_repo, filename="label_encoder.pkl")
        except Exception as e:
            logger.error(f"❌ Gagal mendownload Label Encoder dari Hugging Face Hub: {e}")
            raise RuntimeError(f"Label Encoder download failed: {e}")

    try:
        with open(local_le_path, "rb") as f:
            label_encoder = pickle.load(f)
        logger.info(f"✅ Label Encoder dimuat! Classes: {list(label_encoder.classes_)}")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Label Encoder: {e}")
        raise RuntimeError(f"Label Encoder loading failed: {e}")

    # --- 4. Load Tourism Embeddings ---
    if is_local:
        logger.info("🧠 Loading Tourism Embeddings dari folder lokal...")
        local_embeddings_path = TOURISM_EMBEDDINGS_PATH
    else:
        hf_repo = os.getenv("HF_REPO_ID", "Dhaffa/jabarulin-indobert-recommendation")
        logger.info("🧠 Downloading Tourism Embeddings dari Hugging Face Hub...")
        try:
            from huggingface_hub import hf_hub_download
            local_embeddings_path = hf_hub_download(repo_id=hf_repo, filename="tourism_embeddings.pkl")
        except Exception as e:
            logger.error(f"❌ Gagal mendownload Tourism Embeddings dari Hugging Face Hub: {e}")
            raise RuntimeError(f"Tourism Embeddings download failed: {e}")

    try:
        with open(local_embeddings_path, "rb") as f:
            tourism_embeddings = pickle.load(f)
        logger.info(f"✅ Tourism Embeddings dimuat! Shape: {tourism_embeddings.shape}")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Tourism Embeddings: {e}")
        raise RuntimeError(f"Tourism Embeddings loading failed: {e}")

    # --- 5. Load & Preprocess Dataset ---
    logger.info("📊 Loading Dataset...")
    try:
        df = pd.read_excel(DATASET_PATH, sheet_name='bersih bersih')
        df['name'] = df['name'].astype(str).str.title().str.strip()
        df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(df['rating'].mean())
        df['total_reviews'] = pd.to_numeric(df['total_reviews'], errors='coerce').fillna(0).astype(int)
        df['all_reviews'] = df['all_reviews'].fillna('')
        df['cleaned_reviews'] = df['cleaned_reviews'].fillna('')
        df['clean_content'] = df['clean_content'].fillna('')
        df['category'] = df['category'].fillna('lainnya')
        df['address'] = df['address'].fillna('')
        df['phone'] = df['phone'].fillna('')
        df['website'] = df['website'].fillna('')
        df['google_maps_url'] = df['google_maps_url'].fillna('')

        category_to_preference = {
            'tujuan wisata': 'wisata_alam',
            'area rekreasi alam': 'wisata_alam',
            'wisata alam': 'wisata_alam',
            'cagar alam': 'wisata_alam',
            'danau': 'wisata_alam',
            'air terjun': 'wisata_alam',
            'pembangkit listrik': 'wisata_alam',
            'pemandian umum luas': 'healing',
            'spa': 'healing',
            'pemandian di ruang terbuka': 'healing',
            'hotel bintang 4': 'healing',
            'pemandian air panas': 'healing',
            'hotel': 'healing',
            'hotel resor': 'healing',
            'hotel bintang 2': 'healing',
            'produsen makanan': 'wisata_alam',
            'kolam renang': 'keluarga',
            'kolam renang umum': 'keluarga',
            'event organizer eo': 'keluarga',
            'kebun binatang': 'keluarga',
            'taman': 'keluarga',
            'taman rekreasi air': 'keluarga',
            'area mendaki': 'adventure',
            'pusat olahraga petualangan': 'adventure',
            'rafting': 'adventure',
            'operator wisata rafting': 'adventure',
            'gunung berapi': 'adventure',
            'puncak gunung': 'adventure',
            'jasa sewa kendaraan segala medan': 'adventure',
            'pantai': 'pantai',
            'pantai umum': 'pantai',
            'bumi perkemahan': 'camping',
            'kabin perkemahan': 'camping',
            'camp pelatihan': 'camping',
            'camp musim panas anak anak': 'camping',
            'kamp pelatihan': 'camping',
            'kamp musim panas anak anak': 'camping',
            'titik pemandangan': 'fotografi',
            'bangunan bersejarah': 'fotografi'
        }

        df['preference_label'] = df['category'].map(category_to_preference).fillna('wisata_alam')
        df['intent_label'] = df['preference_label']

        df['search_text'] = (
            df['all_reviews'].astype(str) + " " +
            df['cleaned_reviews'].astype(str) + " " +
            df['clean_content'].astype(str)
        ).str.strip()

        df['rating_score'] = df['rating'] / 5.0
        df['popularity_score'] = np.log1p(df['total_reviews'])
        scaler = MinMaxScaler()
        df['popularity_score'] = scaler.fit_transform(df[['popularity_score']])

        class_to_idx = {cls_name: idx for idx, cls_name in enumerate(label_encoder.classes_)}

        logger.info(f"✅ Dataset dimuat! {len(df)} baris, {df['name'].nunique()} destinasi unik")
    except Exception as e:
        logger.error(f"❌ Gagal memuat Dataset: {e}")
        raise RuntimeError(f"Dataset loading failed: {e}")

    # --- 6. Fit TF-IDF Vectorizer dynamically ---
    logger.info("📊 Fitting TF-IDF Vectorizer...")
    try:
        tfidf_vectorizer = TfidfVectorizer(max_features=5000)
        tfidf_matrix = tfidf_vectorizer.fit_transform(df['search_text'])
        logger.info(f"✅ TF-IDF Matrix Shape: {tfidf_matrix.shape}")
    except Exception as e:
        logger.error(f"❌ Gagal fitting TF-IDF Vectorizer: {e}")
        raise RuntimeError(f"TF-IDF Vectorizer fitting failed: {e}")

    # --- 7. Simpan ke Global State ---
    ai_engine["device"] = device
    ai_engine["tokenizer"] = tokenizer
    ai_engine["model"] = model
    ai_engine["label_encoder"] = label_encoder
    ai_engine["tourism_embeddings"] = tourism_embeddings
    ai_engine["tourism_df"] = df
    ai_engine["class_to_idx"] = class_to_idx
    ai_engine["tfidf_vectorizer"] = tfidf_vectorizer
    ai_engine["tfidf_matrix"] = tfidf_matrix

    logger.info("=" * 60)
    logger.info("✅ JABARULIN AI (v3.0) — Semua Resources Berhasil Dimuat!")
    logger.info("📍 Swagger UI: http://localhost:8000/docs")
    logger.info("=" * 60)

    yield

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
        "API ini menggunakan arsitektur Hybrid AI v3.0 berbasis model **IndoBERT**:\n"
        "- **IndoBERT Classifier** → Memprediksi kesesuaian kategori preferensi berdasarkan ulasan pengunjung\n"
        "- **Semantic Search (TF-IDF + IndoBERT Embeddings)** → Membandingkan kedekatan kueri dengan seluruh ulasan pariwisata\n"
        "- **Region & Negation Post-Filtering** → Post-filtering penolakan destinasi (e.g. 'bukan gunung') dan pencarian kota/kabupaten\n"
        "- **Hybrid Ranking** → Kombinasi 50% kesesuaian semantik + 20% pref match + 15% category match + 10% rating + 5% total reviews"
    ),
    version="3.0.0",
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
def normalize_query(query_text: str) -> str:
    """Membersihkan slang, singkatan, dan typo Bahasa Indonesia."""
    query_lower = query_text.lower()
    slang_dict = {
        r'\bpntai\b': 'pantai',
        r'\bcampng\b': 'camping',
        r'\bhiling\b': 'healing',
        r'\bkluarga\b': 'keluarga',
        r'\bfamily\b': 'keluarga',
        r'\bnongki\b': 'nongkrong',
        r'\bnongkrong\b': 'nongkrong',
        r'\badem\b': 'dingin',
        r'\bgw\b': 'saya',
        r'\bgua\b': 'saya',
        r'\bguaa\b': 'saya',
        r'\btmpat\b': 'tempat',
        r'\btpt\b': 'tempat',
        r'\bbgus\b': 'bagus',
        r'\bwisata_alam\b': 'wisata alam',
        r'\bngilangin\b': 'menghilangkan',
        r'\bstress\b': 'stres'
    }
    for slang, formal in slang_dict.items():
        query_lower = re.sub(slang, formal, query_lower)
    query_lower = re.sub(r'\s+', ' ', query_lower).strip()
    return query_lower


def get_negated_categories(query_text: str) -> list[str]:
    """Mendeteksi kategori wisata yang dinegasikan pengguna."""
    query_lower = query_text.lower()
    excluded = []

    negations = ["ga mau", "gak mau", "tidak mau", "bukan", "selain", "jangan", "ga usah", "gak usah", "tanpa", "hindari"]
    keywords_map = {
        "pantai": ["pantai", "laut", "beach", "pesisir"],
        "camping": ["camping", "camp", "kemah", "tenda", "glamping"],
        "keluarga": ["keluarga", "anak", "family", "zoo", "kebun binatang"],
        "adventure": ["adventure", "rafting", "offroad", "hiking", "trekking", "arung jeram", "ekstrem", "ekstrim"],
        "gunung": ["gunung", "puncak", "muncak", "nanjak", "kawah", "mendaki"],
        "healing": ["healing", "hiling", "spa", "pemandian", "rileks", "santai", "sepi", "tenang"],
        "fotografi": ["foto", "fotografi", "pemandangan", "sejara"],
        "kuliner": ["kuliner", "makanan", "kulner", "makan"]
    }

    for neg in negations:
        for match in re.finditer(rf"\b{re.escape(neg)}\b", query_lower):
            start_idx = match.end()
            rest_of_text = query_lower[start_idx:]

            contrast = re.search(r"\b(tapi|tetapi|namun|sedangkan|cuma)\b", rest_of_text)
            if contrast:
                rest_of_text = rest_of_text[:contrast.start()]

            for label, keywords in keywords_map.items():
                for kw in keywords:
                    if kw in rest_of_text:
                        excluded.append(label)
                        break

    return list(set(excluded))


def filter_negated_results(result_df: pd.DataFrame, excluded_labels: list[str]) -> pd.DataFrame:
    """Menyaring wisata berdasarkan ulasan negasi dan preferensi yang dihindari."""
    if not excluded_labels:
        return result_df

    mask = result_df['preference_label'].isin(excluded_labels)

    filter_keywords = []
    for label in excluded_labels:
        if label in NEGATION_FILTER_KEYWORDS:
            filter_keywords.extend(NEGATION_FILTER_KEYWORDS[label])
        filter_keywords.append(label)

    pattern = '|'.join(re.escape(kw) for kw in filter_keywords)

    name_mask = result_df['name'].str.lower().str.contains(pattern, regex=True, na=False)
    category_mask = result_df['category'].str.lower().str.contains(pattern, regex=True, na=False)

    combined_mask = mask | name_mask | category_mask
    return result_df[~combined_mask].copy()


def filter_by_location(result_df: pd.DataFrame, query_text: str) -> pd.DataFrame:
    """Mendeteksi filter wilayah pariwisata Jawa Barat dalam query."""
    query_lower = query_text.lower()
    regions = [
        'bogor', 'bandung', 'garut', 'pangandaran', 'sukabumi',
        'majalengka', 'subang', 'cianjur', 'kuningan', 'cirebon',
        'tasikmalaya', 'depok', 'bekasi', 'karawang', 'purwakarta', 'sumedang'
    ]

    detected_region = None
    for region in regions:
        if re.search(rf'\b{region}\b', query_lower):
            detected_region = region
            break

    if detected_region:
        loc_pattern = detected_region
        if detected_region == 'bandung':
            loc_pattern = 'bandung|lembang|pangalengan|ciwidey'
        elif detected_region == 'bogor':
            loc_pattern = 'bogor|puncak|sentul'

        loc_mask = (
            result_df['name'].str.lower().str.contains(loc_pattern, regex=True, na=False) |
            result_df['address'].str.lower().str.contains(loc_pattern, regex=True, na=False)
        )
        filtered_df = result_df[loc_mask].copy()
        if not filtered_df.empty:
            logger.info(f"📍 Location Filter: Hanya menampilkan tempat wisata di daerah {detected_region.upper()}")
            return filtered_df
        else:
            logger.info(f"⚠️ Filter lokasi '{detected_region.upper()}' terdeteksi, namun tidak ditemukan tempat yang cocok di database. Menampilkan semua lokasi.")

    return result_df


def extract_indobert_embeddings(texts: list[str], model, tokenizer, device, max_len=128, batch_size=16) -> np.ndarray:
    """Mengekstrak embedding kalimat menggunakan layer backbone IndoBERT (Mean Pooling)."""
    model.eval()
    all_embeddings = []
    bert_backbone = model.bert

    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        inputs = tokenizer(
            batch_texts,
            padding=True,
            truncation=True,
            max_length=max_len,
            return_tensors="pt"
        ).to(device)

        with torch.no_grad():
            outputs = bert_backbone(**inputs)
            token_embeddings = outputs.last_hidden_state
            attention_mask = inputs['attention_mask']

            input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
            sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
            sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
            mean_embeddings = (sum_embeddings / sum_mask).cpu().numpy()

            all_embeddings.append(mean_embeddings)

    return np.vstack(all_embeddings)


def get_hybrid_recommendation(
    main_category: str, additional_preference: str, top_n: int = 5, similarity_threshold: float = 0.0
) -> Tuple[pd.DataFrame, str]:
    """Sistem rekomendasi utama berbasis IndoBERT Hybrid Ranking & Negation Filter."""
    model = ai_engine["model"]
    tokenizer = ai_engine["tokenizer"]
    device = ai_engine["device"]
    le = ai_engine["label_encoder"]
    tourism_embeddings = ai_engine["tourism_embeddings"]
    tfidf_vectorizer = ai_engine["tfidf_vectorizer"]
    tfidf_matrix = ai_engine["tfidf_matrix"]
    df = ai_engine["tourism_df"]
    class_to_idx = ai_engine["class_to_idx"]

    # 1. Normalisasi Query & Deteksi Negasi
    normalized_pref = normalize_query(additional_preference)
    excluded_labels = get_negated_categories(normalized_pref)

    # 2. Prediksi Probabilitas Intent Menggunakan IndoBERT Classifier
    model.eval()
    inputs = tokenizer(
        normalized_pref,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=64
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1).flatten().cpu().numpy()

    category_probs = {le.classes_[i]: float(probs[i]) for i in range(len(le.classes_))}
    predicted_intent = max(category_probs, key=category_probs.get)

    # 3. Hitung Semantic Similarity (40% TF-IDF + 30% IndoBERT Embeddings)
    query_tfidf = tfidf_vectorizer.transform([normalized_pref])
    tfidf_similarities = cosine_similarity(query_tfidf, tfidf_matrix).flatten()

    query_embedding = extract_indobert_embeddings([normalized_pref], model, tokenizer, device, max_len=64)
    indobert_similarities = cosine_similarity(query_embedding, tourism_embeddings).flatten()

    # Normalisasi combined similarity dengan pembagi 0.70
    combined_semantic_similarity = (0.40 * tfidf_similarities + 0.30 * indobert_similarities) / 0.70

    results = df.copy()
    results['semantic_similarity'] = combined_semantic_similarity
    results['similarity_score'] = combined_semantic_similarity

    # 4. Ambil Preference Match dari IndoBERT Probability
    results['preference_match'] = results['preference_label'].map(class_to_idx).map(
        lambda idx: float(probs[idx]) if pd.notna(idx) else 0.0
    )

    # 5. Hitung Category Match (tahap 1 vs preferensi label pariwisata)
    target_category = category_mapping.get(main_category.lower().strip(), "wisata_alam")
    results['category_match'] = (results['preference_label'] == target_category).astype(float)

    # 6. Terapkan Filter Negasi
    if excluded_labels:
        results = filter_negated_results(results, excluded_labels)

    # 7. Terapkan Filter Lokasi
    results = filter_by_location(results, normalized_pref)

    # 8. Filter Threshold
    results = results[results['semantic_similarity'] >= similarity_threshold].copy()

    if results.empty:
        return pd.DataFrame(), predicted_intent

    # 9. Hitung Final Score: 50% Semantik + 20% Pref Match + 15% Cat Match + 10% Rating + 5% Popularity
    results['final_score'] = (
        0.50 * results['semantic_similarity'] +
        0.20 * results['preference_match'] +
        0.15 * results['category_match'] +
        0.10 * results['rating_score'] +
        0.05 * results['popularity_score']
    )

    # Sort & Deduplicate
    results = results.sort_values(by='final_score', ascending=False)
    results = results.drop_duplicates(subset='name', keep='first')

    recommendations = results.head(top_n).copy()

    recommendations['semantic_similarity'] = recommendations['semantic_similarity'].round(4)
    recommendations['similarity_score'] = recommendations['similarity_score'].round(4)
    recommendations['preference_match'] = recommendations['preference_match'].round(4)
    recommendations['category_match'] = recommendations['category_match'].round(4)
    recommendations['final_score'] = recommendations['final_score'].round(4)
    recommendations['rating'] = recommendations['rating'].round(1)

    return recommendations, predicted_intent


def predict_intent(user_input: str) -> Tuple[str, dict]:
    """Memprediksi kelompok kategori menggunakan model IndoBERT Classifier."""
    tokenizer = ai_engine["tokenizer"]
    model = ai_engine["model"]
    device = ai_engine["device"]
    label_encoder = ai_engine["label_encoder"]

    normalized = normalize_query(user_input)
    inputs = tokenizer(
        normalized,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=64
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1).flatten().cpu().numpy()

    predicted_class_id = probs.argmax().item()
    predicted_intent = label_encoder.classes_[predicted_class_id]

    confidence_scores = {}
    for idx, label in enumerate(label_encoder.classes_):
        confidence_scores[label] = round(float(probs[idx]), 4)

    return predicted_intent, confidence_scores


def extract_sample_reviews(reviews_str: str, max_sentences: int = 3) -> list[str]:
    """Mengekstrak potongan kalimat ulasan riil dari kolom all_reviews."""
    if not reviews_str or not isinstance(reviews_str, str):
        return []
    reviews_str = re.sub(r'\s+', ' ', reviews_str)
    sentences = re.split(r'[.\n!?]+', reviews_str)
    cleaned = []
    for s in sentences:
        s_clean = s.strip()
        if 20 < len(s_clean) < 180:
            cleaned.append(s_clean)
        if len(cleaned) >= max_sentences:
            break
    
    if not cleaned and len(reviews_str.strip()) > 10:
        cleaned.append(reviews_str.strip()[:150] + "...")
        
    return cleaned


def df_to_recommendation_items(df: pd.DataFrame) -> list[RecommendationItem]:
    """Mengubah pandas DataFrame ke list of RecommendationItem pydantic model."""
    items = []
    for _, row in df.iterrows():
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
                preference_match=round(float(row.get("preference_match", 0.0)), 3) if "preference_match" in row else None,
                category_match=round(float(row.get("category_match", 0.0)), 3) if "category_match" in row else None,
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
        "version": "3.0.0",
        "description": "Sistem Rekomendasi Wisata Cerdas Jawa Barat berbasis IndoBERT & AI v3.0",
    }


@app.get("/api/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    model_loaded = "model" in ai_engine and "tokenizer" in ai_engine
    dataset_loaded = "tourism_df" in ai_engine
    
    is_healthy = model_loaded and dataset_loaded
    
    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
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

    logger.info(f"📨 Request: category='{request.category}' query='{request.query}' (top_n={request.top_n})")
    
    # 1. Tentukan main_category
    main_cat = request.category
    if not main_cat or main_cat.strip() == "":
        # Predict main_category dynamically if not provided
        normalized_query = normalize_query(request.query)
        inputs = ai_engine["tokenizer"](
            normalized_query,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=64
        ).to(ai_engine["device"])
        
        with torch.no_grad():
            outputs = ai_engine["model"](**inputs)
            probs = torch.softmax(outputs.logits, dim=-1).flatten().cpu().numpy()
            
        predicted_idx = probs.argmax().item()
        predicted_class = ai_engine["label_encoder"].classes_[predicted_idx]
        
        # Map back dari le.classes_ ke MAIN_CATEGORY
        inv_category_mapping = {
            "wisata_alam": "Wisata Alam",
            "pantai": "Pantai",
            "camping": "Camping",
            "keluarga": "Keluarga",
            "adventure": "Adventure",
            "fotografi": "Fotografi",
            "healing": "Healing"
        }
        main_cat = inv_category_mapping.get(predicted_class, "Wisata Alam")
        logger.info(f"🔮 Predicted main_category: '{main_cat}' (from predicted_intent: '{predicted_class}')")

    try:
        recommendations_df, predicted_intent = get_hybrid_recommendation(
            main_cat, request.query, top_n=request.top_n
        )
    except Exception as e:
        logger.error(f"❌ Error saat processing: {e}")
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat memproses rekomendasi: {str(e)}")

    if recommendations_df.empty:
        return RecommendResponse(
            status="success",
            query=request.query,
            predicted_intent=predicted_intent,
            recommendation_type="indobert_hybrid_empty",
            total_results=0,
            recommendations=[],
        )

    items = df_to_recommendation_items(recommendations_df)
    logger.info(
        f"✅ Response: intent={predicted_intent}, results={len(items)}"
    )

    return RecommendResponse(
        status="success",
        query=request.query,
        predicted_intent=predicted_intent,
        recommendation_type="indobert_hybrid",
        total_results=len(items),
        recommendations=items,
    )


@app.post("/api/predict-intent", response_model=IntentResponse, tags=["AI Recommendation"])
async def predict_intent_endpoint(request: IntentRequest):
    if "model" not in ai_engine:
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
