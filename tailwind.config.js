/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Peptide Lifestyle Program — Navy / Gold / Cream luxury palette
        'theme-bg': '#FFFFFF',
        'theme-text': '#0F2447',

        // Primary Palette — Navy (repurposed `brand` for backwards compatibility)
        'brand': {
          DEFAULT: '#0F2447',
          50: '#F4F6FA',
          100: '#E6EBF3',
          200: '#C2CEE0',
          300: '#8FA3C0',
          400: '#5C779E',
          500: '#324E7B',
          600: '#1F365E',
          700: '#152A4D',
          800: '#0F2447',
          900: '#0A1A35',
        },

        'navy': {
          DEFAULT: '#0F2447',
          50: '#F4F6FA',
          100: '#E6EBF3',
          200: '#C2CEE0',
          300: '#8FA3C0',
          400: '#5C779E',
          500: '#324E7B',
          600: '#1F365E',
          700: '#152A4D',
          800: '#0F2447',
          900: '#0A1A35',
        },

        // Secondary & Neutral — Slate-ish
        'charcoal': {
          DEFAULT: '#0F2447',
          50: '#F7F8FA',
          100: '#EEF1F5',
          200: '#DDE2EB',
          300: '#B8C1D0',
          400: '#8A95A8',
          500: '#6B7785',
          600: '#4B5563',
          700: '#2D3748',
          800: '#1A2B4C',
          900: '#0F2447',
        },

        // Backgrounds & Accents
        'cream': '#F5F1EA',
        'cream-light': '#FAF6EF',
        'cream-dark': '#EDE6D8',
        'blush-light': '#FAF6EF',
        'warm-white': '#FAF6EF',

        // Gold
        'gold': {
          DEFAULT: '#C9A876',
          50: '#FBF7F0',
          100: '#F5ECD9',
          200: '#EAD8B3',
          300: '#DDC18A',
          400: '#D1B07A',
          500: '#C9A876',
          600: '#B08F5B',
          700: '#8C7142',
          800: '#6B5632',
          900: '#4D3E24',
        },
        'ribbon': '#C9A876',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['"Playfair Display"', 'serif'],
        serif: ['"Playfair Display"', 'serif'],
        cute: ['Inter', 'sans-serif'],
      },
      letterSpacing: {
        'luxe': '0.35em',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(15, 36, 71, 0.04)',
        'DEFAULT': '0 1px 3px 0 rgba(15, 36, 71, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'md': '0 4px 6px -1px rgba(15, 36, 71, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'lg': '0 10px 15px -3px rgba(15, 36, 71, 0.10), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'soft': '0 4px 20px rgba(15, 36, 71, 0.08), 0 2px 8px rgba(201, 168, 118, 0.06)',
        'luxury': '0 8px 30px rgba(15, 36, 71, 0.12), 0 4px 10px rgba(201, 168, 118, 0.08)',
        'glow': '0 0 24px rgba(201, 168, 118, 0.25)',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px',
      },
      animation: {
        'fadeIn': 'fadeIn 0.6s ease-out',
        'slideUp': 'slideUp 0.5s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'ribbon-sway': 'ribbonSway 3s ease-in-out infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        ribbonSway: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
}
