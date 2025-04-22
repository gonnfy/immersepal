import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    // Add other directories containing Tailwind classes if needed, e.g.,
    // "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/layout/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Add custom theme extensions here
    },
  },
  plugins: [],
};
export default config;