/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Light Mode
        light: {
          primary: '#FFFFFF',
          secondary: '#F5F5F5',
          tertiary: '#E5E5E5',
        },
        // Dark Mode
        dark: {
          primary: '#121212',
          secondary: '#1E1E1E',
          tertiary: '#2A2A2A',
        },
        // Text Colors
        text: {
          primary: {
            light: '#121212',
            dark: '#FFFFFF',
          },
          secondary: {
            light: '#525252',
            dark: '#E5E5E5',
          },
          tertiary: {
            light: '#A3A3A3',
            dark: '#A3A3A3',
          },
        },
        // Accent Colors
        accent: {
          green: '#1BAD66',
          gold: '#FFC107',
          coral: '#FF6B6B',
        },
        // System Colors
        error: '#D32F2F',
        warning: '#EF4444',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        mono: ['IBMPlexMono', 'monospace'],
      },
    },
  },
  plugins: [],
}
