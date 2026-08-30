'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('./tools/manifest-plugin');
const pkg = require('./package.json');

/**
 * Build-time endpoint override. Any of these set it (first match wins):
 *
 *   npm run build --endpoint=wss://vnc.example.com/websockify   (npm_config_endpoint)
 *   webpack --env endpoint=wss://vnc.example.com/websockify     (env.endpoint)
 *   VNC_ENDPOINT=wss://vnc.example.com/websockify webpack       (process.env)
 *
 * When set, the bundle connects ONLY to this endpoint and ignores the page origin.
 * When empty, the client derives the endpoint from the origin serving the HTML page
 * (https -> wss, http -> ws).
 *
 * Base URL. Serves every asset/page under `<base-url>/*` (webpack publicPath,
 * `<script>`/`<link>` hrefs, and the manifest `base`). First match wins:
 *
 *   npm run build --base-url=/vnc/                  (npm_config_base_url)
 *   webpack --env baseUrl=/vnc/                     (env.baseUrl)
 *   BASE_URL=/vnc/ webpack                          (process.env)
 *
 * Defaults to `/`.
 */
function normalizeBase(value) {
  let base = String(value || '').trim();
  if (!base || base === '/') return '/';
  const isAbsoluteUrl = /^([a-z][a-z0-9+.-]*:)?\/\//i.test(base);
  if (!isAbsoluteUrl && !base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

module.exports = (env = {}, argv = {}) => {
  const isProduction = argv.mode === 'production';
  const endpoint = String(
    env.endpoint || process.env.npm_config_endpoint || process.env.VNC_ENDPOINT || '',
  ).trim();
  const baseUrl = normalizeBase(
    env.baseUrl ||
      process.env.npm_config_base_url ||
      process.env['npm_config_base-url'] ||
      process.env.BASE_URL ||
      '/',
  );

  return {
    entry: './src/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'novnc-wla.[contenthash].js' : 'novnc-wla.js',
      publicPath: baseUrl,
      clean: true,
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
      new webpack.DefinePlugin({
        // Inlined into the bundle at build time.
        __VNC_ENDPOINT__: JSON.stringify(endpoint),
        __BASE_URL__: JSON.stringify(baseUrl),
        __HOMEPAGE__: JSON.stringify(pkg.homepage || ''),
      }),
      new HtmlWebpackPlugin({
        template: './src/index.html',
        favicon: './src/favicon.svg',
        inject: 'body',
      }),
      new ManifestPlugin({
        name: pkg.name,
        title: 'VNC Screen',
        version: pkg.version,
        description: pkg.description,
        base: baseUrl,
      }),
    ],
    devServer: {
      // No `static` mount: everything the page needs is emitted by webpack.
      // Mounting ./dist would shadow the live build with a stale one at "/".
      port: 8080,
      hot: true,
      open: baseUrl,
      historyApiFallback: { index: `${baseUrl}index.html` },
      // The built-in "Loopback / On Your Network" banner hardcodes the "/" path.
      // When served under a base URL, reprint the reachable URLs with it.
      onListening(devServer) {
        if (!devServer || baseUrl === '/') return;
        const DevServer = require('webpack-dev-server');
        const { port } = devServer.server.address();
        const { info } = devServer.logger;
        const log = (label, host) =>
          info.call(devServer.logger, `${label}: http://${host}:${port}${baseUrl}`);

        log('Loopback', 'localhost');
        const ipv4 = DevServer.internalIPSync('v4');
        if (ipv4) log('On Your Network (IPv4)', ipv4);
        const ipv6 = DevServer.internalIPSync('v6'); // already bracketed
        if (ipv6) log('On Your Network (IPv6)', ipv6);
      },
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    performance: {
      hints: false,
    },
  };
};
