/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {
    colors: { paper: '#f4f1e9', cream: '#eae4d8', ink: '#28251f', espresso: '#3b3028', sage: '#a8b29e', sky: '#c5d7dc', gold: '#b49b70', muted: '#77736b' },
    fontFamily: { sans: ['DM Sans', 'sans-serif'], serif: ['Playfair Display', 'serif'] },
    boxShadow: { soft: '0 18px 60px rgba(48,40,31,.08)', float: '0 26px 80px rgba(48,40,31,.16)' }
  } },
  plugins: []
};
