"use client";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const pathname = usePathname();
  
  if (pathname === "/chat") {
    return null;
  }

  return (
    <footer className="footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div className="footer-brand-logo">
            <div className="footer-logo-icon">
              <MapPin size={16} color="white" />
            </div>
            <span className="footer-logo-text">JabarUlin AI</span>
          </div>
          <p className="footer-desc">
            Platform wisata cerdas berbasis Artificial Intelligence untuk membantu wisatawan
            menemukan destinasi terbaik di Jawa Barat.
          </p>
          <div className="footer-tech-badges">
            <span className="footer-badge">IndoBERT</span>
            <span className="footer-badge">Gemini 2.5</span>
            <span className="footer-badge">FastAPI</span>
            <span className="footer-badge">Next.js</span>
            <span className="footer-badge">TF-IDF</span>
          </div>
        </div>

        {/* Navigasi */}
        <div>
          <h4 className="footer-col-title">Navigasi</h4>
          <ul className="footer-links">
            <li><Link href="/">Beranda</Link></li>
            <li><Link href="/chat">AI Chat</Link></li>
            <li><Link href="/destinasi">Destinasi Populer</Link></li>
            <li><Link href="/chat">Kategori Wisata</Link></li>
            <li><Link href="/tentang">Fitur Unggulan</Link></li>
          </ul>
        </div>

        {/* Destinasi */}
        <div>
          <h4 className="footer-col-title">Destinasi</h4>
          <ul className="footer-links">
            <li><Link href="/chat?q=wisata+bandung">Bandung &amp; Sekitarnya</Link></li>
            <li><Link href="/chat?q=pantai+selatan+jawa+barat">Pantai Selatan Jabar</Link></li>
            <li><Link href="/chat?q=wisata+garut+cianjur">Garut &amp; Cianjur</Link></li>
            <li><Link href="/chat?q=wisata+bogor+puncak">Bogor &amp; Puncak</Link></li>
            <li><Link href="/chat?q=wisata+cirebon">Cirebon &amp; Pesisir</Link></li>
          </ul>
        </div>

        {/* Tentang */}
        <div>
          <h4 className="footer-col-title">Tentang</h4>
          <ul className="footer-links">
            <li><Link href="/tentang">Tentang JabarUlin</Link></li>
            <li><Link href="/tentang">Teknologi AI</Link></li>
            <li><a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer">API Documentation</a></li>
            <li><Link href="/tentang">Kebijakan Privasi</Link></li>
            <li><Link href="/tentang">Hubungi Kami</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>
          © 2026 JabarUlin AI. Dibuat untuk wisatawan Jawa Barat.
        </p>
      </div>
    </footer>
  );
}
