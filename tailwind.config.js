/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F0F11', // Very dark charcoal
        surface: '#18181B', // Slightly lighter panel bg
        'surface-highlight': '#232326', // Hover state
        primary: '#F75821', // Framework Orange
        'primary-dim': 'rgba(247, 88, 33, 0.2)',
        'primary-glow': 'rgba(247, 88, 33, 0.6)',
        text: {
          primary: '#EDEDED',
          secondary: '#A1A1AA',
          muted: '#52525B',
        },
        border: '#27272A',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(247, 88, 33, 0.3)',
        'glow-intense': '0 0 30px -5px rgba(247, 88, 33, 0.5)',
      },
      backgroundImage: {
        'cyber-grid': "radial-gradient(#27272A 1px, transparent 1px)",
      },
      backgroundSize: {
        'cyber-grid': '20px 20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
      },
      keyframes: {
        'border-beam': {
          '100%': {
            'offset-distance': '100%',
          },
        },
      },
    },
  },
  plugins: [],
}
