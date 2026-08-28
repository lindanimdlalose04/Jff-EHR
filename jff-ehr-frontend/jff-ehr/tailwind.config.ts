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
      /**
       * The six-step scale from spec/design/design-system.md. Defining it here
       * is the guard rail: text-base costs the same to type as text-[12.5px],
       * so the scale becomes the path of least resistance. Twelve ad hoc sizes
       * between 10.5px and 14px is how the old look went flat.
       */
      fontSize: {
        xs: ["11px", { lineHeight: "1.45", letterSpacing: "0.06em" }],
        sm: ["12px", { lineHeight: "1.45" }],
        base: ["13px", { lineHeight: "1.5" }],
        md: ["15px", { lineHeight: "1.4" }],
        lg: ["18px", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        xl: ["22px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        hero: ["58px", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
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
