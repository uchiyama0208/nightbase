import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        xl: "2rem"
      },
      screens: {
        "2xl": "1280px"
      }
    },
    extend: {
      colors: {
        primary: "#5f6fff",
        secondary: "#c4f1ff",
        background: "#f5f7ff"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto)", ...fontFamily.sans]
      },
      boxShadow: {
        soft: "0 20px 45px -20px rgba(15, 23, 42, 0.15)"
      },
      borderRadius: {
        xl: "1.25rem",
        "3xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
