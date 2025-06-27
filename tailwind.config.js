/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4da6ff',
          main: '#0078d4',
          dark: '#004c8c',
        },
        secondary: {
          light: '#ffa06d',
          main: '#ff6e40',
          dark: '#c53d13',
        }
      },
    },
  },
  plugins: [],
}