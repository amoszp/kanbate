/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Kanbate cyberpunk palette — single consistent source of truth.
        backdrop: '#0d0f18',
        panel: '#12151f',
        panel2: '#171b29',
        edge: '#232a3d',
        neon: {
          cyan: '#00f0ff',
          magenta: '#ff2a6d',
          yellow: '#ccff00',
          amber: '#ff9f1c',
          green: '#00ff9f',
          purple: '#a259ff',
        },
        ink: {
          primary: '#e6ecf7',
          muted: '#8b93a7',
          faint: '#565e73',
        },
      },
      fontFamily: {
        mono: [
          "'JetBrains Mono'",
          "'Fira Code'",
          'ui-monospace',
          "'Cascadia Mono'",
          'SFMono-Regular',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(0, 240, 255, 0.45), inset 0 0 6px rgba(0, 240, 255, 0.15)',
        'neon-magenta': '0 0 16px rgba(255, 42, 109, 0.5), inset 0 0 6px rgba(255, 42, 109, 0.15)',
        'neon-yellow': '0 0 12px rgba(204, 255, 0, 0.4)',
        panel: '0 4px 24px rgba(0, 0, 0, 0.55)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 10px rgba(255, 42, 109, 0.7)' },
          '50%': { opacity: '0.55', boxShadow: '0 0 4px rgba(255, 42, 109, 0.3)' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scanline': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.6s ease-in-out infinite',
        'slide-in': 'slide-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
