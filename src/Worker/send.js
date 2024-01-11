import APIServer from './APIServer.js';
import { forbids_body, status_empty } from '../HTTPConsts.js';
import { mapHeaderNamesFromArray, rawHeaderNames } from './HeaderUtil.js';
import { html_types } from '../RewriteElements.js';
import sniffMime from './sniffMime.js';

/**
 *
 * @typedef {object} BareURL
 * @property {string} host
 * @property {string} path
 * @property {string} protocol
 * @property {number} port
 */

const remove_general_headers = ['alt-svc', 'x-xss-protection'];

const remove_html_headers = ['x-transfer-encoding'];

const remove_encoding_headers = ['x-content-encoding', 'content-encoding'];

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security
const remove_csp_headers = [
	'cross-origin-embedder-policy',
	'cross-origin-opener-policy',
	'cross-origin-resource-policy',
	'content-security-policy',
	'content-security-policy-report-only',
	'expect-ct',
	'feature-policy',
	'origin-isolation',
	'strict-transport-security',
	'upgrade-insecure-requests',
	'x-content-type-options',
	'x-download-options',
	'x-frame-options',
	'x-permitted-cross-domain-policies',
	'x-powered-by',
	'x-xss-protection',
];

/**
 *
 * @param {import('./Server.js').default} server
 * @param {Response} server_request
 * @param {Headers} request_headers
 * @param {BareURL} url
 */
async function handle_common_request(
	server,
	server_request,
	request_headers,
	url
) {
	//req.referrer
	if (server_request.headers.has('referer')) {
		const ref = new URL(server_request.headers.get('referer'));
		const { service, field } = server.tomp.url.get_attributes(ref.pathname);

		if (service == 'html') {
			request_headers.set('referer', server.tomp.url.unwrap(field).toString());
		} else {
			request_headers.delete('referer');
		}
	}

	let send_cookies = false;

	switch (server_request.credentials) {
		case 'include':
			send_cookies = true;

			break;
		case 'same-origin':
			if (server_request.headers.has('referer')) {
				send_cookies =
					new URL(request_headers.get('referer')).hostname == url.host;
			}

			break;
	}

	if (url.protocol == 'http:') {
		request_headers.set('upgrade-insecure-requests', '1');
	}

	request_headers.set('host', url.host);

	if (send_cookies) {
		const cookies = await server.cookie.get(url);

		if (cookies.length > 0) {
			request_headers.set('cookie', cookies.toString());
		} else {
			request_headers.delete('cookie');
		}
	} else {
		request_headers.delete('cookie');
	}
}

/**
 *
 * @param {import('../Rewriter.js').default} rewriter
 * @param {import('./Server.js').default} server
 * @param {Request} server_request
 * @param {BareURL} url
 * @returns {Response}
 */
async function handle_common_response(
	rewriter,
	server,
	server_request,
	url,
	response,
	...args
) {
	const response_headers = new Headers(response.headers);

	// server.tomp.log.debug(url, response_headers);

	// whitelist headers soon?

	for (let remove of remove_csp_headers) response_headers.delete(remove);
	for (let remove of remove_general_headers) response_headers.delete(remove);

	if (response.headers.has('set-cookie')) {
		for (let header in response.rawHeaders) {
			if (header.toLowerCase() === 'set-cookie') {
				await server.cookie.set(url, response.rawHeaders[header]);
			}
		}
	}

	response_headers.set('referrer-policy', 'same-origin');

	const will_redirect =
		(response.status >= 300 && response.status < 400) || response.status == 201;

	// CONTENT-LOCATION WHAT
	if (will_redirect && response_headers.has('location')) {
		let location = response_headers.get('location');
		// if new URL() fails, no redirect

		let evaluated;

		try {
			evaluated = new URL(location, url);
			response_headers.set(
				'location',
				rewriter.serve(evaluated.href, url, ...args)
			);
		} catch (err) {
			console.error('failure', err);
			response_headers.delete('location');
		}
	}

	return response_headers;
}

/**
 *
 * @param {import('./Server.js').default} server
 * @param {Response} server_request
 * @param {string} field
 */
async function get_data(server, server_request, field) {
	const request_headers = new Headers(server_request.headers);

	const url = server.tomp.url.unwrap(field);

	await handle_common_request(server, server_request, request_headers, url);

	let body = undefined;

	if (!forbids_body.includes(server_request.method)) {
		// https://developer.mozilla.org/en-US/docs/Web/API/Request/body#browser_compatibility
		body = await server_request.blob();
	}

	return {
		gd_error: false,
		url,
		body,
		request_headers,
	};
}

/**
 *
 * @param {import('./Server.js').default} server
 * @param {Request} server_request
 * @param {string} field
 * @returns {Response}
 */
