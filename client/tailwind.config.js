export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#17201b',
        moss: '#41644a',
        mint: '#d7f1df',
        coral: '#ff7a59',
        honey: '#f4b942',
        skyglass: '#dceefa'
      }
    }
  },
  plugins: []
};
