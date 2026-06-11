/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petroleum: {
          DEFAULT: '#091C28',
          light: '#172F3F',
        },
        verde: {
          DEFAULT: '#BCFF48',
          light: '#DAFF94',
        },
        laranja: {
          DEFAULT: '#FF8F1F',
          light: '#FFB261',
        },
        oceano: {
          DEFAULT: '#2ED7ED',
          light: '#4DE0F4',
        },
        cinza: {
          DEFAULT: '#C4C4C4',
          light: '#D6D6D6',
        },
      },
    },
  },
  plugins: [],
}
