# API Contract — Jabarulin AI Backend

---

## Base URL

```
Development (Docker): http://localhost:5000
```

---

## Format Response Standar

Semua response menggunakan format JSON dengan field `status`:

```json
// Sukses
{ "status": "success", ... }

// Error
{ "status": "error", "message": "Deskripsi error" }
```

---

## Autentikasi

Backend menggunakan **JWT (JSON Web Token)**. Token dikirim via header:

```
Authorization: Bearer <token>
```

Token berlaku selama **7 hari**. Setelah expired, user harus login ulang.

> **Penting:** Endpoint rekomendasi **bisa diakses tanpa token** (mode guest).
> Tapi kalau ada token valid, histori percakapan akan disimpan otomatis.

---

## DAFTAR ENDPOINT

---

### 1. Health Check

Cek apakah server jalan.

```
GET /health
```

**Response 200:**
```json
{
  "status": "success",
  "message": "Jabarulin AI Backend is running"
}
```

---

### 2. Register (Email & Password)

```
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "nama": "Budi Santoso",
  "email": "budi@example.com",
  "password": "rahasia123"
}
```

**Validasi:**
| Field | Aturan |
|---|---|
| `nama` | Wajib ada, tidak boleh kosong |
| `email` | Wajib ada, format email valid |
| `password` | Wajib ada, minimal 6 karakter |

**Response 201 (Berhasil):**
```json
{
  "status": "success",
  "message": "Registrasi berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6849f2a1c3d4e5f6a7b8c9d0",
      "nama": "Budi Santoso",
      "email": "budi@example.com"
    }
  }
}
```

**Response 400 (Validasi Gagal):**
```json
{
  "status": "error",
  "message": "Format email tidak valid, Password minimal 6 karakter"
}
```

**Response 400 (Email Sudah Terdaftar):**
```json
{
  "status": "error",
  "message": "Email sudah terdaftar"
}
```

> **Catatan untuk Frontend:** Simpan `token` dari response ini di `localStorage` atau state management. Gunakan untuk request selanjutnya.

---

### 3. Login (Email & Password)

```
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "budi@example.com",
  "password": "rahasia123"
}
```

**Response 200 (Berhasil):**
```json
{
  "status": "success",
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6849f2a1c3d4e5f6a7b8c9d0",
      "nama": "Budi Santoso",
      "email": "budi@example.com"
    }
  }
}
```

**Response 401 (Kredensial Salah):**
```json
{
  "status": "error",
  "message": "Email atau password salah"
}
```

---

### 4. Login via Google OAuth

Flow OAuth terdiri dari 2 langkah:

**Langkah 1 — Arahkan user ke URL ini (buka di browser/redirect):**
```
GET /api/auth/google
```
User akan diarahkan ke halaman consent Google.

**Langkah 2 — Google akan callback ke backend, lalu backend redirect ke Frontend:**
```
GET /api/auth/google/callback  ← Ini dihandle otomatis oleh backend
```

Setelah sukses, user akan diredirect ke:
```
http://localhost:3000/auth/callback?token=<JWT_TOKEN>
```

> **Catatan untuk Frontend:**
> - Buat halaman `/auth/callback` di Next.js
> - Di halaman itu, ambil `token` dari query string: `const token = searchParams.get('token')`
> - Simpan token ke state/localStorage, lalu redirect ke halaman utama
> - Kalau Google OAuth gagal, user diredirect ke: `/login?error=auth_failed`

---

### 5. Get Profile (Wajib Login)

```
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "_id": "6849f2a1c3d4e5f6a7b8c9d0",
    "nama": "Budi Santoso",
    "email": "budi@example.com",
    "googleId": null,
    "createdAt": "2026-06-14T10:00:00.000Z",
    "updatedAt": "2026-06-14T10:00:00.000Z"
  }
}
```

**Response 401 (Tanpa Token / Token Invalid):**
```json
{
  "status": "error",
  "message": "Token tidak ditemukan, akses ditolak"
}
```

---

### 6. Rekomendasi Wisata ⭐ (Endpoint Utama)

