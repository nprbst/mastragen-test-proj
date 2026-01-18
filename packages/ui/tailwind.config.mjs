/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#12121a',
        'bg-tertiary': '#1a1a25',
        'text-primary': '#f0f0f5',
        'text-secondary': '#8888a0',
        'text-muted': '#555570',
        'accent-primary': '#6366f1',
        'accent-secondary': '#818cf8',
        'accent-green': '#22c55e',
        'accent-amber': '#f59e0b',
        'accent-rose': '#f43f5e',
        'accent-cyan': '#06b6d4',
        'border-color': '#2a2a3a',
        'code-bg': '#151520',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        glow: '0 0 60px rgba(99, 102, 241, 0.15)',
        'glow-sm': '0 0 30px rgba(99, 102, 241, 0.1)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)',
        'gradient-subtle': 'linear-gradient(135deg, #06b6d4, #3b82f6)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
