import { createDataURI, parseDataURI } from './dataURI.js';

export default class Rewriter {
	static service = 'unknown';
	/**
	 *
	 * @param {import('./TOMP.js').default} tomp
	 */
	constructor(tomp) {
		/**
		 * @type {import('./TOMP.js').default}
		 */
		this.tomp = tomp;
	}
	/**
	 * @returns {boolean}
	 */
	get overwrites_wrap() {
		return this.wrap !== Rewriter.prototype.wrap;
	}
	/**
	 * @returns {boolean}
	 */
	get overwrites_unwrap() {
		return this.unwrap !== Rewriter.prototype.unwrap;
	}
	/**
	 *
	 * @param {string} serve
	 * @param {string} url
	 * @param {string} service
	 * @returns {string}
	 */
	serve(serve, url, service = this.constructor.service) {
		serve = String(serve);

		if (serve.startsWith('data:')) {
			if (!this.overwrites_wrap) {
				return serve;
			}

			const { mime, data, base64 } = parseDataURI(serve);

			const wrapped = this.wrap(data, url);

			return createDataURI(mime, wrapped, base64);
		}

		return this.tomp.url.wrap(serve, service);
	}
	/**
	 *
	 * @param {string}} serving
	 * @param {string} url
	 * @returns {string}
	 */
	unwrap_serving(serving, url) {
		serving = String(serving);

		if (serving.startsWith('data:')) {
			if (!this.overwrites_wrap) {
				return serving;
			}

			const { mime, data, base64 } = parseDataURI(serving);

			const unwrapped = this.unwrap(data, url);

			return createDataURI(mime, unwrapped, base64);
		}

		return this.tomp.url.unwrap_ez(serving);
	}
	/**
	 *
	 * @param {string} code
	 * @returns {string}
	 */
	wrap(code) {
		return code;
	}
	/**
	 *
	 * @param {string} code
	 * @returns {string}
	 */
	unwrap(code) {
		return code;
	}
}
