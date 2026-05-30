<![CDATA[<div align="center">

# 🌴 Jabarulin Project (Monorepo)

### Sistem Rekomendasi Wisata Cerdas Jawa Barat
**Berbasis NLP & Analisis Lalu Lintas**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Gemini](https://img.shields.io/badge/Gemini-LLM-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)

**Capstone Project PJK-GM049** · Pijak × IBM SkillsBuild

</div>

---

## 📖 Tentang Project

**Jabarulin** adalah sistem rekomendasi wisata cerdas yang memungkinkan pengguna mencari destinasi wisata di **Jawa Barat** menggunakan **bahasa sehari-hari**.

Proyek ini menggunakan arsitektur **Microservices** yang dibagi menjadi dua bagian utama di dalam satu repositori (Monorepo):

1. **`1_AI_Service` (Python FastAPI):** Otak dari sistem. Memproses teks menggunakan IndoBERT dan TF-IDF untuk menghasilkan daftar rekomendasi mentah.
2. **`2_Backend_Service` (Node.js Express):** Penengah antara Frontend dan AI. Memanggil AI Service, mengambil hasilnya, dan memprosesnya menggunakan **Gemini LLM** agar merespons layaknya seorang *tour guide*.

---

## 📁 Struktur Monorepo

```
Jabarulin_Project/
├── Model_AI/                 <-- (Kawasan Dhaffa - AI Engineer)
│   ├── notebooks/                  # Catatan sejarah Jupyter Notebook
│   │   └── model_training.ipynb    # Bukti otentik training model
│   ├── app.py                      # Script utama FastAPI (AI Engine)
│   ├── dataset_final_jabarulin.csv # Dataset 358 baris
│   ├── label_encoder.pkl           # Mapping intent
│   ├── requirements.txt            # Dependensi Python
│   └── Dockerfile                  # Konfigurasi container AI
│
├── Backend/                  <-- (Kawasan Mas Dwi - Backend Developer)
│   ├── controllers/
│   │   └── recommendationController.js # Integrasi axios FastAPI + Gemini
│   ├── routes/
│   │   └── apiRoutes.js            # Pengaturan rute Express
│   ├── .env                        # File konfigurasi (GEMINI_API_KEY)
│   ├── package.json                # Dependensi Node.js
│   ├── server.js                   # Script utama Express
│   └── Dockerfile                  # Konfigurasi container Backend
│
├── docker-compose.yml        <-- (Konduktor Docker)
├── .gitignore
└── README.md
```

---

## 🐳 Quick Start: Menggunakan Docker (Sangat Mudah!)

Cara paling profesional dan mudah untuk menjalankan seluruh proyek ini sekaligus adalah menggunakan **Docker Compose**. Kamu tidak perlu menginstal Python, Node.js, atau mengetik `pip install` sama sekali!

1. **Pastikan Docker Desktop sudah terinstal** dan berjalan di komputermu.
2. Buka file `Backend/.env` dan masukkan `GEMINI_API_KEY` kamu.
3. Buka terminal di **folder utama proyek** (yang ada file `docker-compose.yml`), lalu ketik:

```bash
docker-compose up --build
```

4. Tunggu beberapa menit untuk instalasi awal. Setelah selesai, semua sistem akan otomatis menyala:
   - AI Service berjalan di: `http://localhost:8000`
   - Backend Service berjalan di: `http://localhost:3000`

---

## ⚡ Quick Start: Cara Manual (Tanpa Docker)

Jika kamu tidak menggunakan Docker, kamu harus menyalakan kedua *service* secara manual di dua terminal terpisah.

### 1. Menyalakan AI Service (Python)

AI Service harus dijalankan pertama kali karena Backend bergantung padanya.

1. Buka terminal dan masuk ke folder `Model_AI`:
   ```bash
   cd Model_AI
   ```

2. (Opsional) Buat virtual environment:
   ```bash
   python -m venv env
   env\Scripts\activate
   ```

3. Install semua library NLP dan Machine Learning:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Jalankan Server (Otomatis Download Model)

Gunakan command berikut:

```bash
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

> **Catatan:** Saat pertama kali dijalankan, sistem akan otomatis mengunduh model AI dari Hugging Face Hub (`Dhaffa/jabarulin-indobert`). Pastikan koneksi internetmu stabil.

*AI Service berjalan di `http://localhost:8000`*

---

### 2. Menyalakan Backend Service (Node.js)

1. Buka terminal BARU dan masuk ke folder `Backend`:
   ```bash
   cd Backend
   ```

2. Buat file `.env` dan masukkan API Key Gemini kamu:
   ```env
   GEMINI_API_KEY="masukkan_api_key_kamu_disini"
   ```

3. Konfigurasi Environment:
   Buka file `.env` dan masukkan API Key Gemini kamu:
   ```env
   GEMINI_API_KEY=AIzaSy...masukkan_api_key_disini
   AI_SERVICE_URL=http://127.0.0.1:8000
   PORT=3000
   ```

4. Jalankan server Express:
   ```bash
   npm run dev
   ```
   *Backend Service berjalan di `http://localhost:3000`*

---

## 📡 API Endpoint (Untuk Frontend)

Frontend (Mobile/Web) **hanya perlu menembak ke Backend Service (Node.js)**. 

### ⭐ POST `/api/recommend`

**URL:** `http://localhost:3000/api/recommend`

**Request Body (JSON):**
```json
{
  "prompt": "pengen ke pantai yang sepi buat healing"
}
```

**Response dari Backend (Node.js + Gemini):**
```json
{
  "status": "success",
  "reply": "Halo! Kalau kamu cari yang sepi buat healing, Pantai Cipanarikan cocok banget nih! Tempatnya sangat asri dan belum terlalu ramai wisatawan... \n[Google Maps](https://maps.google.com/...)",
  "raw_data": [
    {
      "name": "Pantai Cipanarikan",
      "category": "pantai tersembunyi",
      "rating": 4.6,
      "google_maps_url": "..."
    }
  ]
}
```

---

## 👥 Tim

**Capstone Project PJK-GM049** — Pijak × IBM SkillsBuild

| Role | Nama | Kawasan Codebase |
|------|-----------|-----------|
| **AI & NLP Engineer** | Dhaffa | `1_AI_Service/` |
| **Backend Developer** | Mas Dwi Saktya | `2_Backend_Service/` |

---

## 📄 License

Capstone Project untuk keperluan akademis — Pijak × IBM SkillsBuild.
]]>
