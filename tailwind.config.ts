import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/content/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        sm: "2rem",
        lg: "3rem"
      }
    },
    extend: {
      colors: {
        primary: "#0088FF",
        secondary: "#FFCC00",
        background: "#FFFFFF"
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top left, rgba(0, 136, 255, 0.12), rgba(255, 255, 255, 1))",
        "deep-glow":
          "linear-gradient(135deg, rgba(0, 136, 255, 0.16), rgba(255, 204, 0, 0.12))"
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
        jp: ["var(--font-noto-jp)", ...fontFamily.sans]
      },
      borderRadius: {
        glass: "24px"
      },
      boxShadow: {
        glass: "0 24px 60px rgba(15, 23, 42, 0.08)",
        "glow-primary": "0 18px 40px rgba(0, 136, 255, 0.3)"
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease forwards"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
