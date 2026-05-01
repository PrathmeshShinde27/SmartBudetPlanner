export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#102033',
        moss: '#0284c7',
        mint: '#dff3ff',
        coral: '#f97316',
        honey: '#f4b942',
        skyglass: '#dceefa'
      }
    }
  },
  plugins: []
};
