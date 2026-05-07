import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { Card, Button } from '../src/components/ui';
import {
  Restaurant,
  getCurrentLocation,
  searchNearbyRestaurants,
  searchHealthyRestaurants,
  formatDistance,
  getPriceLevel,
  LocationCoords,
} from '../src/lib/places';

type FilterType = 'all' | 'healthy' | 'nearby' | 'topRated';

const FILTERS: { value: FilterType; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'restaurant' },
  { value: 'healthy', label: 'Healthy', icon: 'eco' },
  { value: 'nearby', label: 'Nearby', icon: 'near-me' },
  { value: 'topRated', label: 'Top Rated', icon: 'star' },
];

export default function DiscoverScreen() {
  const { colors, accent } = useTheme();
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const coords = await getCurrentLocation();
      if (!coords) {
        setError('Location permission required to find nearby restaurants');
        setIsLoading(false);
        return;
      }

      setLocation(coords);
      const results = await searchNearbyRestaurants(coords, 5000);
      setRestaurants(results);
    } catch (err) {
      setError('Failed to load restaurants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHealthyRestaurants = async () => {
    if (!location) return;
    setIsLoading(true);
    try {
      const results = await searchHealthyRestaurants(location);
      setRestaurants(results);
    } catch (err) {
      setError('Failed to load healthy restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (newFilter: FilterType) => {
    setFilter(newFilter);

    if (!location) return;

    setIsLoading(true);
    try {
      let results: Restaurant[];

      switch (newFilter) {
        case 'healthy':
          results = await searchHealthyRestaurants(location);
          break;
        case 'nearby':
          results = await searchNearbyRestaurants(location, 2000);
          results = results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
          break;
        case 'topRated':
          results = await searchNearbyRestaurants(location, 5000);
          results = results
            .filter(r => typeof r.rating === 'number' && r.rating >= 4)
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
          break;
        default:
          results = await searchNearbyRestaurants(location, 5000);
      }

      setRestaurants(results);
    } catch (err) {
      setError('Failed to apply filter');
    } finally {
      setIsLoading(false);
    }
  };

  const openInMaps = async (restaurant: Restaurant) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${restaurant.location.lat},${restaurant.location.lng}&query_place_id=${restaurant.id}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
        Alert.alert(
          'Cannot Open Maps',
          'Unable to open the maps application. Please make sure you have a maps app installed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening maps URL:', error);
      Alert.alert(
        'Error',
        'An error occurred while trying to open the maps application.',
        [{ text: 'OK' }]
      );
    }
  };

  if (error && !restaurants.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.primary, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <MaterialIcons name="location-off" size={64} color={colors.text.tertiary} />
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_600SemiBold',
            fontSize: 18,
            color: colors.text.primary,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
        <Button title="Try Again" onPress={loadRestaurants} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.primary }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadRestaurants} tintColor={accent} />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 24,
              color: colors.text.primary,
              marginLeft: 16,
            }}
          >
            Discover
          </Text>
        </View>

        {/* Subtitle */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_400Regular',
            fontSize: 14,
            color: colors.text.secondary,
            marginBottom: 20,
          }}
        >
          Find healthy eating options near you
        </Text>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => handleFilterChange(f.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: filter === f.value ? accent + '20' : colors.surface.secondary,
                borderWidth: 1,
                borderColor: filter === f.value ? accent : 'transparent',
              }}
            >
              <MaterialIcons
                name={f.icon as any}
                size={18}
                color={filter === f.value ? accent : colors.text.secondary}
              />
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans_500Medium',
                  fontSize: 14,
                  color: filter === f.value ? accent : colors.text.primary,
                  marginLeft: 6,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Loading State */}
        {isLoading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={accent} />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.tertiary,
                marginTop: 12,
              }}
            >
              Finding restaurants...
            </Text>
          </View>
        )}

        {/* Restaurant List */}
        {!isLoading && restaurants.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <MaterialIcons name="search-off" size={48} color={colors.text.tertiary} />
            <Text
              style={{
                fontFamily: 'PlusJakartaSans_400Regular',
                fontSize: 14,
                color: colors.text.tertiary,
                marginTop: 12,
              }}
            >
              No restaurants found nearby
            </Text>
          </View>
        )}

        {!isLoading &&
          restaurants.map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              onPress={() => openInMaps(restaurant)}
              activeOpacity={0.8}
            >
              <Card style={{ marginBottom: 12 }}>
                {restaurant.photoUrl && (
                  <Image
                    source={{ uri: restaurant.photoUrl }}
                    style={{
                      width: '100%',
                      height: 140,
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                    resizeMode="cover"
                  />
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_600SemiBold',
                        fontSize: 16,
                        color: colors.text.primary,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {restaurant.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_400Regular',
                        fontSize: 13,
                        color: colors.text.tertiary,
                        marginBottom: 8,
                      }}
                      numberOfLines={1}
                    >
                      {restaurant.address}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    {restaurant.isOpen !== undefined && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 4,
                          backgroundColor: restaurant.isOpen ? '#1BAD6620' : '#FF6B6B20',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'PlusJakartaSans_500Medium',
                            fontSize: 11,
                            color: restaurant.isOpen ? '#1BAD66' : '#FF6B6B',
                          }}
                        >
                          {restaurant.isOpen ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  {/* Rating */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="star" size={16} color="#FFC107" />
                    <Text
                      style={{
                        fontFamily: 'IBMPlexMono_600SemiBold',
                        fontSize: 14,
                        color: colors.text.primary,
                        marginLeft: 4,
                      }}
                    >
                      {restaurant.rating.toFixed(1)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_400Regular',
                        fontSize: 12,
                        color: colors.text.tertiary,
                        marginLeft: 4,
                      }}
                    >
                      ({restaurant.userRatingsTotal})
                    </Text>
                  </View>

                  {/* Distance */}
                  {restaurant.distance && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="place" size={16} color={colors.text.tertiary} />
                      <Text
                        style={{
                          fontFamily: 'PlusJakartaSans_400Regular',
                          fontSize: 13,
                          color: colors.text.secondary,
                          marginLeft: 4,
                        }}
                      >
                        {formatDistance(restaurant.distance)}
                      </Text>
                    </View>
                  )}

                  {/* Price Level */}
                  {restaurant.priceLevel && (
                    <Text
                      style={{
                        fontFamily: 'PlusJakartaSans_500Medium',
                        fontSize: 13,
                        color: accent,
                      }}
                    >
                      {getPriceLevel(restaurant.priceLevel)}
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}
