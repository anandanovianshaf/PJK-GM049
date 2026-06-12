# Jabarulin AI

**Sistem Rekomendasi Wisata Cerdas Berbasis NLP di Jawa Barat**  
*Resource-Based Semantic Search + Hybrid Ranking + Negation Filtering*  
*Capstone Project PJK-GM049 — Kolaborasi Pijak × IBM SkillsBuild*

---

## Deskripsi Singkat

Jabarulin AI adalah sebuah sistem cerdas yang memecahkan masalah wisatawan dalam mencari destinasi spesifik di Jawa Barat menggunakan bahasa sehari-hari. Alih-alih menggunakan pencarian kata kunci yang kaku (seperti *"wisata alam bandung"*), pengguna dapat mengetik kalimat natural yang kompleks seperti *"pengen bawa keluarga liburan yang sepi dan dingin tapi ga mau di gunung"*. 

Sistem ini bekerja dengan arsitektur **Hybrid AI Pipeline v2.0**:
1. **Model AI Lokal (Python/FastAPI):**
   - **Semantic Review-Based Recommendation:** Menggunakan model **SentenceTransformer** (`paraphrase-multilingual-MiniLM-L12-v2`) secara lokal untuk memetakan kebutuhan pengguna ke corpus ulasan riil pengunjung (*knowledge base* ulasan wisata). Hal ini memungkinkan AI memahami nuansa pengalaman pengunjung dibanding sekadar kategori kaku.
   - **Negation Detection & Post-Filtering:** Mendeteksi preferensi negatif secara dinamis (seperti *"tidak mau gunung"*, *"selain pantai"*, *"males camping"*) dari query pengguna, lalu menyaring destinasi terkait sebelum memberikan hasil akhir.
   - **Hybrid Ranking:** Menentukan destinasi terbaik menggunakan formula skor tertimbang: **75% keselarasan semantik (review)** + **15% rating destinasi** + **10% popularitas (jumlah total ulasan)**.
   - **Academic Classifier (TF-IDF + Logistic Regression):** Digunakan sebagai pemenuhan kebutuhan akademis untuk mengklasifikasikan kelompok kategori utama (*intent*) dari teks pencarian pengguna lengkap dengan *confidence scores*.
2. **Generative AI (Node.js/Express):** Hasil destinasi rekomendasi teratas beserta ulasan-ulasan riilnya kemudian diteruskan ke **Google Gemini LLM (gemini-2.5-flash)**. Gemini bertindak sebagai pemandu wisata cerdas (*tour guide*) yang ramah, santai, dan asyik dengan mensintesis jawaban berbasis data tanpa halusinasi, mengutip ulasan riil pengunjung secara natural, serta melampirkan Google Maps dan website resmi destinasi.

---

## Struktur Monorepo

Repository ini menggabungkan dua *service* utama (Microservices) ke dalam satu wadah:

```text
Jabarulin_Project/
├── Model_AI/                      <-- (AI Service - Python)
│   ├── notebooks/                 # Catatan sejarah Jupyter Notebook (proses training)
│   ├── sbert_model/               # Model SentenceTransformer lokal (MiniLM)
│   ├── app.py                     # Script utama FastAPI (AI Engine)
│   ├── processed_dataset.csv      # Dataset pariwisata Jawa Barat terproses
│   ├── review_embeddings.pkl      # Embeddings review untuk Semantic Search
│   ├── tfidf_vectorizer.pkl       # Vectorizer TF-IDF untuk model akademik
│   ├── logistic_regression_model.pkl # Model ML Logistic Regression (Intent Classifier)
│   ├── label_encoder_category.pkl # Encoder label kategori wisata
│   ├── reviews_scaler.pkl         # Scaler ulasan untuk normalisasi popularitas
│   ├── requirements.txt           # Dependensi library Python (PyTorch CPU, SBERT, dll)
│   └── Dockerfile                 # Konfigurasi Docker AI
│
├── Backend/                       <-- (Backend Service - Node.js)
│   ├── controllers/
│   │   └── recommendationController.js # Logika penengah FastAPI & Gemini LLM
│   ├── routes/
│   │   └── apiRoutes.js            # Pengaturan rute Express
│   ├── package.json                # Dependensi library Node.js
│   ├── server.js                   # Script utama Express
│   └── Dockerfile                  # Konfigurasi Docker Backend
│
├── docker-compose.yml             <-- (Konduktor Orkestrasi Docker)
└── README.md
```

