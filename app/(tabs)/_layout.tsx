import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import {
  HouseIcon,
  ChatTeardropDotsIcon,
  CameraIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserIcon,
} from 'phosphor-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Elevation } from '../../src/constants/colors';
import { FontFamily } from '../../src/constants/fonts';

export default function TabsLayout() {
  const { colors, accent } = useTheme();
  const { profile } = useAuth();
  const isPremium = profile?.is_premium || false;

  // Stitch tab bar: floating pill geometry (kept from v2 — docked mockup
  // variant rejected, it ripples into every screen's bottom padding), solid
  // white, borderless, ambient shadow. Active = deep-green duotone.
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          height: 70,
          borderRadius: 28,
          backgroundColor: colors.surface.secondary,
          borderTopWidth: 0,
          ...Elevation.ambient,
          paddingBottom: 0,
        },
        tabBarActiveTintColor: Colors.accentDeep,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontFamily: FontFamily.geistMedium,
          fontSize: 11,
          marginTop: -4,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HouseIcon size={26} color={color} weight={focused ? 'duotone' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ustad',
          tabBarIcon: ({ color, focused }) => (
            <ChatTeardropDotsIcon size={26} color={color} weight={focused ? 'duotone' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: () => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: accent,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -20,
                shadowColor: accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <CameraIcon size={28} color={Colors.onAccent} weight="fill" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: isPremium ? 'Suggestions' : 'Search',
          tabBarIcon: ({ color, focused }) =>
            isPremium ? (
              <MapPinIcon size={26} color={color} weight={focused ? 'duotone' : 'regular'} />
            ) : (
              <MagnifyingGlassIcon size={26} color={color} weight={focused ? 'duotone' : 'regular'} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <UserIcon size={26} color={color} weight={focused ? 'duotone' : 'regular'} />
          ),
        }}
      />
      {/* Hidden screens - accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="water"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="calendar-log"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="create-meal"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
