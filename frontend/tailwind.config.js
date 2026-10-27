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
          bg: '#0B1020',
          surface: '#141B2D',
          surfaceHover: '#1B243B',
          surfaceActive: '#222D4A',
          border: '#283149',
          borderSubtle: '#1C2438',
          textPrimary: '#E8ECF5',
          textSecondary: '#9AA6BF',
          accent: '#8B7CFF',
          accentHover: '#7A68FC',
          protection: '#36D6B0',
          protectionHover: '#2EC29E',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
