/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind web requires class-based dark mode; `media` throws when
  // colorScheme is synced (css-interop). App stays light via app.json
  // userInterfaceStyle — full dark theme can layer on `.dark` later.
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        medium: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
      },
      colors: {
        app: {
          background: '#F8FAFC',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          text: '#0F172A',
          muted: '#475569',
          faint: '#94A3B8',
          primary: '#1B6CA8',
          success: '#059669',
          warning: '#D97706',
          danger: '#EF4444',
        },
        navy: {
          DEFAULT: '#0B1F3A',
          50: '#E8EEF5',
          100: '#C5D3E4',
          200: '#8FA7C4',
          300: '#5A7BA3',
          400: '#2E547F',
          500: '#0B1F3A',
          600: '#091830',
          700: '#071226',
          800: '#050C1A',
          900: '#030610',
        },
        blue: {
          DEFAULT: '#1B6CA8',
          50: '#E8F3FA',
          100: '#C5E0F2',
          200: '#8FC2E4',
          300: '#58A3D5',
          400: '#2E88C4',
          500: '#1B6CA8',
          600: '#165789',
          700: '#11426A',
          800: '#0C2D4A',
          900: '#07182B',
        },
        teal: {
          DEFAULT: '#0D9488',
          50: '#E6F7F5',
          100: '#BFEBE6',
          200: '#80D7CD',
          300: '#40C3B4',
          400: '#1AAD9D',
          500: '#0D9488',
          600: '#0A766D',
          700: '#085852',
          800: '#053B37',
          900: '#031D1B',
        },
      },
    },
  },
  plugins: [],
};
