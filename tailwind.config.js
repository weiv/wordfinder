/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        wordle: {
          green: '#6aaa64',
          yellow: '#c9b458',
          gray: '#787c7e',
          dark: '#121213',
          tile: '#ffffff',
          border: '#d3d6da',
        },
      },
    },
  },
  plugins: [],
}