---

## Cara Menggunakan (Mulai dari Nol)

Anda bisa menjalankan proyek ini menggunakan **Docker** (Sangat Disarankan) atau secara **Manual**.

### ⚙️ Persiapan Awal & Konfigurasi `.env` (Wajib)
Sebelum menjalankan aplikasi, Anda wajib mengatur *environment variables*.

1. Lakukan `git clone` repository ini ke komputer Anda.
2. Dapatkan API Key Gemini dari [Google AI Studio](https://aistudio.google.com/).
3. Masuk ke dalam folder `Backend/`, Anda akan melihat file bernama `.env.example`.
4. Duplikat atau *copy* file `.env.example` tersebut, lalu ubah namanya menjadi `.env`.
5. Buka file `.env` tersebut dan isi variabel `GEMINI_API_KEY` dengan API Key milik Anda.

---

### OPSI 1: Menjalankan via Docker (Paling Mudah)
Jika Anda memiliki **Docker Desktop** yang sudah terinstal, Anda tidak perlu menginstal Python atau Node.js secara manual.

1. Buka terminal di folder utama proyek (sejajar dengan file `docker-compose.yml`).
2. Ketik perintah berikut:
   ```bash
   docker-compose up --build
   ```
3. Tunggu hingga proses *build* image selesai. Sistem akan menyala otomatis!
   - AI Service: `http://localhost:8000`
   - Backend Service: `http://localhost:5000`

---

### OPSI 2: Menjalankan Secara Manual (Tanpa Docker)
Jika Anda tidak menggunakan Docker, Anda harus menyalakan kedua server di dua terminal yang berbeda.

#### Terminal 1: Menyalakan Model AI (Python)
1. Buka terminal, masuk ke folder `Model_AI`.
2. (Opsional) Buat *virtual environment*: `python -m venv env` lalu aktifkan (`env\Scripts\activate` di Windows atau `source env/bin/activate` di macOS/Linux).
3. Install library yang dibutuhkan:
   ```bash
   pip install -r requirements.txt
   ```
4. Jalankan server FastAPI:
   ```bash
   python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```
   *(Catatan: Server FastAPI memuat model SentenceTransformer secara langsung dari folder lokal 'sbert_model/' dan embeddings ulasan dari 'review_embeddings.pkl', sehingga tidak memerlukan unduhan eksternal besar saat startup).*

#### Terminal 2: Menyalakan Backend (Node.js)
1. Buka terminal baru, masuk ke folder `Backend`.
2. Install library yang dibutuhkan:
   ```bash
   npm install
   ```
3. Jalankan server Express:
   ```bash
   npm start
   ```

---

## 🌐 Daftar URL yang Bisa Diakses

Setelah server berjalan dengan sukses, Anda dapat mengakses beberapa URL atau endpoint berikut melalui browser atau API Client (seperti Postman):

### 1. Backend Service (Node.js) — Port 5000
- **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)
- **API Rekomendasi (Hybrid AI + Gemini):** `POST http://localhost:5000/api/recommend`
  - *Payload (JSON):* `{"prompt": "kalimat pencarian", "top_n": 3}` (Catatan: controller backend saat ini meminta 3 rekomendasi teratas dari AI lokal).

