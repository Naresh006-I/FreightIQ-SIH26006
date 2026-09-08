/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:  { 900: '#0a1628', 800: '#0d1f3c', 700: '#1a2f52', 600: '#243b66' },
        ocean: { 500: '#0ea5e9', 400: '#38bdf8' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
