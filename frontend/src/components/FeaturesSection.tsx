"use client";
import { Brain, MapPin, Star, Navigation2, Clock, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: <Brain size={22} />,
    title: "AI Berbasis IndoBERT",
    desc: "Memahami bahasa Indonesia secara mendalam menggunakan model transformer IndoBERT yang dilatih khusus untuk memahami intent wisata Jawa Barat.",
  },
  {
    icon: <MapPin size={22} />,
    title: "10.000+ Destinasi",
    desc: "Database lengkap destinasi wisata Jawa Barat dengan informasi real-time: rating, ulasan, alamat, dan kontak yang selalu diperbarui.",
  },
  {
    icon: <Star size={22} />,
    title: "Rekomendasi Personal",
    desc: "Sistem hybrid TF-IDF + Cosine Similarity memastikan rekomendasi yang benar-benar sesuai dengan preferensi dan kebutuhan unikmu.",
  },
  {
    icon: <Navigation2 size={22} />,
    title: "Navigasi Instan",
    desc: "Integrasi langsung dengan Google Maps — satu klik langsung buka navigasi ke destinasi pilihanmu.",
  },
  {
    icon: <Clock size={22} />,
    title: "Respons Cepat",
    desc: "Powered by Gemini 2.5 Flash, dapatkan rekomendasi lengkap.",
  },
  {
    icon: <Shield size={22} />,
    title: "Data Terpercaya",
    desc: "Semua data bersumber dari Google Maps resmi dan diverifikasi.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="features-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">✨ Keunggulan</div>
          <h2 className="section-title">
            Mengapa <span className="gradient-text">JabarUlin AI</span>?
          </h2>
          <p className="section-subtitle">
            Rekomendasi Wisata Terbaik di Jawa Barat
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon-wrap">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
