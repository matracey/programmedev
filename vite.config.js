export default {
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [
          "color-functions",
          "global-builtin",
          "import",
          "if-function",
        ],
      },
    },
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
};
