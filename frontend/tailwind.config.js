/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#0A0E14',
          surface: '#141A24',
          surfaceHover: '#1B222E',
          surfaceActive: '#222B38',
          border: '#232B38',
          borderSubtle: '#1A212B',
          textPrimary: '#E6EBF2',
          textSecondary: '#8A97AC',
          accent: '#3B82F6',
          accentHover: '#2F6FE0',
          accentSoft: 'rgba(59,130,246,0.14)',
          protection: '#10B981',
          protectionHover: '#0E9E72',
          warn: '#F59E0B',
          crit: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25)',
        pop: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.35)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      }
    },
  },
  plugins: [],
}
