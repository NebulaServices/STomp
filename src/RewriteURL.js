// WIP
export const protocols_slashes = [
	'http:',
	'https:',
	'blob:http:',
	'blob:https:',
];
export const protocols = ['http:', 'https:', 'blob:http:', 'blob:https:'];
export const default_ports = [80, 443, 80, 443];

export class ParsedRewrittenURL {
	protocol = '';
	host = '';
	port = '';
	path = '';
	constructor({ protocol, host, port, path }) {
		if (typeof protocol === 'string') {
			this.protocol = protocol;
		}

		if (typeof host === 'string') {
			this.host = host;
		}

		if (typeof port === 'number') {
			this.port = port;
		}

		if (typeof path === 'string') {
			this.path = path;
		}

		if (this.toOrigin() === 'http://:0') {
			console.trace(this, 'was http://:0');
			debugger;
		}
	}
	get port_string() {
		if (
			protocols_slashes.includes(this.protocol) &&
			default_ports.includes(this.port)
		) {
			return '';
		} else {
			return `:${this.port}`;
		}
	}
	get slash() {
		if (protocols_slashes.includes(this.protocol)) {
			return '//';
		} else {
			return '';
		}
	}
	toString() {
		return this.toOrigin() + this.path;
	}
	toOrigin() {
		return `${this.protocol}${this.slash}${this.host}${this.port_string}`;
	}
}

export default class RewriteURL {
	constructor(tomp) {
		this.tomp = tomp;
	}
	parse_url(url) {
		url = String(url);

		const blob = url.startsWith('blob:');
		if (blob) url = url.slice(5);

		const created = new URL(url);

		const obj = {
			host: created.hostname,
			path: created.pathname + created.search,
			port: parseInt(created.port),
			protocol: created.protocol,
		};

		if (isNaN(obj.port)) {
			obj.port = default_ports[protocols.indexOf(obj.protocol)];
		}

		if (blob) {
			obj.protocol = 'blob:' + obj.protocol;
		}

		return new ParsedRewrittenURL(obj);
	}
	wrap(url, service) {
		url = String(url);
		const input_url = url;

		let hash = '';

		{
			const index = url.indexOf('#');

			if (index !== -1) {
				hash = url.slice(index);
				url = url.slice(0, index);
			}
		}

		url = this.parse_url(url);

		const protoi = protocols.indexOf(url.protocol);

		// android-app, ios-app, mailto, many other non-browser protocols
		if (protoi === -1) {
			return input_url;
		}

		// throw new RangeError(`Unsupported protocol '${url.protocol}'`);

		const field =
			((url.port << 4) + protoi).toString(16) +
			':' +
			this.tomp.wrap(url.path) +
			hash;

		return (
			this.tomp.directory +
			service +
			':' +
			this.tomp.wrap(url.host) +
			':' +
			field
		);
	}
	// only called in send.js get_data
	unwrap(field) {
		field = String(field);

		const hosti = field.indexOf(':');
		const host = this.tomp.unwrap(field.slice(0, hosti));

		const metai = field.indexOf(':', hosti + 1);

		const meta = parseInt(field.slice(hosti + 1, metai), 16);

		const port = meta >> 4;
		const protocol = protocols[meta & 0xf];

		const path = this.tomp.unwrap(field.slice(metai + 1));

		return new ParsedRewrittenURL({
			protocol,
			path,
			port,
			host,
		});
	}
	get_attributes(url) {
		url = String(url);

		const path = url.slice(this.tomp.directory.length);

		const si = path.indexOf(':');

		const result = {
			service: si == -1 ? path : path.slice(0, si),
			field: si == -1 ? '' : path.slice(si + 1),
		};

		return result;
	}
	unwrap_ez(url) {
		url = String(url);

		if (url.startsWith('data:')) {
			return new ParsedRewrittenURL({
				protocol: 'data:',
				path: url.slice(5),
			});
		}

		// cut all characters before the prefix, get the field, unwrap
		const cut = url.slice(url.indexOf(this.tomp.directory));
		const { field } = this.get_attributes(cut);

		return this.unwrap(field);
	}
}
