export interface DestinationItem {
  name: string;
  rating: number | null;
  category: string;
  address: string | null;
  distance_info: {
    distance_km: number;
    duration_mins: number;
    traffic_condition: string;
  } | null;
  total_reviews: number | null;
  google_maps_url: string | null;
  website: string | null;
  final_score: number;
}

interface RecommendationResponse {
  reply: string;
  raw_data: DestinationItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function fetchRecommendations(
  query: string,
  category: string,
  limit: number = 5
): Promise<RecommendationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, category, limit }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
