"use client";
import { MapPin, Star, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";

const POPULAR_DESTINATIONS = [
  {
    image: "/kawah putih.jpg",
    name: "Kawah Putih",
    category: "Alam & Gunung",
    address: "Ciwidey, Kab. Bandung, Jawa Barat",
    rating: 4.7,
    reviews: 23841,
    badge: "Populer",
    maps: "https://maps.google.com/?q=Kawah+Putih+Bandung",
  },
  {
    image: "/pantai pangandaran.jpg",
    name: "Pantai Pangandaran",
    category: "Pantai & Laut",
    address: "Pangandaran, Jawa Barat",
    rating: 4.6,
    reviews: 18203,
    badge: "Rekomendasi",
    maps: "https://maps.google.com/?q=Pantai+Pangandaran",
  },
  {
    image: "/gunung papandayan.jpg",
    name: "Gunung Papandayan",
    category: "Pendakian",
    address: "Garut, Jawa Barat",
    rating: 4.8,
    reviews: 12560,
    badge: "Trending",
    maps: "https://maps.google.com/?q=Gunung+Papandayan+Garut",
  },
  {
    image: "/kebun teh ciwidey.jpg",
    name: "Kebun Teh Ciwidey",
    category: "Agrowisata",
    address: "Ciwidey, Kab. Bandung",
    rating: 4.5,
    reviews: 9870,
    badge: "Instagramable",
    maps: "https://maps.google.com/?q=Kebun+Teh+Ciwidey",
  },
  {
    image: "/situ patenggang.jpg",
    name: "Situ Patenggang",
    category: "Danau & Alam",
    address: "Rancabali, Kab. Bandung",
    rating: 4.6,
    reviews: 15431,
    badge: "Romantis",
    maps: "https://maps.google.com/?q=Situ+Patenggang+Bandung",
  },
  {
    image: "/curug cimahi.jpg",
    name: "Curug Cimahi",
    category: "Air Terjun",
    address: "Cisarua, Kab. Bandung Barat",
    rating: 4.4,
    reviews: 7203,
    badge: "Hidden Gem",
    maps: "https://maps.google.com/?q=Curug+Cimahi",
  },
];

export default function PopularDestinations() {
  const router = useRouter();

  const handleDestinationClick = (name: string) => {
    const query = `Ceritakan tentang ${name} dan rekomendasikan tempat serupa di Jawa Barat`;
    router.push(`/chat?q=${encodeURIComponent(query)}`);
  };

  return (
    <section id="destinations" className="destinations-section">
      <div className="section-header">
        <h2 className="section-title">
          Wisata <span className="gradient-text">Terfavorit</span> di Jawa Barat
        </h2>
        <p className="section-subtitle">
          Dipilih berdasarkan rating tertinggi dan ulasan terbanyak dari wisatawan nyata
        </p>
      </div>

      <div className="destinations-grid">
        {POPULAR_DESTINATIONS.map((dest) => (
          <div
            key={dest.name}
            className="dest-card"
            id={`dest-card-${dest.name.replace(/\s/g, "-")}`}
            onClick={() => handleDestinationClick(dest.name)}
          >
            {/* Image */}
            <div
              className="dest-card-img"
              style={{ backgroundImage: `url("${encodeURI(dest.image)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="dest-card-img-overlay" />
              <span className="dest-card-badge">{dest.badge}</span>
            </div>

            {/* Body */}
            <div className="dest-card-body">
              <span className="dest-card-category">{dest.category}</span>
              <h3 className="dest-card-name">{dest.name}</h3>
              <div className="dest-card-address">
                <MapPin size={12} style={{ color: "var(--blue-400)", flexShrink: 0, marginTop: 2 }} />
                {dest.address}
              </div>
              <div className="dest-card-footer">
                <div className="dest-card-rating">
                  <Star size={14} fill="var(--amber-400)" color="var(--amber-400)" />
                  {dest.rating.toFixed(1)}
                  <span className="dest-card-reviews">
                    ({dest.reviews.toLocaleString("id-ID")})
                  </span>
                </div>
                <a
                  href={dest.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dest-card-maps"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Navigation size={13} /> Navigasi
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