### 2. AI Service (Python FastAPI) — Port 8000
- **Swagger UI (Dokumentasi Interaktif API):** [http://localhost:8000/docs](http://localhost:8000/docs) *(Sangat disarankan untuk melakukan testing secara langsung)*
- **Root Info:** [http://localhost:8000/api/](http://localhost:8000/api/)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **API Rekomendasi (Lokal AI saja):** `POST http://localhost:8000/api/recommend`
  - *Payload (JSON):* `{"query": "kalimat pencarian", "top_n": 5}`
- **Prediksi Intent Teks (Academic):** `POST http://localhost:8000/api/predict-intent`
  - *Payload (JSON):* `{"query": "kalimat pencarian"}`
- **Daftar Kategori Wisata:** [http://localhost:8000/api/categories](http://localhost:8000/api/categories)
- **Daftar Intent:** [http://localhost:8000/api/intents](http://localhost:8000/api/intents)

---

## 🧪 Uji Coba: Tahap Percobaan Input dan Output

Setelah kedua server menyala, Anda bisa mensimulasikan permintaan pengguna (Input) menuju API Backend. Anda bisa menggunakan **Postman**, **cURL**, atau membuat kode Frontend sendiri.

**Contoh Request (Postman):**
1. Buka aplikasi **Postman**.
2. Buat *request* baru dan ubah *method* menjadi **POST**.
3. Masukkan URL: `http://localhost:5000/api/recommend` *(Pastikan port menggunakan 5000)*.
4. Pilih tab **Headers**, lalu tambahkan:
   - **Key**: `Content-Type`
   - **Value**: `application/json`
5. Pilih tab **Body**, klik **raw**, dan pastikan formatnya **JSON**.
6. Masukkan data berikut ke dalam kolom teks (menguji fitur rekomendasi, deteksi negasi, dan hybrid ranking):
   ```json
   {
     "prompt": "pengen bawa keluarga liburan yang sepi dan dingin tapi ga mau di gunung"
   }
   ```
7. Klik tombol **Send**.

**Contoh Output (JSON):**
```json
{
  "status": "success",
  "reply": "Wah, seru sekali rencana liburannya! Mau membawa keluarga ke tempat yang sepi, adem, dan dingin tapi bukan daerah pegunungan tinggi ya? Tenang saja, Jabarulin punya beberapa rekomendasi yang pas banget:\n\n1. **Situ Patenggang**\nDanau yang sejuk di daerah perkebunan teh yang adem dan berkabut, cocok banget buat bersantai bareng keluarga tanpa harus trekking mendaki gunung. Kata pengunjung di sana: *\"Pemandangannya indah sekali, udaranya dingin berkabut menenangkan.\"*\nKamu bisa membuka lokasinya di sini: [Buka di Google Maps](https://maps.google.com/maps?q=Situ+Patenggang).\n\n2. **Ranca Upas**\nTempat di dataran tinggi yang asri dengan fasilitas camping keluarga dan penangkaran rusa. Udaranya sangat dingin kalau malam hari, tapi aksesnya datar dan ramah anak. Kata pengunjung di sana: *\"Bagus buat anak-anak memberi makan rusa, tempatnya dingin saat malam.\"*\nKamu bisa membuka lokasinya di sini: [Buka di Google Maps](https://maps.google.com/maps?q=Ranca+Upas).\n\nSemoga liburan keluarganya menyenangkan dan menenangkan ya!",
  "raw_data": [
    {
      "name": "Situ Patenggang",
      "category": "alam, keluarga",
      "intent_label": "alam",
      "address": "Ciwidey, Bandung, Jawa Barat",
      "phone": null,
      "website": "http://situpatenggang.com",
      "rating": 4.5,
      "total_reviews": 4820,
      "google_maps_url": "https://maps.google.com/maps?q=Situ+Patenggang",
      "similarity_score": 0.584,
      "final_score": 0.621,
      "reviews": [
        "Pemandangannya indah sekali, udaranya dingin berkabut menenangkan.",
        "Sangat recommended untuk dikunjungi bersama seluruh anggota keluarga."
      ]
    },
    {
      "name": "Ranca Upas",
      "category": "alam, camping",
      "intent_label": "camping",
      "address": "Ranca Upas, Ciwidey, Bandung, Jawa Barat",
      "phone": "08123456789",
      "website": null,
      "rating": 4.5,
      "total_reviews": 12500,
      "google_maps_url": "https://maps.google.com/maps?q=Ranca+Upas",
      "similarity_score": 0.521,
      "final_score": 0.598,
      "reviews": [
        "Bagus buat anak-anak memberi makan rusa, tempatnya dingin saat malam.",
        "Tempat camping paling asri di daerah Ciwidey."
      ]
    }
  ]
}
```

> **Catatan Endpoint:**
> - `reply`: Adalah teks pemandu wisata natural yang dihasilkan oleh Gemini LLM untuk ditampilkan langsung di antarmuka *Chatbot* pengguna.
> - `raw_data`: Adalah data terstruktur hasil penyaringan dan peringkat dari AI Lokal (FastAPI) yang dikirim agar Frontend dapat merender desain kartu UI (Card), peta lokasi, galeri, nomor telepon, maupun ulasan riil secara dinamis.

---

## Tim Pengembang

**Capstone Project PJK-GM049**