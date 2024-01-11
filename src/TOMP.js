import RewriteURL from './RewriteURL.js';
import RewriteJS from './RewriteJS.js';
import RewriteCSS from './RewriteCSS.js';
import RewriteHTML from './RewriteHTML.js';
import RewriteSVG from './RewriteSVG.js';
import RewriteForm from './RewriteForm.js';
import RewriteElements from './RewriteElements.js';
import RewriteManifest from './RewriteManifest.js';
import RewriteBinary from './RewriteBinary.js';
import { PlainCodec, XORCodec } from './Codec.js';
import Logger, { LOG_WARN } from './Logger.js';
import BareClient from '@tomphttp/bare-client';

/**
 * @type {import('./Codec.js').CodecInterface[]}
 */
const codecs = [PlainCodec, XORCodec];

export * from './TOMPConstants.js';

/**
 * @typedef {object} TOMPConfig
 * @property {number} codec
 * @property {string} directory Real origin of the TOMP instance such as http://localhost
 * @property {string} bare_server
 * @property {string} origin
 * @property {string} [key] Optional if this TOMP instance is in a ServiceWorker, before the key is accessed. Codec key.
 * @property {import('./Logger.js').LOG_LEVELS} loglevel
 * @property {boolean} noscript
 * @property {object} [bare_data] Optional if this TOMP instance is in a ServiceWorker, where the bare data is fetched.
 */

export default class TOMP {
	/**
	 *
	 * @returns {object}
	 */
	toJSON() {
		if (this.key === '') {
			throw new Error('Cannot serialize TOMP: Key not set');
		}

		return {
			directory: this.directory,
			bare_server: this.bare_server,
			bare_data: this.bare.data,
			origin: this.origin,
			key: this.key,
			noscript: this.noscript,
			loglevel: this.loglevel,
			codec: this.codec_index,
		};
	}
	directory = '';
	origin = '';
	key = '';
	loglevel = LOG_WARN;
	noscript = false;
	codec_index = 0;
	/**
	 *
	 * @param {TOMPConfig} config
	 */
	constructor(config) {
		if (typeof config.codec === 'number') {
			const Codec = codecs[config.codec];

			if (Codec === undefined) {
				throw new RangeError('Codec was out of range.');
			}

			this.codec_index = config.codec;
			/**
			 * @type {import('./Codec.js').CodecInterface}
			 */
			this.codec = new Codec();
		} else {
			/**
			 * @type {import('./Codec.js').CodecInterface}
			 */
			this.codec = new PlainCodec();
		}

		if (typeof config.directory !== 'string') {
			throw new Error('Directory must be specified.');
		}

		if (typeof config.bare_server !== 'string') {
			throw new Error('Bare server URL must be specified.');
		}

		if (typeof config.origin !== 'string') {
			throw new Error('Origin must be specified.');
		}

		// serviceworker can set config.key once db is loaded
		// client MUST specify config.key
		if (typeof config.key === 'string') {
			this.key = config.key;
		}

		this.origin = config.origin;
		this.directory = config.directory;
		this.bare_server = config.bare_server;

		if (typeof config.loglevel == 'number') {
			this.loglevel = config.loglevel;
		}

		if (config.noscript === true) {
			this.noscript = true;
		}

		/** @type {BareClient} */
		this.bare = new BareClient(
			new URL(this.bare_server, this.origin),
			config.bare_data
		);
		/** @type {Logger} */
		this.log = new Logger(this.loglevel);
		/** @type {RewriteURL} */
		this.url = new RewriteURL(this);
		/** @type {RewriteJS} */
		this.js = new RewriteJS(this);
		/** @type {RewriteCSS} */
		this.css = new RewriteCSS(this);
		/** @type {RewriteHTML} */
		this.html = new RewriteHTML(this);
		/** @type {RewriteBinary} */
		this.binary = new RewriteBinary(this);
		/** @type {RewriteSVG} */
		this.svg = new RewriteSVG(this);
		/** @type {RewriteForm} */
		this.form = new RewriteForm(this);
		/** @type {RewriteManifest} */
		this.manifest = new RewriteManifest(this);
		/** @type {RewriteElements} */
		this.elements = new RewriteElements(this);
	}
	/**
	 *
	 * @param {string} data
	 * @returns {string}
	 */
	wrap(data) {
		if (this.key === '') {
			throw new Error('Cannot wrap: Key not set');
		}

		return this.codec.wrap(data, this.key);
	}
	/**
	 *
	 * @param {string} data
	 * @returns {string}
	 */
	unwrap(data) {
		if (this.key === '') {
			throw new Error('Cannot unwrap: Key not set');
		}

		return this.codec.unwrap(data, this.key);
	}
}
