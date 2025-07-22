/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'panel': "url('assets/panel.png')",
      },
      fontFamily: {
        'crimson-pro': ['"Crimson Pro"', 'serif'],
      },
    },
  },
  plugins: [],
}
