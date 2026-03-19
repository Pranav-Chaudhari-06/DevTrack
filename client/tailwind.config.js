/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0d1530',
          hover: '#111a3a',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(99, 102, 241, 0.35)',
        'glow-sm': '0 0 12px rgba(99, 102, 241, 0.25)',
      },
    },
  },
  plugins: [],
};
