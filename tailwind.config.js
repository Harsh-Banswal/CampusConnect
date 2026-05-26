/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#111111',
          card: '#1a1a1a',
          surface: '#222222',
          border: '#333333',
        },
        accent: {
          DEFAULT: '#c4b5fd', // Light purple
          purple: '#a78bfa',
          green: '#4ade80',
          greenHover: '#22c55e',
          muted: '#2e1065', // Dark purple bg
          mutedGreen: '#064e3b', // Dark green bg
        },
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [],
}