Ini adalah endpoint inti sistem. Bisa diakses **dengan atau tanpa token**.

```
POST /api/recommendations
Content-Type: application/json
Authorization: Bearer <token>  ← OPSIONAL, tapi kalau ada histori tersimpan
```

**Request Body:**
```json
{
  "prompt": "tempat dingin tapi ga mau di gunung",
  "kategori": "Camping",
  "user_location": {
    "lat": -6.9175,
    "lng": 107.6191
  }
}
```

**Validasi Request Body:**
| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `prompt` | String | ✅ | Deskripsi bebas keinginan user |
| `kategori` | String | ✅ | Lihat daftar kategori valid di bawah |
| `user_location` | Object | ✅ | Koordinat posisi user saat ini |
| `user_location.lat` | Float | ✅ | Latitude, contoh: `-6.9175` |
| `user_location.lng` | Float | ✅ | Longitude, contoh: `107.6191` |

**Daftar Kategori Valid (`kategori`):**
```
Healing      → Spa, pemandian air panas, resort
Adventure    → Hiking, rafting, offroad
Camping      → Bumi perkemahan, camping ground
Keluarga     → Taman bermain, kebun binatang, waterpark
Edukasi      → Museum, cagar alam, bangunan bersejarah
Kuliner      → Wisata kuliner, pasar tradisional
Sejarah      → Bangunan bersejarah, situs sejarah
Romantis     → Spot sunset, danau, titik pemandangan
```

> **Tips untuk Frontend:** Buat dropdown/selector dengan pilihan kategori di atas. Jangan biarkan user input bebas untuk field `kategori`.

---

**Response 200 (Sukses):**
```json
{
  "status": "success",
  "pesan_ai": "Curug Citiis bisa jadi pilihan yang pas banget buat kamu! Tempat ini punya suasana sejuk dan segar tanpa harus mendaki gunung tinggi. Dengan rating 4.6 dan jaraknya sekitar 60.6 km dari lokasi kamu dengan estimasi perjalanan sekitar 101 menit, memang butuh sedikit waktu, tapi dijamin worth it. Oh iya, kondisi lalu lintas saat ini sedang macet, jadi mungkin bisa berangkat lebih pagi ya!",
  "destinasi": {
    "nama_tempat": "Curug Citiis",
    "rating": 4.6,
    "lokasi": {
      "lat": -7.157136100000001,
      "lng": 107.8656813
    },
    "photos": [
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=AaVGc3lA...&key=...",
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=AaVGc3mH...&key=...",
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=AaVGc3lb...&key=...",
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=AaVGc3lS...&key=...",
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=AaVGc3nw...&key=..."
    ]
  },
  "rute_dan_lalu_lintas": {
    "jarak_meter": 60645,
    "durasi_detik": 6058,
    "kondisi_kemacetan": "TRAFFIC_JAM",
    "polyline": "~cfi@ahzoS..."
  }
}
```

---

**Penjelasan Field Response — Penting Dibaca:**

**`pesan_ai`** (String)
- Teks natural bahasa Indonesia dari AI
- Bisa berisi kalimat fallback statis kalau Gemini API sedang limit:
  `"Rekomendasi kami untuk kamu adalah Curug Citiis, cocok untuk kategori Camping..."`
- Tampilkan apa adanya ke user, tidak perlu parsing

**`destinasi.photos`** (Array of String)
- Array URL foto siap pakai, maksimal 5 foto
- Langsung bisa dipakai sebagai `src` di tag `<img>`:
  ```jsx
  <img src={destinasi.photos[0]} alt={destinasi.nama_tempat} />
  ```
- Bisa kosong `[]` kalau Places API tidak menemukan foto

**`destinasi.lokasi`** (Object)
- Koordinat lat/lng destinasi yang sudah diverifikasi Google Maps
- Gunakan untuk pin marker di Google Maps / Leaflet

