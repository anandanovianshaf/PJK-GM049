"use client";
import { MapPin, Star, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const PREVIEW_DESTINATIONS = [
  { image: "/kawah putih.jpg", name: "Kawah Putih", rating: 4.7, address: "Ciwidey, Bandung" },
  { image: "/pantai pangandaran.jpg", name: "Pantai Pangandaran", rating: 4.6, address: "Pangandaran" },
  { image: "/gunung papandayan.jpg", name: "Gunung Papandayan", rating: 4.8, address: "Garut" },
];

export default function HeroSection() {
  const router = useRouter();

  return (
    <section id="hero" className="hero">
      {/* Background Orbs */}
      <div className="hero-orbs">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
      </div>

      <div className="hero-inner">
        {/* Left — Content */}
        <div>
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            🤖 Powered by IndoBERT + Gemini AI
          </div>

          <h1 className="hero-title">
            Temukan Wisata{" "}
            <span className="gradient-text">Terbaik</span>
            <br />
            di Jawa Barat
          </h1>

          <p className="hero-subtitle">
            Pilih kategori wisata impianmu dan ceritakan keinginan wisatamu dalam bahasa natural. 
            AI kami akan merekomendasikan destinasi sempurna untukmu — lengkap dengan info lalu lintas 
            dan navigasi Google Maps.
          </p>

          {/* CTA Buttons */}
          <div style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <button
              id="hero-start-btn"
              onClick={() => router.push("/chat")}
              className="hero-search-btn"
              style={{
                padding: "0.85rem 1.75rem",
                fontSize: "1.02rem",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-md)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Sparkles size={16} />
              Mulai Cari Wisata
            </button>
            <button
              id="hero-explore-btn"
              onClick={() => {
                const element = document.getElementById("categories");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "0.85rem 1.75rem",
                fontSize: "1.02rem",
                borderRadius: "var(--radius-lg)",
                background: "white",
                border: "1.5px solid var(--blue-100)",
                color: "var(--slate-700)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--blue-50)";
                e.currentTarget.style.borderColor = "var(--blue-200)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.borderColor = "var(--blue-100)";
              }}
            >
              Jelajahi Kategori
            </button>
          </div>

          {/* Stats */}
          <div className="hero-stats" style={{ marginTop: "3rem" }}>
            <div className="hero-stat">
              <span className="hero-stat-number">274+</span>
              <span className="hero-stat-label">Destinasi Wisata</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">4.8★</span>
              <span className="hero-stat-label">Rating Rata-rata</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">96.5%</span>
              <span className="hero-stat-label">Akurasi AI</span>
            </div>
          </div>
        </div>

        {/* Right — Chat Preview */}
        <div className="hero-visual">
          <div className="hero-chat-preview">
            {/* Chat Header */}
            <div className="hero-chat-header">
              <div className="hero-chat-header-avatar">🤖</div>
              <div className="hero-chat-header-info">
                <h4>Jabarulin AI</h4>
                <span>Asisten Wisata Jawa Barat</span>
              </div>
              <div className="hero-chat-header-status" />
            </div>

            {/* Chat Body */}
            <div className="hero-chat-body">
              <div className="hero-bubble hero-bubble-user">
                Keluarga terpilih! Mau cari tempat bermain anak yang seru 👨‍👩‍👧
              </div>

              <div className="hero-bubble hero-bubble-ai">
                ✨ Siap! Berikut destinasi wisata ramah anak dan keluarga terbaik di Jawa Barat yang cocok buat kamu:
              </div>

              {PREVIEW_DESTINATIONS.map((d, i) => (
                <div key={i} className="hero-dest-mini">
                  <img src={d.image} alt={d.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                  <div className="hero-dest-mini-info">
                    <strong>{d.name}</strong>
                    <span>
                      <MapPin size={10} style={{ display: "inline" }} /> {d.address}
                    </span>
                  </div>
                  <span className="hero-dest-mini-rating">
                    <Star size={10} style={{ display: "inline", fill: "white" }} /> {d.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badge */}
          <div style={{
            position: "absolute",
            bottom: -16,
            right: -16,
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "12px 16px",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--blue-100)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--slate-700)",
          }}>
            <span style={{ fontSize: "1.2rem" }}>🧠</span>
            IndoBERT + TF-IDF
          </div>
        </div>
      </div>
    </section>
  );
}
