import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        background: '#0A0E0C',
        foreground: '#EDEFEA',
        surface: '#101512',
        card: {
          DEFAULT: '#101512',
          foreground: '#EDEFEA',
        },
        popover: {
          DEFAULT: '#101512',
          foreground: '#EDEFEA',
        },
        border: {
          DEFAULT: '#1E2521',
          quiet: '#1E2521',
          subtle: '#27332C',
        },
        input: '#1E2521',
        ring: '#B8E85C',
        primary: {
          DEFAULT: '#B8E85C',
          foreground: '#0A0E0C',
          hover: '#A3D944',
        },
        secondary: {
          DEFAULT: '#161D19',
          foreground: '#EDEFEA',
          hover: '#1D2721',
        },
        muted: {
          DEFAULT: '#161D19',
          foreground: '#8A9289',
        },
        accent: {
          DEFAULT: '#1A221E',
          foreground: '#EDEFEA',
        },
        destructive: {
          DEFAULT: '#F0665A',
          foreground: '#0A0E0C',
        },
        success: {
          DEFAULT: '#4DD4C7',
          foreground: '#0A0E0C',
        },
        warning: {
          DEFAULT: '#F2B84B',
          foreground: '#0A0E0C',
        },
        cancelled: {
          DEFAULT: '#6B7268',
          foreground: '#EDEFEA',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      fontFamily: {
        sans: [
          'Geist',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
