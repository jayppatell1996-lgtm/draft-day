/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f3f6fa',
          100: '#e0e6ef',
          200: '#b3c0d6',
          300: '#7a98b8',
          400: '#4a6b93',
          500: '#25406a',
          600: '#14213d', // Main navy color
          700: '#101a30',
          800: '#0c1322',
          900: '#080d15',
        },
        burgundy: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d9',
          300: '#f4a7b7',
          400: '#ed758e',
          500: '#e54768',
          600: '#d22a4f',
          700: '#b01d41',
          800: '#931b3c',
          900: '#7c1a37',
          950: '#440a1a',
        },
      },
      spacing: {
        '150': '34.5rem',
        '160': '30rem' // or whatever you want
      }
    },
  },
  plugins: [],
}
