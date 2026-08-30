'use strict';

/**
 * Emits `manifest.json` next to the other build assets, describing the bundle
 * for a host launcher. Shape:
 *
 *   {
 *     "name": "<pkg name>",
 *     "base": "/",
 *     "entries": [{ title, version, description, main, icons: [{ url, colorScheme }] }],
 *     "files":   [{ url, file, type }]
 *   }
 */

function mimeFor(name) {
  if (name.endsWith('.js.map') || name.endsWith('.css.map')) return 'application/json';
  if (name.endsWith('.map')) return 'application/json';
  if (name.endsWith('.js') || name.endsWith('.mjs')) return 'text/javascript';
  if (name.endsWith('.css')) return 'text/css';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  if (name.endsWith('.html')) return 'text/html';
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.ico')) return 'image/x-icon';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.woff2')) return 'font/woff2';
  if (name.endsWith('.woff')) return 'font/woff';
  return 'application/octet-stream';
}

class ManifestPlugin {
  /**
   * @param {{
   *   name: string,
   *   title: string,
   *   version: string,
   *   description: string,
   *   base?: string,
   *   fileName?: string,
   *   indexAsset?: string,
   * }} options
   */
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    const { webpack } = compiler;
    const { RawSource } = webpack.sources;
    const {
      name,
      title,
      version,
      description,
      base = '/',
      fileName = 'manifest.json',
      indexAsset = 'index.html',
    } = this.options;

    const baseNoSlash = base.replace(/\/+$/, '');
    const toUrl = (asset) => (asset === indexAsset ? base : `${baseNoSlash}/${asset}`);

    compiler.hooks.thisCompilation.tap('ManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ManifestPlugin',
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        (assets) => {
          const names = Object.keys(assets)
            .filter((n) => n !== fileName)
            .sort((a, b) => {
              const ah = a === indexAsset;
              const bh = b === indexAsset;
              if (ah !== bh) return ah ? 1 : -1; // index.html last
              return a < b ? -1 : a > b ? 1 : 0;
            });

          const files = names.map((asset) => ({
            url: toUrl(asset),
            file: asset,
            type: mimeFor(asset),
          }));

          const iconAsset = names.find((n) => /(^|\/)favicon[.-]/.test(n) || n === 'favicon.ico');
          const icons = iconAsset
            ? ['light', 'dark'].map((colorScheme) => ({ url: toUrl(iconAsset), colorScheme }))
            : [];

          const manifest = {
            name,
            base,
            entries: [
              {
                title,
                version,
                description,
                main: base,
                icons,
              },
            ],
            files,
          };

          compilation.emitAsset(
            fileName,
            new RawSource(`${JSON.stringify(manifest, null, 2)}\n`),
          );
        },
      );
    });
  }
}

module.exports = ManifestPlugin;
