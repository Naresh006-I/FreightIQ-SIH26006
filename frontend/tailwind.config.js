/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sail: {
          navy:      '#003087',
          'navy-dark': '#001f5a',
          'navy-light': '#004aad',
          gold:      '#C8A84B',
          'gold-light': '#e0c06a',
          red:       '#C0392B',
          offwhite:  '#f4f6fb',
          gray:      '#e8ecf4',
          muted:     '#6b7a9e',
          text:      '#1a2340',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Rajdhani', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
