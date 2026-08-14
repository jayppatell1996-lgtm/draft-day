/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#090b10',
          900: '#0f1219',
          800: '#161b26',
          700: '#1e2533',
        },
        accent: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        navy: {
          50: '#f3f6fa',
          100: '#e0e6ef',
          200: '#b3c0d6',
          300: '#7a98b8',
          400: '#4a6b93',
          500: '#25406a',
          600: '#14213d',
          700: '#101a30',
          800: '#0c1322',
          900: '#080d15',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(16, 185, 129, 0.08)',
      },
    },
  },
  plugins: [],
};
