import FeaturesSection from "@/components/FeaturesSection";
import { Brain, Users, Target, Zap } from "lucide-react";

export const metadata = {
  title: "Tentang JabarUlin AI — Teknologi & Tim",
  description: "Pelajari teknologi AI di balik JabarUlin: IndoBERT, TF-IDF, Gemini, dan cara kerja sistem rekomendasi kami.",
};

const TEAM_ROLES = [
  { role: "Project Manager & System Analyst", desc: "Mengoordinasikan tahapan pengembangan, menganalisis kebutuhan fungsional sistem, merancang diagram alur, dan menyusun laporan Capstone Project." },
  { role: "AI & Model Engineer", desc: "Melatih (fine-tuning) model IndoBERT Classifier, mengonfigurasi hybrid semantic search (TF-IDF + IndoBERT Embeddings), dan menyajikan API model via FastAPI." },
  { role: "Backend Developer", desc: "Merancang dan membangun arsitektur server Node.js + Express, manajemen database MongoDB, serta integrasi Google Maps APIs (Geocoding, Places, Routes)." },
  { role: "Frontend Developer", desc: "Membangun antarmuka web (UI/UX Next.js & TypeScript) yang premium, dinamis, responsif, dan mengintegrasikan alur chat log terpandu dua tahap." },
  { role: "Data Engineer & Analyst", desc: "Mengumpulkan, membersihkan, dan menormalkan ulasan pariwisata Jawa Barat (dataset xlsx) serta menyiapkan data latih & validasi untuk model IndoBERT." },
];

const TECH_STACK = [
  { name: "Next.js 15", category: "Frontend", color: "#0070f3" },
  { name: "TypeScript", category: "Frontend", color: "#3178c6" },
  { name: "Node.js + Express", category: "Backend", color: "#339933" },
  { name: "MongoDB", category: "Database", color: "#47a248" },
  { name: "FastAPI", category: "AI Service", color: "#009688" },
  { name: "IndoBERT", category: "AI Model", color: "#ff6b35" },
  { name: "TF-IDF + Cosine", category: "AI Algorithm", color: "#9c27b0" },
  { name: "Gemini 2.5 Flash", category: "LLM", color: "#4285f4" },
];

export default function TentangPage() {
  return (
    <div style={{ paddingTop: "4rem" }}>
      {/* Hero Tentang */}
      <section style={{
        background: "linear-gradient(135deg, var(--blue-50) 0%, var(--slate-50) 100%)",
        padding: "5rem 1.5rem 4rem",
        textAlign: "center",
        borderBottom: "1px solid var(--blue-100)"
      }}>
        <div className="container" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="section-tag" style={{ display: "inline-flex", marginBottom: "1rem" }}>
            ✨ Tentang Kami
          </div>
          <h1 className="section-title">
            Tentang <span className="gradient-text">JabarUlin AI</span>
          </h1>
          <p className="section-subtitle" style={{ maxWidth: 600, margin: "0 auto" }}>
            JabarUlin adalah platform rekomendasi wisata cerdas untuk Jawa Barat, dibangun sebagai
            <strong> Capstone Project PJK-GM049</strong> oleh tim mahasiswa yang berfokus pada
            penerapan Artificial Intelligence di bidang pariwisata.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "3rem 1.5rem", background: "white" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
          {[
            { icon: <Brain size={28} />, label: "Model AI", value: "IndoBERT v3.0" },
            { icon: <Target size={28} />, label: "Akurasi", value: "96.49%" },
            { icon: <Zap size={28} />, label: "Destinasi", value: "274 Unik" },
            { icon: <Users size={28} />, label: "Tim", value: "5 Anggota" },
          ].map((s) => (
            <div key={s.label} style={{
              textAlign: "center",
              padding: "2rem 1rem",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--blue-100)",
              background: "var(--blue-50)",
            }}>
              <div style={{ color: "var(--blue-500)", marginBottom: 12, display: "flex", justifyContent: "center" }}>{s.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--slate-800)", fontFamily: "var(--font-display)" }}>{s.value}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--slate-500)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tim */}
      <section style={{ padding: "4rem 1.5rem", background: "var(--slate-50)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">👥 Tim Pengembang</div>
            <h2 className="section-title">Pembagian <span className="gradient-text">Tugas Tim</span></h2>
            <p className="section-subtitle">Proyek ini dikerjakan secara kolaboratif oleh 5 anggota tim pengembang</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
            {TEAM_ROLES.map((t) => (
              <div key={t.role} style={{
                padding: "2rem",
                borderRadius: "var(--radius-xl)",
                background: "white",
                border: "1px solid var(--blue-100)",
                boxShadow: "var(--shadow-sm)",
              }}>
                <h3 style={{ color: "var(--blue-600)", fontWeight: 700, marginBottom: 8 }}>{t.role}</h3>
                <p style={{ color: "var(--slate-600)", fontSize: "0.9rem", lineHeight: 1.6 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ padding: "4rem 1.5rem", background: "white" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">⚙️ Teknologi</div>
            <h2 className="section-title">Tech <span className="gradient-text">Stack</span></h2>
            <p className="section-subtitle">Tumpukan teknologi modern yang digunakan dalam project ini</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center", maxWidth: 800, margin: "0 auto" }}>
            {TECH_STACK.map((t) => (
              <div key={t.name} style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "var(--radius-full)",
                background: `${t.color}15`,
                border: `1.5px solid ${t.color}40`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}>
                <span style={{ fontWeight: 700, color: t.color, fontSize: "0.9rem" }}>{t.name}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--slate-500)" }}>{t.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection />
    </div>
  );
}
