const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface DestinationItem {
  nama_tempat: string;
  rating: number | null;
  lokasi: {
    lat: number;
    lng: number;
  };
  photos: string[];
}

export interface RuteDanLaluLintas {
  jarak_meter: number;
  durasi_detik: number;
  kondisi_kemacetan: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';
  polyline: string | null;
}

export interface RecommendationResponse {
  status: string;
  pesan_ai: string;
  destinasi: DestinationItem;
  rute_dan_lalu_lintas: RuteDanLaluLintas | null;
}

export const fetchRecommendations = async (
  prompt: string,
  kategori: string,
  userLocation: { lat: number; lng: number },
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
    }),
  });

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data;
};