async function sendBinary(server, server_request, field) {
	const { gd_error, url, request_headers, body } = await get_data(
		server,
		server_request,
		field
	);
	if (gd_error) return gd_error;

	const exact_request_headers = Object.fromEntries(request_headers.entries());

	Reflect.setPrototypeOf(exact_request_headers, null);

	if (server_request.headers.has('x-tomp-impl-names')) {
		mapHeaderNamesFromArray(
			JSON.parse(server_request.headers.get('x-tomp-impl-names')),
			exact_request_headers
		);
		delete exact_request_headers['x-tomp-impl-names'];
	}

	const response = await server.tomp.bare.request(
		server_request.method,
		exact_request_headers,
		body,
		url.protocol,
		url.host,
		url.port,
		url.path,
		server_request.cache
	);

	const response_headers = await handle_common_response(
		server.tomp.binary,
		server,
		server_request,
		url,
		response
	);

	const exact_response_headers = Object.fromEntries([
		...response_headers.entries(),
	]);

	Reflect.setPrototypeOf(exact_request_headers, null);

	mapHeaderNamesFromArray(
		rawHeaderNames(response.rawHeaders),
		exact_response_headers
	);

	if (status_empty.includes(+response.status)) {
		return new Response(undefined, {
			headers: exact_response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	} else {
		return new Response(response.body, {
			headers: exact_response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}
}

/**
 *
 * @param {import('../Rewriter.js').default} rewriter
 * @param {import('./Server.js').default} server
 * @param {Request} server_request
 * @param {string} field
 * @returns {Response}
 */
async function sendRewrittenScript(
	rewriter,
	server,
	server_request,
	field,
	...args
) {
	const { gd_error, url, request_headers, body } = await get_data(
		server,
		server_request,
		field
	);
	if (gd_error) return gd_error;

	const response = await server.tomp.bare.request(
		server_request.method,
		request_headers,
		body,
		url.protocol,
		url.host,
		url.port,
		url.path,
		server_request.cache
	);
	const response_headers = await handle_common_response(
		rewriter,
		server,
		server_request,
		url,
		response,
		...args
	);

	if (status_empty.includes(+response.status)) {
		return new Response({
			headers: response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	} else {
		for (let remove of remove_encoding_headers) response_headers.delete(remove);

		const text = await response.text();

		const wrapped = rewriter.wrap(text, url.toString(), ...args);

		return new Response(wrapped, {
			headers: response_headers,
			status: response.status,
			statusText: response.statusText,
		});
	}
}

async function sendJS(server, server_request, field) {
	return await sendRewrittenScript(
		server.tomp.js,
		server,
		server_request,
		field
	);
}

async function sendWJS(server, server_request, field, worker) {
	return await sendRewrittenScript(
		server.tomp.js,
		server,
		server_request,
		field,
		true
	);
}

async function sendCSS(server, server_request, field) {
	return await sendRewrittenScript(
		server.tomp.css,
		server,
		server_request,
		field
	);
}

async function sendManifest(server, server_request, field) {
	return await sendRewrittenScript(
		server.tomp.manifest,
		server,
		server_request,
		field
	);
}

async function sendSVG(server, server_request, field) {
	return await sendRewrittenScript(
		server.tomp.svg,
		server,
		server_request,
		field
	);
}

/**
 *
 * @param {import('./Server.js').default} server
 * @param {Request} server_request
 * @param {string} field
 * @returns {Response}
 */
async function sendHTML(server, server_request, field) {
	const { gd_error, url, request_headers, body } = await get_data(
		server,
		server_request,
		field
	);
	if (gd_error) return gd_error;

	const response = await server.tomp.bare.request(
		server_request.method,
		request_headers,
		body,
		url.protocol,
		url.host,
		url.port,
		url.path,
		server_request.cache
	);

	const response_headers = await handle_common_response(
		server.tomp.html,
		server,
		server_request,
		url,
		response
	);

	let send = undefined;

	if (!status_empty.includes(+response.status)) {
		const mime = sniffMime(server_request, response);

		response_headers.set('content-type', mime);

		if (html_types.includes(mime)) {
			send = server.tomp.html.wrap(await response.text(), url.toString());

			for (let remove of remove_encoding_headers) {
				response_headers.delete(remove);
			}
		} else {
			send = response.body;
		}
	}

	for (let remove of remove_html_headers) response_headers.delete(remove);

	if (response_headers.has('refresh')) {
		response_headers.set(
			'refresh',
			server.tomp.html.wrap_http_refresh(response_headers.get('refresh'), url)
		);
	}

	return new Response(send, {
		headers: response_headers,
		status: response.status,
		statusText: response.statusText,
	});
}

async function sendForm(server, server_request, field) {
	const headers = new Headers();

	if (server_request.method === 'POST') {
		const { gd_error, url } = await get_data(server, server_request, field);
		if (gd_error) return gd_error;

		headers.set('location', server.tomp.html.serve(url, url));

		return new Response(undefined, {
			headers,
			status: 307,
		});
	}

	const search_ind = field.indexOf('?');

	if (search_ind === -1) {
		const { gd_error, url } = await get_data(server, server_request, field);
		if (gd_error) return gd_error;

		headers.set('location', server.tomp.html.serve(url, url));
	} else {
		const search = field.slice(search_ind);
		field = field.slice(0, search_ind);

		const { gd_error, url } = await get_data(server, server_request, field);
		if (gd_error) return gd_error;

		const orig_search_ind = url.path.indexOf('?');

		url.path =
			url.path.slice(0, orig_search_ind == -1 ? url.length : orig_search_ind) +
			search;
		headers.set('location', server.tomp.html.serve(url, url));
	}

	// https://stackoverflow.com/questions/14935090/how-to-preserve-request-body-on-performing-http-redirect-from-servlet-filter
	return new Response(undefined, {
		headers,
		status: 307,
	});
}

async function process(server, server_request, field) {
	let [service, url] = field.split(':');
	url = decodeURIComponent(url);
	service = decodeURIComponent(service);

	if (!(service in server.tomp)) {
		return new Response(undefined, {
			sttus: 400,
		});
	}

	return new Response(undefined, {
		headers: {
			location: server.tomp[service].serve(url, url),
		},
		status: 307,
	});
}

export default async function register(server) {
	new APIServer('cookie', server, server.cookie);
	new APIServer('storage', server, server.storage);
	server.routes.set('process', process);
	server.routes.set('binary', sendBinary);
	server.routes.set('form', sendForm);
	server.routes.set('html', sendHTML);
	server.routes.set('svg', sendSVG);
	server.routes.set('js', sendJS);
	server.routes.set('wjs', sendWJS);
	server.routes.set('css', sendCSS);
	server.routes.set('manifest', sendManifest);
}
