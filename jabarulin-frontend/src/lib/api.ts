const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface DestinationItem {
  nama_tempat: string;
  rating: number | null;
  lokasi: { lat: number; lng: number };
  photos: string[];
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
    }),
  });

  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.message);
  }

  // Map field backend → field yang diexpect ChatBot.tsx
  return {
    status: data.status,
    reply: data.pesan_ai,
    raw_data: data.destinasi ? [data.destinasi] : [],
    rute_dan_lalu_lintas: data.rute_dan_lalu_lintas,
  };
};
