import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#effcf9',100:'#d7f8f0',500:'#0d9488',600:'#0f766e',700:'#115e59',900:'#134e4a' },
        ink: '#0f172a'
      },
      boxShadow: { soft: '0 18px 45px rgba(15,23,42,.08)' }
    }
  },
  plugins: []
} satisfies Config;
