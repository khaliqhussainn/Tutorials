import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
     colors: {
  primary: {
    50: '#f0f4ff',
    100: '#e0eaff',
    200: '#c7d6ff',
    300: '#a3b9ff',
    400: '#7d95ff',
    500: '#5c73ff',
    600: '#4c52ff',
    700: '#3d3aed',
    800: '#2d28d9',
    900: '#001e62',
  },
  dark: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
},
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config