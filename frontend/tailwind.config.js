/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fcf7f8',
          100: '#f7eef0',
          200: '#eedce0',
          300: '#e0bcc4',
          400: '#cd95a2',
          500: '#b86e80',
          600: '#a35264',
          700: '#8a1c32',
          800: '#721628',
          900: '#5a1414',
          950: '#3a0909',
        },
        navy: '#5a1414',
        wine: '#8a1c32',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      }
    },
  },
  plugins: [],
}
