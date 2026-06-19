"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Bot, User, MapPin, Star, ExternalLink, Sparkles, BarChart3, Car } from "lucide-react";
import { fetchRecommendations, DestinationItem } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  destinations?: DestinationItem[];
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  "🏔️ Tempat camping dengan pemandangan gunung di Jawa Barat",
  "🏖️ Pantai eksotis yang masih sepi dan asri",
  "🌿 Wisata alam keluarga yang sejuk dekat Bandung",
  "🚵 Aktivitas seru rafting dan hiking untuk pemula",
  "🍜 Kuliner dan restoran tradisional Sunda autentik",
  "🌊 Surfing dan olahraga air di pesisir Selatan",
  "🌸 Taman bunga dan kebun teh yang instagramable",
  "🏯 Wisata budaya dan sejarah bersejarah di Jabar",
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "ai",
  content: `Halo! 👋 Saya **Jabarulin**, asisten wisata cerdas untuk Jawa Barat.\n\nUntuk mendapatkan rekomendasi wisata yang paling akurat, silakan pilih kategori utama wisata yang kamu inginkan di bawah ini terlebih dahulu:`,
  timestamp: new Date(),
};

const CATEGORIES_LIST = [
  { name: "Wisata Alam", emoji: "🏔️", desc: "Air Terjun, Danau, Cagar Alam, Bukit" },
  { name: "Pantai", emoji: "🏖️", desc: "Pantai, Pantai Umum, Pesisir Laut" },
  { name: "Camping", emoji: "🏕️", desc: "Bumi Perkemahan, Kabin Perkemahan, Glamping" },
  { name: "Keluarga", emoji: "👨‍👩‍👧", desc: "Kebun Binatang, Kolam Renang, Taman Bermain" },
  { name: "Adventure", emoji: "🚵", desc: "Rafting, Offroad, Gunung Berapi, Puncak Gunung" },
  { name: "Fotografi", emoji: "📸", desc: "Titik Pemandangan, Bangunan Bersejarah" },
  { name: "Healing", emoji: "💆", desc: "Pemandian Air Panas, Spa, Hotel Resor" },
  { name: "Lainnya", emoji: "🏨", desc: "Hotel, Produsen Makanan, Pembangkit Listrik" }
];

interface ChatBotProps {
  initialQuery?: string;
  initialCategory?: string;
}

