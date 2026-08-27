/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9f6",
          100: "#d7f0e8",
          200: "#b0e1d1",
          300: "#7ecbb4",
          400: "#4bab93",
          500: "#2f8d78",
          600: "#237261",
          700: "#1f5c4f",
          800: "#1c4a41",
          900: "#193e37",
        },
      },
    },
  },
  plugins: [],
};
