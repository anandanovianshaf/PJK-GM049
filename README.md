# Jabarulin AI

**Sistem Rekomendasi Wisata Cerdas Berbasis NLP di Jawa Barat**  
*Capstone Project PJK-GM049 — Kolaborasi Pijak × IBM SkillsBuild*

---

## Deskripsi Singkat

Jabarulin AI adalah sebuah sistem cerdas yang memecahkan masalah wisatawan dalam mencari destinasi spesifik di Jawa Barat menggunakan bahasa sehari-hari. Alih-alih menggunakan pencarian kata kunci yang kaku (seperti *"wisata alam bandung"*), pengguna dapat mengetik kalimat natural seperti *"pengen bawa keluarga liburan yang sepi dan dingin"*. 

Sistem ini bekerja dengan arsitektur **Hybrid AI Pipeline**:
1. **Model AI Lokal (Python/FastAPI):** Menggunakan model **IndoBERT** hasil *fine-tuning* untuk mendeteksi *intent* (niat) dari kalimat pengguna, dipadukan dengan perhitungan **TF-IDF & Cosine Similarity** untuk mencari top destinasi dari dataset spesifik Jawa Barat.
2. **Generative AI (Node.js/Express):** Hasil pencarian mentah dari AI lokal kemudian dikirimkan ke **Google Gemini LLM (gemini-2.5-flash)** untuk dirangkai menjadi balasan layaknya seorang pemandu wisata (*tour guide*) yang ramah, natural, dan interaktif.

---

## Struktur Monorepo

Repository ini menggabungkan dua *service* utama (Microservices) ke dalam satu wadah:

```text
Jabarulin_Project/
│
├── Model_AI/
│   ├── notebooks/
│   ├── app.py
│   ├── dataset_final_jabarulin.csv
│   ├── label_encoder.pkl
│   ├── requirements.txt
│   └── Dockerfile
│
├── Backend/
│   ├── controllers/
│   │   └── recommendationController.js
│   ├── routes/
│   │   └── apiRoutes.js
│   ├── services/
│   │   ├── aiService.js
│   │   └── geminiService.js
│   ├── middleware/
│   ├── package.json
│   ├── server.js
│   └── Dockerfile
│
├── jabarulin-frontend/
│   ├── public/
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── DestinationCard.tsx
│   │   │   ├── ChatBot.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── lib/
│   │   │   └── api.ts
│   │   │
│   │   ├── hooks/
│   │   ├── types/
│   │   └── styles/
│   │
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```


---

## Cara Menggunakan (Mulai dari Nol)

Anda bisa menjalankan proyek ini menggunakan **Docker** (Sangat Disarankan) atau secara **Manual**.

### Persiapan Awal (Wajib)
1. Lakukan `git clone` repository ini ke komputer Anda.
2. Dapatkan API Key Gemini dari [Google AI Studio](https://aistudio.google.com/).
3. Buat file bernama `.env` di dalam folder `Backend/` dan masukkan kode berikut:
   ```env
   GEMINI_API_KEY="masukkan_api_key_asli_anda_disini"
   ```

---

### OPSI 1: Menjalankan via Docker (Paling Mudah)
Jika Anda memiliki **Docker Desktop** yang sudah terinstal, Anda tidak perlu menginstal Python atau Node.js secara manual.

1. Buka terminal di folder utama proyek (sejajar dengan file `docker-compose.yml`).
2. Ketik perintah berikut:
   ```bash
   docker-compose up --build
   ```
3. Tunggu hingga proses *download* image dan library selesai. Sistem akan menyala otomatis!
   - AI Service: `http://localhost:8000`
   - Backend Service: `http://localhost:3000`

---

### OPSI 2: Menjalankan Secara Manual (Tanpa Docker)
Jika Anda tidak menggunakan Docker, Anda harus menyalakan kedua server di dua terminal yang berbeda.

#### Terminal 1: Menyalakan Model AI (Python)
1. Buka terminal, masuk ke folder `Model_AI`.
2. (Opsional) Buat *virtual environment*: `python -m venv env` lalu aktifkan (`env\Scripts\activate` di Windows).
3. Install library yang dibutuhkan:
   ```bash
   pip install -r requirements.txt
   ```
4. Jalankan server FastAPI:
   ```bash
   python -m uvicorn app:app --host 0.0.0.0 --port 8000
   ```
   *(Catatan: Saat pertama kali dijalankan, sistem akan otomatis mengunduh file model IndoBERT sebesar ~500MB dari Hugging Face Hub `Dhaffa/jabarulin-indobert`. Pastikan internet stabil).*

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

## Uji Coba: Tahap Percobaan Input dan Output

Setelah kedua server menyala, Anda bisa mensimulasikan permintaan pengguna (Input) menuju API Backend. Anda bisa menggunakan **Postman**, **cURL**, atau membuat kode Frontend sendiri.

**Contoh Request (cURL):**
```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"prompt": "pengen bawa keluarga liburan yang sepi dan dingin"}'
```

**Contoh Output (JSON):**
```json
{
  "status": "success",
  "reply": "Wah, pengen bawa keluarga liburan yang sepi dan dingin ya? Ide yang bagus banget tuh! Pasti seru kalau bisa quality time bareng di tempat yang adem. Jabarulin punya rekomendasi yang pas:\n\n1. **Dusun Bambu**\nKalau cari suasana yang adem ayem dan dikelilingi hijaunya alam, ini juara banget! Udara pegunungannya bikin seger, cocok buat ngilangin penat.\n\n2. **Farmhouse Lembang**\nMasih di Lembang, tempat ini punya suasana pedesaan Eropa yang estetik. Anak-anak pasti suka berinteraksi dengan hewan lucu di udara yang dingin.\n\nSemoga liburan keluarganya berkesan ya!",
  "raw_data": [
    {
      "name": "Dusun Bambu",
      "category": "alam, keluarga",
      "rating": 4.5,
      "google_maps_url": null
    },
    {
      "name": "Farmhouse Lembang",
      "category": "keluarga, spot foto",
      "rating": 4.5,
      "google_maps_url": null
    }
  ]
}
```

> **Catatan Endpoint:**
> - `reply`: Adalah teks natural yang dihasilkan oleh Gemini LLM untuk ditampilkan di antarmuka *Chatbot*.
> - `raw_data`: Adalah data terstruktur dari AI Lokal (FastAPI) yang bisa Frontend manfaatkan untuk merender desain kartu UI (Card), Peta, atau List interaktif.

---

## Tim Pengembang

**Capstone Project PJK-GM049**

| Nama |
|------|
| Adithya Raihan Pratama |
| Aldy Permana |
| Ananda Novianshaf |
| Dhaffa Zikrullah Ramadhan |
| Dwi Saktya Hari Aditya |

Terima kasih kepada seluruh anggota tim yang telah berkontribusi dalam pengembangan proyek ini.