export default function ChatBot({ initialQuery, initialCategory }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastProcessedQuery = useRef<string | null>(null);
  const pendingQuery = useRef<string | null>(null);

  // Load chat history from localStorage and recover selectedCategory if present
  useEffect(() => {
    const saved = localStorage.getItem("jabarulin_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hydratedMessages = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(hydratedMessages);

        // Recover selected category from chat logs if user has already chosen one
        const lastCategoryMsg = hydratedMessages.findLast((m: any) => m.role === "user" && m.content.startsWith("Kategori terpilih:"));
        if (lastCategoryMsg) {
          const categoryName = lastCategoryMsg.content.replace("Kategori terpilih: ", "").trim();
          setSelectedCategory(categoryName);
        }
      } catch (e) {
        console.error("Gagal membaca history chat", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("jabarulin_chat_history", JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Hapus/nonaktifkan auto-scroll ke bawah saat ada pesan baru
  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages, scrollToBottom]);

  // Handle deep-linked initialQuery and initialCategory from Landing page
  useEffect(() => {
    if (initialQuery) {
      pendingQuery.current = initialQuery.replace(/__key\d+$/, "");
    }
  }, [initialQuery]);

  useEffect(() => {
    if (initialCategory) {
      const cat = initialCategory;
      setSelectedCategory(cat);

      if (pendingQuery.current) {
        const queryText = pendingQuery.current;
        pendingQuery.current = null; // Clear pending query

        setMessages([
          WELCOME_MESSAGE,
          {
            id: "initial-query-user-" + Date.now(),
            role: "user",
            content: queryText,
            timestamp: new Date()
          }
        ]);

        executeSearch(queryText, cat);
      } else {
        setMessages([WELCOME_MESSAGE]);
      }
    }
  }, [initialCategory]);

  const executeSearch = async (queryText: string, category: string) => {
    setLoading(true);
    try {
      const data = await fetchRecommendations(queryText, category, 5);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.reply,
        destinations: data.raw_data,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content:
          "⚠️ Maaf, terjadi gangguan koneksi ke server. Pastikan backend berjalan di port 5000 dan coba lagi.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);

    if (pendingQuery.current) {
      const queryText = pendingQuery.current;
      pendingQuery.current = null; // Clear pending query

      const queryMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: queryText,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, queryMsg]);
      executeSearch(queryText, category);
    }
  };

  const sendMessage = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || loading || !selectedCategory) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    await executeSearch(query, selectedCategory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedCategory && input.trim()) {
        sendMessage();
      }
    }
  };

  const clearChat = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat chat?")) {
      setMessages([WELCOME_MESSAGE]);
      setSelectedCategory(null);
      lastProcessedQuery.current = null;
      pendingQuery.current = null;
      localStorage.removeItem("jabarulin_chat_history");
    }
  };

  const handleResetCategory = () => {
    if (messages.length > 1) {
      if (confirm("Mengubah kategori akan menghapus riwayat chat saat ini. Apakah Anda yakin?")) {
        setSelectedCategory(null);
        setMessages([WELCOME_MESSAGE]);
        lastProcessedQuery.current = null;
        pendingQuery.current = null;
        localStorage.removeItem("jabarulin_chat_history");
      }
    } else {
      setSelectedCategory(null);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
          {i < text.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <section id="chatbot" className="chatbot-section">
      <div className="container">
        <div className="chat-window">
          {/* Chat Header */}
          <div className="chat-header" style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              maxWidth: "850px",
            }}>
              <div className="chat-header-info">
                <h3><strong>Jabarulin AI</strong></h3>
                <p>Asisten Wisata Cerdas Jawa Barat</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" id="chat-messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-group ${msg.role === "user" ? "user" : ""}`}
              >
                <div className={`message-avatar ${msg.role === "ai" ? "ai-avatar" : "user-avatar"}`}>
                  {msg.role === "ai" ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="message-content">
                  <div className={`message-bubble ${msg.role}`}>
                    {renderContent(msg.content)}
                  </div>

                  {/* Destination Cards */}
                  {msg.destinations && msg.destinations.length > 0 && (
                    <div className="chat-destinations">
                      {msg.destinations.map((dest, i) => (
                        <DestinationCard key={i} dest={dest} />
                      ))}
                    </div>
                  )}

                  <span className="message-time">
                    {isInitialized ? formatTime(msg.timestamp) : ""}
                  </span>
                </div>
              </div>
            ))}

            {/* Contextual Quick Suggestions based on chosen category */}
            {isInitialized && selectedCategory && messages.length <= 4 && !loading && (
              <div className="chat-empty" style={{ padding: "0.8rem 0" }}>
                <p>Mulai dengan klik salah satu saran di bawah atau tulis sendiri:</p>
                <div className="quick-suggestions">
                  {QUICK_SUGGESTIONS.filter(s => {
                    const lowerS = s.toLowerCase();
                    const lowerC = selectedCategory.toLowerCase();
                    if (lowerC === "wisata alam") return lowerS.includes("alam") || lowerS.includes("gunung");
                    if (lowerC === "pantai") return lowerS.includes("pantai") || lowerS.includes("laut") || lowerS.includes("pesisir");
                    if (lowerC === "camping") return lowerS.includes("camping");
                    if (lowerC === "keluarga") return lowerS.includes("keluarga");
                    if (lowerC === "adventure") return lowerS.includes("rafting") || lowerS.includes("adventure") || lowerS.includes("hiking");
                    if (lowerC === "fotografi") return lowerS.includes("foto") || lowerS.includes("budaya") || lowerS.includes("sejarah");
                    if (lowerC === "healing") return lowerS.includes("healing") || lowerS.includes("spa") || lowerS.includes("relaksasi") || lowerS.includes("sunji") || lowerS.includes("tenang");
                    return true;
                  }).slice(0, 4).map((s) => (
                    <button
                      key={s}
                      className="quick-chip"
                      id={`quick-chip-${s.slice(0, 10).replace(/\s/g, "-")}`}
                      onClick={() => sendMessage(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="typing-indicator">
                <div className="message-avatar ai-avatar">
                  <Bot size={16} />
                </div>
                <div className="typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <div className="chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  id="chat-text-input"
                  className="chat-input"
                  rows={1}
                  placeholder={isInitialized && selectedCategory ? "Ceritakan wisata impianmu... (Enter untuk kirim)" : "Pilih kategori wisata terlebih dahulu di atas..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!isInitialized || loading || !selectedCategory}
                />
              </div>
              <button
                id="chat-send-btn"
                className="chat-send-btn"
                onClick={() => sendMessage()}
                disabled={!isInitialized || loading || !input.trim() || !selectedCategory}
                aria-label="Kirim pesan"
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <div className="chat-input-footer">
              <span className="chat-input-hint">
                {isInitialized && selectedCategory ? (
                  <span>
                    Kategori aktif: <strong style={{ color: "var(--blue-400)" }}>{selectedCategory}</strong>
                  </span>
                ) : (
                  <span>
                    <Sparkles size={11} style={{ display: "inline", marginRight: 3 }} />
                    Silakan pilih kategori di atas
                  </span>
                )}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {isInitialized && selectedCategory && (
                  <button
                    className="chat-clear-btn"
                    onClick={handleResetCategory}
                    style={{ color: "var(--amber-400)", display: "flex", alignItems: "center", gap: 3 }}
                  >
                    Ganti Kategori
                  </button>
                )}
                <button className="chat-clear-btn" onClick={clearChat} id="chat-clear-btn">
                  <Trash2 size={12} /> Bersihkan Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection Popup Modal Overlay */}
      {isInitialized && !selectedCategory && (
        <div
          className="category-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.4)", // Dark slate semi-transparent overlay
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1.5rem",
            animation: "fadeIn 0.25s ease both",
          }}
        >
          <div
            className="category-modal-card"
            style={{
              width: "100%",
              maxWidth: "850px",
              background: "white",
              borderRadius: "24px",
              border: "1px solid var(--blue-100)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2rem",
              animation: "scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both"
            }}
          >
            <div className="section-header" style={{ textAlign: "center", marginBottom: "0rem" }}>
              <div className="section-tag" style={{ marginBottom: "0.75rem", display: "inline-flex" }}>🏷️ Kategori</div>
              <h2 className="section-title" style={{ fontSize: "2rem", fontWeight: 800, margin: "0.5rem 0", color: "var(--slate-900)" }}>
                Jelajahi Berdasarkan <span className="gradient-text">Minatmu</span>
              </h2>
              <p className="section-subtitle" style={{ fontSize: "0.95rem", color: "var(--slate-500)", margin: "0 auto", maxWidth: "520px" }}>
                Pilih kategori wisata favoritmu dan AI akan langsung merekomendasikan destinasi terbaik
              </p>
            </div>

            <div className="category-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
              width: "100%",
              maxWidth: "100%"
            }}>
              {CATEGORIES_LIST.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleSelectCategory(cat.name)}
                  className="category-card"
                  id={`cat-${cat.name.replace(/\s/g, "-")}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px 16px",
                    background: "white",
                    border: "1.5px solid var(--blue-100)",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%",
                    fontFamily: "inherit",
                    color: "inherit",
                    outline: "none"
                  }}
                >
                  <div className="category-emoji" style={{ fontSize: "2.2rem", marginBottom: "8px" }}>{cat.emoji}</div>
                  <div className="category-name" style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--slate-700)" }}>{cat.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Inline Destination Card ─── */
