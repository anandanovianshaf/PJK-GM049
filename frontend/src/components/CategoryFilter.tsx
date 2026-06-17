"use client";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { name: "Wisata Alam", categoryName: "Wisata Alam", emoji: "🏔️" },
  { name: "Pantai", categoryName: "Pantai", emoji: "🏖️" },
  { name: "Camping", categoryName: "Camping", emoji: "🏕️" },
  { name: "Keluarga", categoryName: "Keluarga", emoji: "👨‍👩‍👧" },
  { name: "Adventure", categoryName: "Adventure", emoji: "🚵" },
  { name: "Fotografi", categoryName: "Fotografi", emoji: "📸" },
  { name: "Healing", categoryName: "Healing", emoji: "💆" },
  { name: "Lainnya", categoryName: "Lainnya", emoji: "🏨" },
];

export default function CategoryFilter() {
  const router = useRouter();

  const handleClick = (categoryName: string) => {
    router.push(`/chat?cat=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section id="categories" className="category-section">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">🏷️ Kategori</div>
          <h2 className="section-title">
            Jelajahi Berdasarkan <span className="gradient-text">Minatmu</span>
          </h2>
          <p className="section-subtitle">
            Pilih kategori wisata favoritmu dan AI akan langsung merekomendasikan destinasi terbaik
          </p>
        </div>

        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="category-card"
              id={`cat-${cat.name.replace(/\s/g, "-")}`}
              onClick={() => handleClick(cat.categoryName)}
            >
              <div className="category-emoji">{cat.emoji}</div>
              <div className="category-name">{cat.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
