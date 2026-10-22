import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Blueprint Extractor',
    description: 'Ekstrak halaman website menjadi file Markdown spesifikasi UI presisi untuk AI coding agents.',
    version: '1.0.0',
    permissions: [
      'activeTab',
      'tabs',
      '<all_urls>',
      'scripting',
      'contextMenus',
      'storage',
      'unlimitedStorage',
      'downloads',
    ],
    browser_specific_settings: {
      gecko: {
        id: 'blueprint-extractor@local',
        strict_min_version: '109.0',
      },
    },
    action: {
      default_title: 'Blueprint Extractor',
    },
  },
});
