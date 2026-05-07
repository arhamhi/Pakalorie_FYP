import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabsLayout() {
  const { colors, accent, theme } = useTheme();
  const { profile } = useAuth();
  const isPremium = profile?.is_premium || false;

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
          borderRadius: 24,
          backgroundColor: theme === 'dark' ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          borderWidth: theme === 'light' ? 1 : 0,
          borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
          elevation: theme === 'light' ? 8 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: theme === 'light' ? 4 : 10 },
          shadowOpacity: theme === 'light' ? 0.12 : 0.25,
          shadowRadius: theme === 'light' ? 12 : 20,
          paddingBottom: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={theme === 'dark' ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          />
        ),
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_500Medium',
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
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ustad',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
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
              <MaterialIcons name="photo-camera" size={28} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: isPremium ? 'Suggestions' : 'Search',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name={isPremium ? 'location-on' : 'search'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={26} color={color} />
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
