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
        },
      },
    },
  },
  plugins: [],
}
