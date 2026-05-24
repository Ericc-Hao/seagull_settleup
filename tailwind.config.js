/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  content: ['./App.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF1FF',
          100: '#D2DAFF',
          200: '#AAC4FF',
          300: '#B1B2FF',
          400: '#9BA0FF',
          500: '#7B82F5',
          600: '#5C64E8',
          navy: '#1E2A5A',
          muted: '#6B7AAB',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
