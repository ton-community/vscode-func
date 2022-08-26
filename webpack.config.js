//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");


const distDir = path.resolve(__dirname, 'dist');

/**@type {import('webpack').Configuration}*/
const config = {
  mode: 'production',
  
  target: 'node', // vscode extensions run in webworker context for VS Code web 📖 -> https://webpack.js.org/configuration/target/#target

  entry: {
    server: './server/src/server.ts',
    client: './client/src/extension.ts',
  }, // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: distDir,
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },

  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // provides alternate implementation for node module and source files
    },
    fallback: {}
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "./server/node_modules/web-tree-sitter/tree-sitter.wasm", to: distDir },
       { from: "./server/tree-sitter-func.wasm", to: distDir },
      ],
    }),
  ],
};
module.exports = config;