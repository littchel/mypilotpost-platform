import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        os: {
          bg:      "#0A0D14",
          surface: "#131825",
          raised:  "#1A2035",
          border:  "#252D42",
          strong:  "#3A4460",
        },
        brand: {
          DEFAULT: "#6068E8",
          dim:     "#4850C8",
          50:  "#EDEEFF",
          100: "#DADDFF",
          200: "#B8BCFF",
          400: "#8890F0",
          500: "#6068E8",
          600: "#4850C8",
          700: "#3840A8",
          900: "#1A2068",
        },
        ink: {
          1: "#ECF0FF",
          2: "#8892B0",
          3: "#505875",
          4: "#2A3148",
        },
        surface: {
          DEFAULT: "#131825",
          muted:   "#0A0D14",
          border:  "#252D42",
        },
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      boxShadow: {
        "os-sm": "0 1px 3px rgba(0,0,0,0.4)",
        "os":    "0 4px 12px rgba(0,0,0,0.5)",
        "os-lg": "0 12px 40px rgba(0,0,0,0.6)",
      },
      animation: {
        "fade-in":    "fadeIn 0.15s ease-out",
        "slide-up":   "slideUp 0.2s cubic-bezier(0.16,1,0.3,1)",
        "slide-right":"slideRight 0.25s cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        fadeIn:     { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:    { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideRight: { from: { opacity: "0", transform: "translateX(-16px)" }, to: { opacity: "1", transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
