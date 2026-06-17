import PopularDestinations from "@/components/PopularDestinations";

export const metadata = {
  title: "Destinasi Populer — JabarUlin AI",
  description: "Temukan destinasi wisata terpopuler di Jawa Barat, dipilih berdasarkan rating dan ulasan terbanyak.",
};

export default function DestinasiPage() {
  return (
    <div style={{ paddingTop: "5rem" }}>
      <PopularDestinations />
    </div>
  );
}
