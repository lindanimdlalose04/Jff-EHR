import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "hsl(var(--page))",
        surface: "hsl(var(--surface))",
        field: "hsl(var(--field))",
        primary: "hsl(var(--text-primary))",
        secondary: "hsl(var(--text-secondary))",
        muted: "hsl(var(--text-muted))",
        card: "hsl(var(--border-card))",
        "field-border": "hsl(var(--border-field))",
        divider: "hsl(var(--divider))",
        "header-tint": "hsl(var(--header-tint))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          tint: "hsl(var(--accent-tint))",
          border: "hsl(var(--accent-border))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          tint: "hsl(var(--danger-tint))",
          border: "hsl(var(--danger-border))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          tint: "hsl(var(--warning-tint))",
        },
        admin: {
          DEFAULT: "hsl(var(--admin))",
          tint: "hsl(var(--admin-tint))",
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
          tint: "hsl(var(--neutral-tint))",
        },
      },
      borderRadius: {
        card: "12px",
        control: "var(--radius)",
      },
    },
  },
  plugins: [],
} satisfies Config;
