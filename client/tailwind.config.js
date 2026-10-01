/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '420px',    // Compact / Standard Smartphones (iPhone SE, Galaxy S)
      'sm': '640px',    // Large Smartphones / Phablets
      'md': '768px',    // Mini & Standard Tablets (iPad Mini / 10.2")
      'lg': '1024px',   // Large Tablets / Landscape / Small Laptops (iPad Pro, 13" Mac)
      'xl': '1280px',   // Standard Desktop / Laptops
      '2xl': '1536px',  // Large Monitors & Faculty Wallboards
      '3xl': '1920px',  // Full HD / Ultra-wide Kiosk Displays
    },
    extend: {
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      colors: {
        fsktm: {
          navy: '#0b132b',
          deep: '#1c2541',
          primary: '#1d4ed8',
          accent: '#3a86ff',
          gold: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
          slate: '#334155',
          light: '#f8fafc'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
