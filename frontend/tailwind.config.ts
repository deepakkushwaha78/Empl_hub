import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172334",
        muted: "#64748b",
        canvas: "#f5f7fa",
        brand: "#245b72",
      },
    },
  },
  plugins: [],
};

export default config;
