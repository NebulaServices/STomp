import { decodeBase64, encodeBase64 } from '../../../Base64.js';
import global from '../../../global.js';
import { engine } from '../../environment.js';
import { decodeCookie } from '../../../encodeCookies.js';
import { status_empty } from '../../../HTTPConsts.js';
import CookieRewrite from './Cookie.js';

// 10 seconds
const max_cycles = 10 * 200000000;
const { Request, XMLHttpRequest } = global;

export default class SyncClient {
	constructor(client) {
		this.client = client;
	}
	encoder = new TextEncoder();
	decoder = new TextEncoder();
	work() {}
	create_response([error, textArrayBuffer, init, url]) {
		if (error !== null) {
			throw new TypeError(error.message);
		}

		const { buffer: rawArrayBuffer } = this.encoder.encode(textArrayBuffer);

		let response;

		if (!init) {
			console.error('no init');
			debugger;
		}

		if (status_empty.includes(init.status)) {
			response = new Response(undefined, init);
		} else {
			response = new Response(rawArrayBuffer, init);
		}

		response.rawUrl = url;
		response.rawArrayBuffer = rawArrayBuffer;

		return response;
	}
	fetch(url, init = {}, loopback = false) {
		const request = new Request(url, init);

		const options = {
			method: request.method,
			cache: request.cache,
			referrer: request.referrer,
		};

		if (init.headers instanceof Headers) {
			options.headers = Object.fromEntries(init.headers.entries());
		} else if (typeof init.headers === 'object' && init.headers !== null) {
			options.headers = init.headers;
		} else {
			options.headers = {};
		}

		let body = undefined;

		if (init.body instanceof ArrayBuffer) {
			body = this.decoder.decode(init.body);
		} else if (typeof init.body === 'string') {
			body = init.body;
		}

		const args = [request.url, options, body];

		if (engine == 'gecko') {
			const http = new XMLHttpRequest();

			http.open('POST', `${this.client.tomp.directory}sync-request/`, false);
			http.send(JSON.stringify(args));

			return this.create_response(JSON.parse(http.responseText));
		}

		const id = 'sync-request-' + Math.random().toString(16).slice(2);
		const regex = new RegExp(`${id}=(.*?)(;|$)`);

		this.client.registration.postMessage({
			tomp: true,
			sync: true,
			id,
			args,
		});

		let cookie = '';
		let cookie_count;
		let remainder = 0;

		if (loopback) {
			remainder = 10;
		} else {
			remainder = 5000;
		}

		for (let cycles = 0; cycles < max_cycles; cycles++) {
			if (cycles % remainder !== 0) {
				continue;
			}

			cookie = this.client.get(CookieRewrite).value;
			const match = cookie.match(regex);

			if (!match) continue;

			const [, value] = match;

			cookie_count = parseInt(value);

			this.client.get(
				CookieRewrite
			).value = `${id}=; path=/; expires=${new Date(0)}`;

			break;
		}

		if (cookie_count === undefined) {
			throw new RangeError(
				`Reached max cycles (${max_cycles}) when requesting ${url}`
			);
		}

		let data = '';

		for (let i = 0; i < cookie_count; i++) {
			const regex = new RegExp(`${id}${i}=(.*?)(;|$)`);
			const match = cookie.match(regex);

			if (!match) {
				console.warn(`Couldn't find chunk ${i}`);
				continue;
			}

			this.client.get(
				CookieRewrite
			).value = `${id}${i}=; path=/; expires=${new Date(0)}`;

			const [, value] = match;

			data += value;
		}

		return this.create_response(JSON.parse(decodeCookie(data)));
	}
}
