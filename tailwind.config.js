/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0077c8',
          hover: '#005fa3',
          light: 'rgba(0, 119, 200, 0.08)',
          ring: 'rgba(0, 119, 200, 0.2)',
        },
        border: {
          DEFAULT: '#e0e0e0',
          focus: '#0077c8',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // avoid conflicting with Angular Material / global resets
  },
};
