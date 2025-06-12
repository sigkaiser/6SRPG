/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       // You can add custom theme extensions here later if needed
       fontFamily: {
         // Example: Match the old frontend's font if desired
         // 'adventure': ['Trebuchet MS', 'fantasy'],
       },
       colors: {
         // Example: Define custom gold color
         // 'custom-gold': 'gold',
       }
    },
  },
  plugins: [],
}
