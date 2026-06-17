"use client";
import { useState, useEffect } from "react";
import { X, HelpCircle } from "lucide-react";

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Cek apakah user pertama kali membuka web
  useEffect(() => {
    const hasSeen = localStorage.getItem("jabarulin_onboarding_seen");
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("jabarulin_onboarding_seen", "true");
    setCurrentSlide(0);
  };

  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="floating-help-btn"
        title="Buka Panduan Pengguna"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          background: "var(--blue-600, #2563eb)",
          color: "white",
          border: "none",
          borderRadius: "50px",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05) translateY(-2px)";
          e.currentTarget.style.background = "#1d4ed8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) translateY(0)";
          e.currentTarget.style.background = "#2563eb";
        }}
      >
        <HelpCircle size={16} />
        <span>Panduan Sistem</span>
      </button>
    );
  }

  return (
    <div
      className="onboarding-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(148, 163, 184, 0.3)", // Light grey transparent backdrop
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1.5rem",
      }}
    >
      <div
        className="onboarding-card"
        style={{
          width: "100%",
          maxWidth: "850px",
          minHeight: "480px",
          background: "#ffffff",
          borderRadius: "40px", // Extremely rounded corners
          padding: "3.5rem 3rem 2.5rem",
          color: "#0f172a", // Dark slate text color
          boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.08), 0 15px 30px -10px rgba(0, 0, 0, 0.04)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-display), 'Plus Jakarta Sans', sans-serif",
          animation: "slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Subtle close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            background: "rgba(15, 23, 42, 0.05)",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(15, 23, 42, 0.1)";
            e.currentTarget.style.color = "#0f172a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(15, 23, 42, 0.05)";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          <X size={16} />
        </button>

        {/* Dynamic Slide Content */}
        <div style={{ flex: 1 }}>
          {currentSlide === 0 && (
            /* SLIDE 1: Welcome */
            <div style={{ display: "flex", gap: "2rem", alignItems: "center", minHeight: "330px" }}>
              {/* Left Column: Text & Actions */}
              <div style={{ flex: 1.25, display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#1e293b", margin: 0, lineHeight: 1.15 }}>
                  Selamat Datang<br />di <span style={{ color: "#0284c7" }}>JabarUlin!</span>
                </h1>
                <p style={{ fontSize: "1.05rem", color: "#64748b", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                  Temukan destinasi impianmu di Jawa Barat dengan asisten wisata cerdas.
                </p>
                
                {/* Bullets */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "0.5rem 0" }}>
                  {[
                    "Rekomendasi Personal",
                    "Navigasi Pintar",
                    "Update Real-time"
                  ].map((text, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#0284c7" />
                        <path d="M8 12.5 L11 15.5 L16.5 9.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ fontSize: "1rem", fontWeight: 600, color: "#334155" }}>{text}</span>
                    </div>
                  ))}
                </div>

                {/* Blue Button */}
                <div>
                  <button
                    onClick={handleNext}
                    style={{
                      background: "#0284c7",
                      color: "white",
                      border: "none",
                      borderRadius: "100px",
                      padding: "14px 60px",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 8px 20px rgba(2, 132, 199, 0.25)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.background = "#0270a9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.background = "#0284c7";
                    }}
                  >
                    Lanjut
                  </button>
                </div>
              </div>

              {/* Right Column: Robot Illustration */}
              <div style={{ flex: 0.85, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ width: "240px", height: "240px" }}>
                  <svg viewBox="0 0 200 150" width="100%" height="100%">
                    <circle cx="100" cy="75" r="70" fill="#f0f9ff" />
                    
                    <path d="M40,110 L70,50 L100,110 Z" fill="#bae6fd" />
                    <path d="M80,110 L120,30 L160,110 Z" fill="#7dd3fc" />
                    
                    <path d="M64,62 L70,50 L76,62 L71,58 Z" fill="white" />
                    <path d="M110,50 L120,30 L130,50 L122,44 Z" fill="white" />
                    
                    <path d="M30,110 C80,80 120,130 170,110 L170,140 L30,140 Z" fill="#bbf7d0" />
                    
                    <path d="M70,120 C100,105 110,140 140,125" stroke="#38bdf8" strokeWidth="6" fill="none" strokeLinecap="round" />
                    
                    <ellipse cx="60" cy="115" rx="15" ry="4" fill="rgba(0,0,0,0.1)" />
                    <rect x="42" y="80" width="36" height="30" rx="10" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                    <rect x="50" y="88" width="20" height="14" rx="4" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
                    
                    <rect x="38" y="46" width="44" height="32" rx="8" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                    <rect x="43" y="51" width="34" height="22" rx="4" fill="#0f172a" />
                    <ellipse cx="51" cy="62" rx="3.5" ry="3.5" fill="#38bdf8" />
                    <ellipse cx="69" cy="62" rx="3.5" ry="3.5" fill="#38bdf8" />
                    <path d="M57,67 Q60,70 63,67" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <line x1="60" y1="46" x2="60" y2="38" stroke="#2563eb" strokeWidth="2.5" />
                    <circle cx="60" cy="36" r="3.5" fill="#38bdf8" />
                    
                    <path d="M80,85 C90,80 95,70 98,62" stroke="#2563eb" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M40,85 C32,90 28,95 28,100" stroke="#2563eb" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {currentSlide === 1 && (
            /* SLIDE 2: Category Selection */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: "330px", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                Pilih Suasana Liburanmu
              </h2>
              <p style={{ fontSize: "0.95rem", color: "#64748b", maxWidth: "520px", margin: "0 auto 1rem", lineHeight: 1.5 }}>
                Bantu kami memberikan saran terbaik dengan memilih kategori yang paling kamu sukai.
              </p>

              {/* 2x2 Category Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", width: "100%", maxWidth: "500px" }}>
                {[
                  {
                    name: "Alam",
                    icon: (
                      <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
                        <path d="M6 38 L24 10 L42 38 Z" fill="#eff6ff" stroke="#0284c7" strokeWidth="3" strokeLinejoin="round" />
                        <path d="M18 38 L18 32 L15 32 L20 25 L25 32 L22 32 L22 38 Z" fill="#0284c7" />
                        <path d="M28 38 L28 34 L26 34 L30 28 L34 34 L32 34 L32 38 Z" fill="#0284c7" />
                      </svg>
                    )
                  },
                  {
                    name: "Kuliner",
                    icon: (
                      <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
                        <path d="M16 10 V22 M20 10 V22 M24 10 V22 M20 22 V38" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                        <path d="M32 10 C28 10 28 22 32 22 C36 22 36 10 32 10 Z M32 22 V38" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" fill="#eff6ff" />
                      </svg>
                    )
                  },
                  {
                    name: "Keluarga",
                    icon: (
                      <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
                        <circle cx="16" cy="16" r="6" stroke="#0284c7" strokeWidth="3" fill="#eff6ff" />
                        <path d="M6 34 C6 28 10 24 16 24 C22 24 26 28 26 34" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="32" cy="20" r="5" stroke="#0284c7" strokeWidth="3" fill="#eff6ff" />
                        <path d="M24 34 C24 29 28 26 32 26 C36 26 40 29 40 34" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )
                  },
                  {
                    name: "Budaya",
                    icon: (
                      <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
                        <path d="M6 22 C14 18 18 10 24 14 C30 10 34 18 42 22" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                        <rect x="12" y="22" width="24" height="16" stroke="#0284c7" strokeWidth="3" strokeLinejoin="round" fill="#eff6ff" />
                        <line x1="24" y1="28" x2="24" y2="38" stroke="#0284c7" strokeWidth="2" />
                        <rect x="20" y="32" width="8" height="6" stroke="#0284c7" strokeWidth="2" />
                      </svg>
                    )
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: idx === 0 ? "2px solid #0ea5e9" : "1.5px solid #e2e8f0",
                      borderRadius: "20px",
                      padding: "1.2rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      background: idx === 0 ? "#f0f9ff" : "#ffffff",
                      cursor: "pointer",
                      boxShadow: idx === 0 ? "0 4px 12px rgba(14, 165, 233, 0.08)" : "none"
                    }}
                  >
                    {item.icon}
                    <strong style={{ fontSize: "0.95rem", color: idx === 0 ? "#0284c7" : "#475569" }}>
                      {item.name}
                    </strong>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "1rem" }}>
                Pilihanmu membantu kami menyaring ribuan destinasi agar lebih relevan.
              </p>
            </div>
          )}

          {currentSlide === 2 && (
            /* SLIDE 3: Chat/Describe */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: "330px", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                Ceritakan Keinginanmu
              </h2>
              <p style={{ fontSize: "0.95rem", color: "#64748b", maxWidth: "520px", margin: "0 auto 1.5rem", lineHeight: 1.5 }}>
                Gunakan bahasa sehari-hari untuk menemukan petualangan impian Anda di Jawa Barat. Cukup ketik apa yang Anda cari seperti berbicara dengan teman.
              </p>

              {/* Chat Input Mockup Widget */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "480px",
                  border: "2px solid #e0f2fe",
                  borderRadius: "24px",
                  background: "#eff6ff",
                  padding: "16px 20px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  boxShadow: "0 10px 30px rgba(2, 132, 199, 0.05)"
                }}
              >
                {/* Chat bubbles */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "#3b82f6", color: "white", padding: "10px 16px", borderRadius: "18px 18px 2px 18px", fontSize: "0.88rem", maxWidth: "80%" }}>
                    Mau cari tempat bermain anak yang seru 👨‍👩‍👧
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "white", color: "#334155", padding: "10px 16px", borderRadius: "18px 18px 18px 2px", fontSize: "0.88rem", border: "1px solid #e2e8f0", maxWidth: "85%", textAlign: "left" }}>
                    ✨ Rekomendasi wisata ramah anak & keluarga: **Lembang Park Zoo**
                  </div>
                </div>

                {/* Mockup input box */}
                <div
                  style={{
                    background: "white",
                    borderRadius: "100px",
                    border: "1.5px solid #bae6fd",
                    padding: "6px 6px 6px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "6px"
                  }}
                >
                  <span style={{ color: "#94a3b8", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#0ea5e9", fontWeight: 700 }}>&gt;</span>
                    Cari tempat yang sejuk untuk anak-anak...
                  </span>
                  <div
                    style={{
                      background: "#0ea5e9",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "0.8rem",
                      fontWeight: "bold"
                    }}
                  >
                    ➤
                  </div>
                </div>
              </div>

              {/* Big "Coba Sekarang" button */}
              <div style={{ marginTop: "2rem" }}>
                <button
                  onClick={handleClose}
                  style={{
                    background: "#0ea5e9",
                    color: "white",
                    border: "none",
                    borderRadius: "100px",
                    padding: "14px 60px",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(14, 165, 233, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.background = "#0284c7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "#0ea5e9";
                  }}
                >
                  Coba Sekarang
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls based on slide style */}
        {currentSlide === 1 && (
          /* Slide 2 controls: Dots on the left, buttons on the right */
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1.5px solid #f1f5f9", paddingTop: "1.5rem", marginTop: "1rem" }}>
            {/* Pagination Line / Dots */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ width: "24px", height: "6px", borderRadius: "50px", background: "#0284c7", transition: "all 0.3s" }} />
              <span style={{ width: "6px", height: "6px", borderRadius: "50px", background: "#cbd5e1" }} />
              <span style={{ width: "6px", height: "6px", borderRadius: "50px", background: "#cbd5e1" }} />
            </div>

            {/* Back / Next Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handlePrev}
                style={{
                  background: "#e2e8f0",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 24px",
                  color: "#475569",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#cbd5e1"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#e2e8f0"}
              >
                Kembali
              </button>
              <button
                onClick={handleNext}
                style={{
                  background: "#0284c7",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 28px",
                  color: "white",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 10px rgba(2, 132, 199, 0.15)",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#0270a9"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#0284c7"}
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {currentSlide === 2 && (
          /* Slide 3 controls: Pagination dots centered at the very bottom */
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "1.5rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50px", background: "#cbd5e1" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50px", background: "#cbd5e1" }} />
            <span style={{ width: "24px", height: "6px", borderRadius: "50px", background: "#0ea5e9", transition: "all 0.3s" }} />
          </div>
        )}
      </div>
    </div>
  );
}
