import { paraglideVitePlugin } from '@inlang/paraglide-js';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: {
					async: true
				},
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter(),
		}),
		SvelteKitPWA({
			// Opciones de configuración o déjalo en modo cero-configuración
			manifest: {
				orientation: "any",
				display: "standalone",
				dir: "auto",
				name: "Galileo",
				short_name: "Galileo",
				theme_color: '#ffa3a3',
				icons: [
					{"purpose":"maskable","sizes":"512x512","src":"/icon512_maskable.png","type":"image/png"},
					{"purpose":"any","sizes":"512x512","src":"/icon512_rounded.png","type":"image/png"}
				]
			},
			devOptions: {enabled: true},
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: false
		}),

		commonjs(),
	]
});
