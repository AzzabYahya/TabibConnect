/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        med: {
          primary: '#1A6B8A',
          secondary: '#2ECC8F',
          accent: '#F4A62A',
        },
      },
      fontFamily: {
        latin: ['Inter', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'sans-serif'],
      },
      backgroundImage: {
        'medical-pattern':
          'radial-gradient(circle at 15% 25%, rgba(26, 107, 138, 0.14) 0, transparent 42%), radial-gradient(circle at 85% 15%, rgba(46, 204, 143, 0.14) 0, transparent 40%), radial-gradient(circle at 50% 95%, rgba(244, 166, 42, 0.14) 0, transparent 36%)',
      },
    },
  },
  plugins: [],
};

