import SearchBuilder from './SearchBuilder.js';
import {
	LOG_TRACE,
	LOG_DEBUG,
	LOG_INFO,
	LOG_WARN,
	LOG_ERROR,
	LOG_SILENT,
} from '../LoggerConstants.js';
import { CODEC_PLAIN, CODEC_XOR } from '../TOMPConstants.js';

export default class Bootstrapper {
	static SearchBuilder = SearchBuilder;
	// expose constants
	static CODEC_XOR = CODEC_XOR;
	static CODEC_PLAIN = CODEC_PLAIN;
	static LOG_TRACE = LOG_TRACE;
	static LOG_DEBUG = LOG_DEBUG;
	static LOG_INFO = LOG_INFO;
	static LOG_WARN = LOG_WARN;
	static LOG_ERROR = LOG_ERROR;
	static LOG_SILENT = LOG_SILENT;
	constructor(config) {
		if (typeof config.directory !== 'string') {
			throw new TypeError(`Directory must be a string`);
		}

		this.config = config;

		this.ready = this.register();
	}
	async register() {
		if (!('serviceWorker' in navigator))
			throw new Error('Your browser does not support service workers.');

		/*for(let worker of await navigator.serviceWorker.getRegistrations()){
			await worker.unregister();
		}*/

		const url = `${this.config.directory}worker.js?config=${encodeURIComponent(
			JSON.stringify(this.config)
		)}`;

		this.worker = await navigator.serviceWorker.register(url, {
			scope: this.config.directory,
			updateViaCache: 'none',
		});

		await this.worker.update();

		if (this.config.loglevel <= LOG_DEBUG) {
			console.debug('Registered the service worker.');
		}
	}
	#send(service, url) {
		return `${this.config.directory}process:${encodeURIComponent(
			service
		)}:${encodeURIComponent(url)}`;
	}
	html(url) {
		return this.#send('html', url);
	}
	css(url) {
		return this.#send('css', url);
	}
	js(url) {
		return this.#send('js', url);
	}
	binary(url) {
		return this.#send('binary', url);
	}
}
