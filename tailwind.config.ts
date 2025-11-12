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
        night: {
          DEFAULT: "#0D1117",
          light: "#1a1f2b"
        },
        accent: "#F2C94C"
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top left, rgba(242, 201, 76, 0.15), rgba(13, 17, 23, 0.9))",
        "deep-glow":
          "linear-gradient(135deg, rgba(33, 45, 93, 0.8), rgba(102, 38, 122, 0.6))"
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
        jp: ["var(--font-noto-jp)", ...fontFamily.sans]
      },
      borderRadius: {
        glass: "24px"
      },
      boxShadow: {
        glass: "0 10px 40px rgba(0,0,0,0.35)",
        "glow-accent": "0 0 30px rgba(242, 201, 76, 0.35)"
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease forwards"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
