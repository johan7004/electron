const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');
module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  plugins: [
    new Dotenv(),
    new CopyPlugin({
      patterns: [
        { from: 'data.json', to: 'data.json' },
      ],
    }),
  ],
  module: {
    rules: require('./webpack.rules'),
  },
};
