/**
 * PostCSS pipeline for Next.js. Tailwind resolves `tailwind.config.ts` from the project root.
 * @type {import('postcss-load-config').Config}
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
