const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface DestinationItem {
  name: string;
  rating: number | null;
  category: string;
  address: string;
  total_reviews: number | null;
  google_maps_url: string | null;
  website: string | null;
  final_score: number;
  distance_info: {
    distance_km: string;
    duration_mins: number;
    traffic_condition: string;
  } | null;
  reviews?: string[];
}

export interface RecommendationResponse {
  status: string;
  reply: string;
  raw_data: DestinationItem[];
  rute_dan_lalu_lintas: {
    jarak_meter: number;
    durasi_detik: number;
    kondisi_kemacetan: string;
    polyline: string | null;
  } | null;
}

export const fetchRecommendations = async (
  prompt: string,
  kategori: string,
  top_n: number = 3,
  userLocation: { lat: number; lng: number } = { lat: -6.9175, lng: 107.6191 },
  token?: string
): Promise<RecommendationResponse> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/api/recommendations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      kategori,
      user_location: userLocation,
      top_n,
    }),
  });

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.message);
  }

  const rute = data.rute_dan_lalu_lintas;
  const distance_info = rute ? {
    distance_km: (rute.jarak_meter / 1000).toFixed(1),
    duration_mins: Math.round(rute.durasi_detik / 60),
    traffic_condition: rute.kondisi_kemacetan,
  } : null;

  const destinasi = data.destinasi;
  const fallbackName = (destinasi?.nama_tempat || '').trim();
  const fallbackMapsUrl = fallbackName
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${fallbackName}, Jawa Barat`)}`
    : destinasi?.lokasi
      ? `https://www.google.com/maps/search/?api=1&query=${destinasi.lokasi.lat},${destinasi.lokasi.lng}`
      : null;
  const mappedDestination: DestinationItem = {
    name: destinasi?.nama_tempat || '',
    rating: destinasi?.rating || null,
    category: kategori,
    address: '',
    total_reviews: null,
    google_maps_url: fallbackMapsUrl,
    website: null,
    final_score: 0,
    distance_info,
    reviews: [],
  };

  const rawResults = Array.isArray(data.raw_data) ? data.raw_data : [];
  const mappedDestinations: DestinationItem[] = rawResults.map((item: any) => {
    const isTop = item.name?.toLowerCase() === destinasi?.nama_tempat?.toLowerCase();

    // Build a reliable Google Maps search URL using the destination name
    // Format: /maps/search/?api=1&query=Name+Jawa+Barat (always works)
    const itemName = (item.name || '').trim();
    let mapsUrl: string | null = null;
    if (itemName) {
      const searchQuery = encodeURIComponent(`${itemName}, Jawa Barat`);
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
    } else if (isTop && destinasi?.lokasi) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${destinasi.lokasi.lat},${destinasi.lokasi.lng}`;
    }

    return {
      name: item.name || '',
      rating: item.rating || null,
      category: item.category || kategori,
      address: item.address || '',
      total_reviews: item.total_reviews || null,
      google_maps_url: mapsUrl,
      website: item.website || null,
      final_score: item.final_score || 0,
      distance_info: isTop ? distance_info : null,
      reviews: item.reviews || [],
    };
  });

  if (mappedDestinations.length === 0 && destinasi?.nama_tempat) {
    mappedDestinations.push(mappedDestination);
  }

  return {
    status: data.status,
    reply: data.pesan_ai,
    raw_data: mappedDestinations,
    rute_dan_lalu_lintas: rute,
  };
};
