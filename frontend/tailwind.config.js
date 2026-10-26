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
        sentinel: {
          darkest: '#080c14',
          dark: '#0d131f',
          card: '#131b2c',
          border: '#1f2b42',
          accent: '#0ea5e9',
          danger: '#f43f5e',
          warning: '#f59e0b',
          success: '#10b981',
          muted: '#64748b'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
