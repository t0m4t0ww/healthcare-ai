// tailwind.config.js - Synced with Ant Design Theme
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx,html}"],
  safelist: [
    { pattern: /(from|to|bg|text|border)-(emerald|teal|blue|red|orange|amber|slate|gray)-(50|100|200|300|400|500|600|700|800|900)/ },
  ],
  theme: {
    extend: {
      // 🎨 Colors - Match Ant Design Theme
      colors: {
        primary: {
          DEFAULT: '#10b981', // emerald-500
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        success: {
          DEFAULT: '#14b8a6', // teal-500
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      
      // 📝 Typography - Inter Font
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      
      // 📐 Border Radius - Match Ant Design
      borderRadius: {
        'xs': '6px',
        'sm': '8px',
        'DEFAULT': '12px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      
      // 📦 Spacing
      spacing: {
        '4.5': '18px',
        '13': '52px',
        '15': '60px',
        '18': '72px',
        '88': '352px',
        '92': '368px',
        '100': '400px',
        '104': '416px',
        '108': '432px',
        '112': '448px',
        '116': '464px',
        '120': '480px',
      },
      
      // 🎭 Box Shadow - Match Ant Design
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'emerald': '0 4px 6px -1px rgb(16 185 129 / 0.3)',
        'teal': '0 4px 6px -1px rgb(20 184 166 / 0.3)',
      },
      
      // 🌈 Animation
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
      },
      
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5%)' },
        },
      },
      
      // 📱 Screens - Match Ant Design breakpoints
      screens: {
        'xs': '480px',
        'sm': '576px',
        'md': '768px',
        'lg': '992px',
        'xl': '1200px',
        '2xl': '1600px',
      },
    },
  },
  plugins: [
    require("daisyui"),
  ],
  daisyui: {
    themes: ["light", "dark"],
    // Disable DaisyUI's component classes to avoid conflicts with Ant Design
    styled: false,
    base: false,
  },
  // Make Tailwind important to override Ant Design when needed
  important: false,
};
