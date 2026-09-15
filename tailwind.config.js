/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            50: '#F0F4F9',
            100: '#E1E9F4',
            200: '#C2D3E9',
            300: '#94B4DB',
            400: '#5F8DC8',
            500: '#3869B3',
            600: '#234F94',
            700: '#1B3B6F',
            800: '#0F2447',
            900: '#0A192F',
            950: '#071224',
          },
          orange: {
            50: '#FFF7ED',
            100: '#FFEDD5',
            200: '#FED7AA',
            300: '#FDBA74',
            400: '#FB923C',
            500: '#F97316',
            600: '#EA580C',
            700: '#C2410C',
            800: '#9A3412',
            900: '#7C2D12',
          },
          whatsapp: {
            light: '#25D366',
            DEFAULT: '#25D366',
            dark: '#128C7E',
            deep: '#075E54',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
        arabic: [
          'Tajawal',
          'Cairo',
          'Segoe UI',
          'Tahoma',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(10, 25, 47, 0.08)',
        'card-hover': '0 10px 25px -3px rgba(10, 25, 47, 0.12)',
        'orange-glow': '0 4px 14px 0 rgba(249, 115, 22, 0.39)',
        'whatsapp-glow': '0 4px 14px 0 rgba(37, 211, 102, 0.35)',
      },
    },
  },
  plugins: [],
};
