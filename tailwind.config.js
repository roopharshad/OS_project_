/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F7F6F1',
        paper: '#F2F0E7',
        charcoal: '#252823',
        forest: '#315C46',
        'forest-dark': '#2C4A3A',
        olive: '#A2A77B',
        sage: '#ECEEE4',
        thinking: '#DCEAF4',
        hungry: '#F7E5B7',
        eating: '#D7E9D9',
        border: '#E8E7E1',
        line: '#DCD9CC',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(37,40,35,0.05), 0 2px 6px rgba(37,40,35,0.05)',
        'card-md': '0 4px 14px rgba(37,40,35,0.10)',
      },
    },
  },
  plugins: [],
};
