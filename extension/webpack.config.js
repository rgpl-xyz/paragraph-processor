const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

require('dotenv').config();

// Build-time settings. .env or the shell override these defaults (see README).
const DEFAULTS = {
  API_BASE_URL: 'http://localhost:8080',
  API_ENDPOINT: '/noun_phrases',
  API_TIMEOUT: '10000',
  API_RETRY_ATTEMPTS: '3',
  API_RETRY_DELAY: '1000',
  CACHE_DURATION: '300000',
  MAX_CACHE_SIZE: '1000',
};
const settings = Object.fromEntries(
  Object.entries(DEFAULTS).map(([key, fallback]) => [key, process.env[key] || fallback]),
);

module.exports = (env, argv) => ({
  mode: argv.mode || 'production',
  entry: {
    content: './src/content/content.ts',
    background: './src/background/background.ts',
    popup: './src/popup/popup.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Clean the output directory before each build
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin(
      Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
      ),
    ),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: '',
          // The extension may call only the API origin it was built for
          transform: (content) =>
            JSON.stringify(
              { ...JSON.parse(content.toString()), host_permissions: [`${new URL(settings.API_BASE_URL).origin}/*`] },
              null,
              2,
            ),
        },
        { from: 'src/popup/popup.html', to: '' },
        { from: 'src/images', to: 'images' }, // Copy images folder to the images output directory
      ],
    }),
  ],
});
