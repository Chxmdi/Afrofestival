/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep charcoal & ink — primary neutral (60%)
        ink: {
          950: '#0d0e10',
          900: '#141518',
          800: '#1c1e22',
          700: '#26282e',
          600: '#33363d',
          500: '#484c55',
          400: '#6b7079',
          300: '#9aa0a9',
          200: '#c6cbd2',
          100: '#e6e9ed',
        },
        // Warm cream — light surface
        cream: {
          50: '#fbf8f1',
          100: '#f6f0e4',
          200: '#ece2cd',
          300: '#dfd0ae',
        },
        // Rich green — secondary brand
        forest: {
          900: '#0f2a1e',
          800: '#123726',
          700: '#164a31',
          600: '#1c6440',
          500: '#227d4f',
          400: '#3a9a68',
          300: '#6bbb90',
        },
        // Burnt orange — energetic accent
        ember: {
          700: '#8a3410',
          600: '#b1481a',
          500: '#d75f24',
          400: '#e87c3f',
          300: '#f0a173',
        },
        // Burgundy — depth accent
        wine: {
          800: '#4a1220',
          700: '#651a2c',
          600: '#84213a',
          500: '#a02c4a',
          400: '#bd4f6b',
        },
        // Restrained gold accent
        gold: {
          600: '#a8801f',
          500: '#c99a2c',
          400: '#e0b64d',
          300: '#eccd84',
        },
      },
      fontFamily: {
        display: ['"Clash Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Major third (1.25) scale
        '2xs': ['0.694rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.833rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.25rem', { lineHeight: '1.6rem', letterSpacing: '-0.01em' }],
        xl: ['1.563rem', { lineHeight: '1.85rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.953rem', { lineHeight: '2.2rem', letterSpacing: '-0.02em' }],
        '3xl': ['2.441rem', { lineHeight: '2.6rem', letterSpacing: '-0.02em' }],
        '4xl': ['3.052rem', { lineHeight: '3.1rem', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,14,16,0.04), 0 8px 24px -12px rgba(13,14,16,0.18)',
        pop: '0 12px 40px -12px rgba(13,14,16,0.35)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.14s ease-out',
      },
    },
  },
  plugins: [],
};
