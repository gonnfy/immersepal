// postcss.config.js (元の正しい状態に戻す)
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // ← 元のこちらに戻す
  },
};
