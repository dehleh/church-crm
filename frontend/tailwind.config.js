function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: withOpacity('--brand-600-rgb'),
          50:  withOpacity('--brand-50-rgb'),
          100: withOpacity('--brand-100-rgb'),
          200: withOpacity('--brand-200-rgb'),
          300: withOpacity('--brand-300-rgb'),
          400: withOpacity('--brand-400-rgb'),
          500: withOpacity('--brand-500-rgb'),
          600: withOpacity('--brand-600-rgb'),
          700: withOpacity('--brand-700-rgb'),
          800: withOpacity('--brand-800-rgb'),
          900: withOpacity('--brand-900-rgb'),
          950: withOpacity('--brand-950-rgb'),
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,.04), 0 4px 16px 0 rgba(0,0,0,.06)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,.05), 0 12px 32px 0 rgba(0,0,0,.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: 0, transform: 'translateX(-16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      }
    },
  },
  plugins: [],
};
