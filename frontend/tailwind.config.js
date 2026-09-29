/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        panel: '#111827',
        accent: '#4f46e5',
        accentSoft: '#8b5cf6',
        mint: '#34d399',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.16), 0 25px 80px rgba(79,70,229,0.25)',
      },
    },
  },
  plugins: [],
};