function DestinationCard({ dest }: { dest: DestinationItem }) {
  const stars = dest.rating ? Math.round(dest.rating) : 0;

  return (
    <div className="chat-dest-card">
      <div className="chat-dest-header">
        <span className="chat-dest-name">{dest.name}</span>
        {dest.rating && (
          <span className="chat-dest-rating">
            <Star size={10} fill="white" /> {dest.rating.toFixed(1)}
          </span>
        )}
      </div>

      <span className="chat-dest-category">{dest.category}</span>

      {dest.address && (
        <div className="chat-dest-address">
          <MapPin size={11} style={{ flexShrink: 0, marginTop: 2, color: "var(--blue-400)" }} />
          {dest.address}
        </div>
      )}

      {dest.distance_info && (
        <div className="chat-dest-address" style={{ marginTop: 4, color: "var(--amber-400)" }}>
          <Car size={11} style={{ flexShrink: 0, marginTop: 2 }} />
          {dest.distance_info.distance_km} km • {dest.distance_info.duration_mins} mnt ({dest.distance_info.traffic_condition === 'TRAFFIC_JAM' ? 'Macet' : dest.distance_info.traffic_condition === 'SLOW' ? 'Padat' : 'Lancar'})
        </div>
      )}

      {dest.total_reviews != null && (
        <div className="chat-dest-reviews">
          {stars > 0 && "★".repeat(stars)}{" "}
          {dest.total_reviews.toLocaleString("id-ID")} ulasan
        </div>
      )}

      {dest.reviews && dest.reviews.length > 0 && (
        <div className="chat-dest-reviews-list" style={{ marginTop: '8px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {dest.reviews.map((rev, idx) => (
            <div key={idx} style={{
              fontSize: '0.82rem',
              color: '#0f172a',
              background: 'rgba(15, 23, 42, 0.05)',
              padding: '8px 12px',
              borderRadius: '8px',
              borderLeft: '3px solid var(--blue-500)',
              lineHeight: '1.45',
              fontStyle: 'italic'
            }}>
              "{rev}"
            </div>
          ))}
        </div>
      )}

      <div className="chat-dest-actions">
        {dest.google_maps_url ? (
          <a
            href={dest.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-dest-maps-btn"
            id={`maps-btn-${dest.name.replace(/\s/g, "-")}`}
          >
            <MapPin size={12} /> Google Maps
            <ExternalLink size={10} />
          </a>
        ) : dest.website ? (
          <a
            href={dest.website}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-dest-maps-btn"
          >
            <ExternalLink size={12} /> Website
          </a>
        ) : (
          <span className="chat-dest-maps-btn" style={{ opacity: 0.5, cursor: "default" }}>
            <MapPin size={12} /> Tidak ada link
          </span>
        )}

        <span className="chat-dest-score" title={`Raw Score: ${dest.final_score.toFixed(3)}`}>
          <BarChart3 size={11} />
          {dest.final_score > 0 
            ? `${Math.min(Math.round(dest.final_score * 200), 99)}% Match`
            : "95% Match"}
        </span>
      </div>
    </div>
  );
}
