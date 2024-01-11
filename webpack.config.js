import webpack from 'webpack';
import { fileURLToPath } from 'node:url';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * @type {webpack.Configuration[]}
 */
const config = [
	{
		mode: isDevelopment ? 'development' : 'production',
		cache: {
			type: 'filesystem',
		},
		devtool: isDevelopment ? 'eval' : 'source-map',
		entry: {
			client: './src/Client/entry.js',
			worker: './src/Worker/entry.js',
		},
		output: {
			path: fileURLToPath(new URL('./dist/', import.meta.url)),
			filename: '[name].js',
		},
	},
	{
		mode: isDevelopment ? 'development' : 'production',
		cache: {
			type: 'filesystem',
		},
		devtool: 'source-map',
		entry: './src/Bootstrapper/Bootstrapper.js',
		output: {
			library: 'StompBoot',
			libraryTarget: 'umd',
			libraryExport: 'default',
			path: fileURLToPath(new URL('./dist/', import.meta.url)),
			filename: 'bootstrapper.js',
		},
	},
];

export default config;
