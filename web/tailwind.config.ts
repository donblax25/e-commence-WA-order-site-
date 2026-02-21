import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f5f1ea",
        clay: "#d6b48a",
        ink: "#1f2a36",
        olive: "#52634f",
        amber: "#b56e2d"
      }
    }
  },
  plugins: []
};

export default config;
