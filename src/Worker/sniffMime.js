import { get_mime } from '../RewriteElements.js';
import mime from 'mime/lite.js';

/**
 *
 * @param {import('@tomphttp/bare-client').BareResponse} response
 * @returns {string} mime
 */
export default function sniffMime(request, response) {
	if (response.cached) {
		return 'text/html';
	}

	if (response.headers.has('content-type')) {
		return get_mime(response.headers.get('content-type'));
	} else {
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
		// header "list" has only 1 directive, value can safely be compared as string
		if (response.headers.get('x-content-type-options') === 'nosniff') {
			return '';
		}

		const { pathname } = new URL(request.url);

		const last_dot = pathname.lastIndexOf('.');

		if (last_dot === -1) {
			return '';
		}

		const type = mime.getType(pathname.slice(last_dot + 1));

		if (type === null) {
			return 'application/octet-stream';
		} else {
			return type;
		}
	}
}
