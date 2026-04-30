const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const isProd = process.env.NODE_ENV === 'production';

module.exports = {
    entry: isProd ? './src/main.obf.js' : './src/main.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
        chunkFormat: false
    },
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'source-map',
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'public'),
      },
      host: '0.0.0.0',
      port: 8080,
      allowedHosts: 'all',
      open: true,
    },
    performance: {
      hints: false,
    },
    optimization: isProd
      ? {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            extractComments: false,
          }),
        ],
      }
    : {},
};

