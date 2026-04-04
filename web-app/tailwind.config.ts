import type { Config } from "tailwindcss"
import defaultTheme from "tailwindcss/defaultConfig"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dashboard: {
          bg: "var(--dashboard-bg)",
          card: "var(--dashboard-card)",
          border: "var(--dashboard-border)",
          "border-active": "var(--dashboard-border-active)",
          "bg-hover": "var(--dashboard-bg-hover)",
          "bg-active": "var(--dashboard-bg-active)",
          text: {
            primary: "var(--dashboard-text-primary)",
            secondary: "var(--dashboard-text-secondary)",
            muted: "var(--dashboard-text-muted)",
            tertiary: "var(--dashboard-text-tertiary)",
          },
          success: {
            DEFAULT: "var(--dashboard-success)",
            bg: "var(--dashboard-success-bg)",
            border: "var(--dashboard-success-border)",
          },
          info: "var(--dashboard-info)",
          warning: "var(--dashboard-warning)",
          danger: {
            DEFAULT: "var(--dashboard-danger)",
            light: "var(--dashboard-danger-light)",
            bg: "var(--dashboard-danger-bg)",
            border: "var(--dashboard-danger-border)",
            "text-light": "var(--dashboard-danger-text-light)",
          },
          accent: {
            DEFAULT: "var(--dashboard-accent)",
            orange: "var(--dashboard-accent-orange)",
          },
          "chart-blue": "var(--dashboard-chart-blue)",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
