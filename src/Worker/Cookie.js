/* refer to:
CREATE TABLE cookies(
	creation_utc INTEGER NOT NULL,
	top_frame_site_key TEXT NOT NULL,
	host_key TEXT NOT NULL,
	name TEXT NOT NULL,
	value TEXT NOT NULL,
	encrypted_value BLOB DEFAULT '',
	path TEXT NOT NULL,
	expires_utc INTEGER NOT NULL,
	is_secure INTEGER NOT NULL,
	is_httponly INTEGER NOT NULL,
	last_access_utc INTEGER NOT NULL,
	has_expires INTEGER NOT NULL DEFAULT 1,
	is_persistent INTEGER NOT NULL DEFAULT 1,
	priority INTEGER NOT NULL DEFAULT 1,
	samesite INTEGER NOT NULL DEFAULT -1,
	source_scheme INTEGER NOT NULL DEFAULT 0,
	source_port INTEGER NOT NULL DEFAULT -1,
	is_same_party INTEGER NOT NULL DEFAULT 0,
	UNIQUE (top_frame_site_key, host_key, name, path)
)
*/

import { openDB } from 'idb';
import setcookie_parser from 'set-cookie-parser';

const samesites = ['lax', 'strict', 'none'];
const cookie_keys = [
	'domain',
	'path',
	'httpOnly',
	'sameSite',
	'secure',
	'expires',
	'maxAge',
	'name',
	'value',
];

class BrowserCookieArray extends Array {
	toString() {
		const result = [];

		for (let cookie of this) {
			result.push(`${cookie.name}=${cookie.value}`);
		}

		return result.join('; ');
	}
}

export default class Cookie {
	#open;
	constructor(server) {
		this.server = server;

		this.#open = this.#open_db();
	}
	async #open_db() {
		this.db = await openDB('cookies', 1, {
			upgrade(db, old_version, new_version, transaction) {
				const cookies = db.createObjectStore('cookies', {
					keyPath: 'id',
				});

				cookies.createIndex('path', 'path');
			},
		});

		// const entries = await server.db.getAllFromIndex('cookies', 'path', idb_range_startswith(get_directory(remote.path)));
		for (let cookie of await this.db.getAll('cookies')) {
			if (this.cookie_expired(cookie)) {
				this.db.delete('cookies', cookie.id);
			}
		}
	}
	cookie_expired(cookie) {
		const now = new Date();

		if ('maxAge' in cookie) {
			return cookie.set.getTime() + cookie.maxAge * 1e3 < now;
		} else if ('expires' in cookie) {
			return cookie.expires < now;
		} else if ('session' in cookie) {
			return cookie.session !== this.server.session;
		}

		return false;
	}
	async get(remote) {
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
		// https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange

		await this.#open;

		// const entries = await server.db.getAllFromIndex('cookies', 'path', idb_range_startswith(get_directory(remote.path)));
		const entries = await this.db.getAll('cookies');

		const result = new BrowserCookieArray();

		for (let cookie of entries) {
			if (this.cookie_expired(cookie)) {
				this.db.delete('cookies', cookie.id);
			} else if (`.${remote.host}`.endsWith(cookie.domain)) {
				result.push(cookie);
			}
		}

		return result;
	}
	async get_string(remote) {
		return (await this.get(remote)).toString();
	}
	normalize_cookie(cookie, host) {
		const result = {};

		for (let key of cookie_keys) {
			if (key in cookie) {
				result[key] = cookie[key];
			}
		}

		if (!result.domain) {
			result.domain = host;
		}

		// todo: truncate cookie path at last /
		if (!result.path) {
			result.path = '/';
		}

		if (!result.httpOnly) {
			result.httpOnly = false;
		}

		if (!samesites.includes(result.sameSite?.toLowerCase())) {
			result.sameSite = 'none';
		}

		if (!result.secure) {
			result.secure = false;
		}

		return result;
	}
	async set(remote, setcookie) {
		for (let set of [].concat(setcookie)) {
			const parsed = setcookie_parser(set, {
				decodeValues: false,
				silent: true,
			});

			await this.#open;

			for (let cookie of parsed) {
				cookie = this.normalize_cookie(cookie, remote.host);

				cookie.set = new Date(Date.now());

				const id = cookie.domain + '@' + cookie.path + '@' + cookie.name;

				if (!('maxAge' in cookie) && !('expires' in cookie)) {
					cookie.session = this.server.session;
				}

				if (this.cookie_expired(cookie)) {
					this.db.delete('cookies', id);
				} else {
					this.db.put('cookies', {
						...cookie,
						id,
					});
				}
			}
		}
	}
}
