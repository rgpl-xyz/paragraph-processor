const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
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
    new Dotenv({
      systemvars: true, // Load all system environment variables as well
      safe: false, // Don't require all variables to be set
      defaults: false, // Don't load .env.defaults
      // Don't override NODE_ENV if it's already set by webpack
      ignoreStub: true,
      // Exclude NODE_ENV from being processed by dotenv-webpack
      allowEmptyValues: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '' }, // Copy manifest.json to the root output directory
        { from: 'src/popup', to: '' }, // Copy popup folder to the root output directory
        { from: 'src/images', to: 'images' }, // Copy images folder to the images output directory
      ],
    }),
  ],
  };
};
