import * as Location from 'expo-location';

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number;
  distance?: number;
  isOpen?: boolean;
  photoUrl?: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

// Health-focused restaurant keywords for Pakistan
const HEALTHY_KEYWORDS = [
  'salad',
  'grilled',
  'healthy',
  'organic',
  'fitness',
  'diet',
  'protein',
  'gym',
  'juice',
  'smoothie',
];

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<LocationCoords | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

export async function searchNearbyRestaurants(
  location: LocationCoords,
  radius: number = 3000,
  keyword?: string
): Promise<Restaurant[]> {
  try {
    const searchKeyword = keyword || 'restaurant';
    const url = `${PLACES_API_URL}/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=${radius}&type=restaurant&keyword=${searchKeyword}&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', data.status);
      return [];
    }

    const restaurants: Restaurant[] = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      priceLevel: place.price_level,
      isOpen: place.opening_hours?.open_now,
      photoUrl: place.photos?.[0]
        ? `${PLACES_API_URL}/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        : undefined,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      types: place.types || [],
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      ),
    }));

    // Sort by distance
    return restaurants.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return [];
  }
}

export async function searchHealthyRestaurants(
  location: LocationCoords,
  radius: number = 5000
): Promise<Restaurant[]> {
  try {
    // Search for healthy food options
    const healthyKeywords = ['healthy food', 'salad', 'grilled chicken', 'fitness cafe'];
    const allResults: Restaurant[] = [];

    // Fetch results for multiple healthy keywords
    const results = await Promise.all(
      healthyKeywords.slice(0, 2).map(keyword =>
        searchNearbyRestaurants(location, radius, keyword)
      )
    );

    // Combine and deduplicate results
    const seenIds = new Set<string>();
    for (const restaurants of results) {
      for (const restaurant of restaurants) {
        if (!seenIds.has(restaurant.id)) {
          seenIds.add(restaurant.id);
          allResults.push(restaurant);
        }
      }
    }

    // Sort by rating and distance
    return allResults.sort((a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.5) return ratingDiff;
      return (a.distance || 0) - (b.distance || 0);
    });
  } catch (error) {
    console.error('Error searching healthy restaurants:', error);
    return [];
  }
}

// Calculate distance between two coordinates in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Get price level display
export function getPriceLevel(level?: number): string {
  if (!level) return '';
  return '$'.repeat(level);
}
