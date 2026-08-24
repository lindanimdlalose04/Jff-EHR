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
          strong: "hsl(var(--accent-strong))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          tint: "hsl(var(--success-tint))",
          text: "hsl(var(--success-text))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          tint: "hsl(var(--danger-tint))",
          border: "hsl(var(--danger-border))",
          text: "hsl(var(--danger-text))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          tint: "hsl(var(--warning-tint))",
          text: "hsl(var(--warning-text))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          grid: "hsl(var(--chart-grid))",
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
        // Clinical Blue is square. See spec/design/design-system.md.
        card: "0px",
        control: "var(--radius)",
      },
    },
  },
  plugins: [],
} satisfies Config;
