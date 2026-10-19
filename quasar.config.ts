// Configuración de Quasar CLI (app-vite v2). Referencia: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
import { defineConfig } from '#q-app/wrappers';

export default defineConfig(() => {
  return {
    boot: [],

    // Tokens del sistema de diseño y overrides sobre clases de Quasar
    css: ['app.scss'],

    // Material Icons rellenos (iconografía del sistema de diseño)
    extras: ['material-icons'],

    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      typescript: {
        strict: true,
        vueShim: true,
      },

      // Hash: el prototipo se puede publicar en cualquier servidor estático sin reescrituras
      vueRouterMode: 'hash',

      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            vueTsc: true,
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    devServer: {
      open: true,
    },

    framework: {
      lang: 'es',
      config: {
        notify: {
          position: 'top-right',
          timeout: 4000,
        },
      },
      plugins: ['Notify', 'Dialog'],
    },

    animations: [],
  };
});
