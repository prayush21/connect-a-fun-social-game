import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Card-based design system - Minimalist black & white palette
        card: {
          bg: "#FFFFFF",
          border: "#000000",
          shadow: "#00000015",
          active: "#000000",
          inactive: "#E5E5E5",
          disabled: "#F5F5F5",
          hover: "#F9F9F9",
        },
        // Game-specific color palette - Neobrutalist theme
        primary: {
          DEFAULT: "#1a1f2e",
          light: "#2a3142",
          dark: "#0f1219",
        },
        // Background color for pages
        surface: {
          DEFAULT: "#F2F3F5",
          light: "#FFFFFF",
        },
        // Semantic colors
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
        },
        error: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
        },
        // Notification tints for Section 2
        notify: {
          info: "#F0F9FF",
          success: "#F0FDF4",
          warning: "#FFFBEB",
          error: "#FEF2F2",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      // Card-specific spacing scales
      spacing: {
        "card-sm": "320px",
        "card-md": "400px",
        "card-lg": "480px",
      },
      // Card elevation system (shadow for stack depth)
      boxShadow: {
        "card-1": "0 2px 8px rgba(0, 0, 0, 0.08)",
        "card-2": "0 4px 12px rgba(0, 0, 0, 0.12)",
        "card-3": "0 8px 16px rgba(0, 0, 0, 0.16)",
        "card-4": "0 12px 24px rgba(0, 0, 0, 0.20)",
      },
      // Card border radius
      borderRadius: {
        card: "24px",
        "card-sm": "16px",
        "card-lg": "32px",
      },
      // Transition timings for swipe gestures
      transitionTimingFunction: {
        "card-swipe": "cubic-bezier(0.4, 0, 0.2, 1)",
        "card-snap": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        card: "300ms",
        swipe: "250ms",
        snap: "400ms",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "scale-in": "scaleIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "card-enter": "cardEnter 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "card-exit": "cardExit 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "letter-slide-up": "letterSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "notification-fade": "notificationFade 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Card animations
        cardEnter: {
          "0%": {
            opacity: "0",
            transform: "translateY(20px) scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
        cardExit: {
          "0%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
          "100%": {
            opacity: "0",
            transform: "translateY(-20px) scale(0.95)",
          },
        },
        // Letter block slide-up animation from behind card
        letterSlideUp: {
          "0%": {
            opacity: "0",
            transform: "translateY(40px)",
          },
          "60%": {
            opacity: "1",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        // Notification fade animation
        notificationFade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
  // darkMode disabled - light mode only for now
  // darkMode: "media",
};

export default config;
