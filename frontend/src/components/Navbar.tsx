"use client";
import { useState, useEffect } from "react";
import { MapPin, Sparkles, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Tutup mobile menu saat navigasi
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Beranda" },
    { href: "/chat", label: "AI Chat" },
    { href: "/destinasi", label: "Destinasi" },
    { href: "/tentang", label: "Tentang" },
  ];

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo" style={{ textDecoration: "none" }}>
          <div className="navbar-logo-icon">
            <MapPin size={18} />
          </div>
          <span className="navbar-logo-text">
            JabarUlin <span>AI</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="navbar-links">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={pathname === link.href ? "active" : ""}
                style={{
                  fontWeight: pathname === link.href ? 700 : 500,
                  color: pathname === link.href ? "var(--blue-600)" : undefined,
                }}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/chat" id="nav-try-ai-btn">
              <button
                className="navbar-cta"
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} /> Coba AI Sekarang
                </span>
              </button>
            </Link>
          </li>
        </ul>

        {/* Mobile Hamburger */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            color: "var(--slate-700)",
          }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="navbar-mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar-mobile-link ${pathname === link.href ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/chat" className="navbar-mobile-cta">
            <Sparkles size={14} /> Coba AI Sekarang
          </Link>
        </div>
      )}
    </nav>
  );
}