**`rute_dan_lalu_lintas`** (Object | null)
- **Bisa `null`** kalau Google Routes API gagal atau timeout
- **Selalu cek null sebelum render:**
  ```jsx
  {rute_dan_lalu_lintas && (
    <div>Jarak: {rute_dan_lalu_lintas.jarak_meter / 1000} km</div>
  )}
  ```

**`rute_dan_lalu_lintas.jarak_meter`** (Number)
- Jarak dalam meter, konversi ke km: `(jarak_meter / 1000).toFixed(1)`

**`rute_dan_lalu_lintas.durasi_detik`** (Number)
- Durasi perjalanan dalam detik, konversi ke menit: `Math.round(durasi_detik / 60)`

**`rute_dan_lalu_lintas.kondisi_kemacetan`** (String)
- Nilai yang mungkin: `"NORMAL"`, `"SLOW"`, `"TRAFFIC_JAM"`
- Saran tampilan:
  ```
  NORMAL      → 🟢 Lancar
  SLOW        → 🟡 Agak Padat
  TRAFFIC_JAM → 🔴 Macet
  ```

**`rute_dan_lalu_lintas.polyline`** (String | null)
- Encoded polyline Google Maps untuk menggambar rute di peta
- Cara decode dan render di Google Maps JS SDK:
  ```javascript
  // Pakai library: @googlemaps/polyline-codec
  import { decode } from '@googlemaps/polyline-codec';
  const path = decode(polyline);
  // path = [[lat, lng], [lat, lng], ...]
  ```
- Atau pakai Google Maps JS SDK langsung:
  ```javascript
  const decodedPath = google.maps.geometry.encoding.decodePath(polyline);
  new google.maps.Polyline({ path: decodedPath, map: map });
  ```

---

**Response 400 (Validasi Gagal):**
```json
{
  "status": "error",
  "message": "Prompt wajib diisi, Kategori wajib diisi"
}
```

**Response 404 (AI Tidak Menemukan Rekomendasi):**
```json
{
  "status": "error",
  "message": "AI Service tidak menemukan rekomendasi yang sesuai"
}
```

**Response 502 (AI Service / Google Maps Bermasalah):**
```json
{
  "status": "error",
  "message": "Gagal terhubung ke AI Service, coba lagi nanti"
}
```

**Response 503 (Server Overload):**
```json
{
  "status": "error",
  "message": "Terjadi kesalahan pada server"
}
```

---

## Cara Dapat & Pakai Token di Frontend (Alur Lengkap)

```
1. User register/login → simpan token di localStorage:
   localStorage.setItem('jabarulin_token', token)

2. Setiap request ke /api/recommendations, sertakan token:
   headers: { Authorization: `Bearer ${localStorage.getItem('jabarulin_token')}` }

3. Kalau response 401 → token expired → redirect ke halaman login

4. Logout → hapus token:
   localStorage.removeItem('jabarulin_token')
```

---

## Contoh Fetch di Next.js

```javascript
// Rekomendasi (dengan atau tanpa token)
const getRekomendasi = async (prompt, kategori, userLocation) => {
  const token = localStorage.getItem('jabarulin_token'); // null kalau belum login

  const response = await fetch('http://localhost:5000/api/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }) // sertakan kalau ada
    },
    body: JSON.stringify({
      prompt,
      kategori,
      user_location: { lat: userLocation.lat, lng: userLocation.lng }
    })
  });

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data;
};
```

---

## Catatan Tambahan

- **CORS:** Backend hanya menerima request dari `http://localhost:3000`. Kalau ada error CORS, pastikan frontend jalan di port 3000.
- **Timeout AI:** Request ke `/api/recommendations` bisa memakan waktu 5–30 detik karena proses AI model berat. Tambahkan loading state yang informatif di UI.
- **Google OAuth di development:** Pastikan `GOOGLE_CALLBACK_URL` di `.env` backend sesuai. URL callback yang sudah dikonfigurasi: `http://localhost:5000/api/auth/google/callback`.
- **Foto bisa expired:** URL foto dari Google Places API mengandung `photo_reference` yang bisa expire. Jangan cache URL foto terlalu lama.
