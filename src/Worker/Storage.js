import { openDB } from 'idb';
import { ParsedRewrittenURL } from '../RewriteURL.js';

export default class Storage {
	#open;
	constructor(server) {
		this.server = server;

		this.#open = this.#open_db();
	}
	async #open_db() {
		this.db = await openDB('storage', 1, {
			upgrade(db, old_version, new_version, transaction) {
				const localStorage = db.createObjectStore('localStorage', {
					keyPath: 'id',
				});

				localStorage.createIndex('origin', 'origin');
				localStorage.createIndex('id', 'id');

				const sessionStorage = db.createObjectStore('sessionStorage', {
					keyPath: 'id',
				});

				sessionStorage.createIndex('origin', 'origin');
				sessionStorage.createIndex('id', 'id');
			},
		});

		await this.db.clear('sessionStorage');
	}
	get_id(name, remote) {
		return `${remote.toOrigin()}/${name}`;
	}
	get_db_name(session) {
		return session ? 'sessionStorage' : 'localStorage';
	}
	async getItem(session, name, remote) {
		await this.#open;

		remote = new ParsedRewrittenURL(remote);
		const data = await this.db.getFromIndex(
			this.get_db_name(session),
			'id',
			this.get_id(name, remote)
		);

		if (data) {
			return data.value;
		} else {
			return null;
		}
	}
	async setItem(session, name, value, remote) {
		await this.#open;
		remote = new ParsedRewrittenURL(remote);
		await this.db.put(this.get_db_name(session), {
			name,
			value,
			origin: remote.toOrigin(),
			id: this.get_id(name, remote),
		});
	}
	async removeItem(session, name, remote) {
		await this.#open;
		remote = new ParsedRewrittenURL(remote);
		await this.db.delete(this.get_db_name(session), this.get_id(name, remote));
	}
	async hasItem(session, name, remote) {
		await this.#open;
		remote = new ParsedRewrittenURL(remote);
		const data = await this.db.getFromIndex(
			this.get_db_name(session),
			'id',
			this.get_id(name, remote)
		);
		return data !== undefined;
	}
	async getKeys(session, remote) {
		await this.#open;
		remote = new ParsedRewrittenURL(remote);
		const tx = this.db.transaction(this.get_db_name(session));
		const index = tx.store.index('origin');
		const all = await index.getAll(IDBKeyRange.only(remote.toOrigin()));
		const result = [];

		for (let { name } of all) {
			result.push(name);
		}

		return result;
	}
	async clear(session, remote) {
		await this.#open;
		remote = new ParsedRewrittenURL(remote);
		const tx = this.db.transaction(this.get_db_name(session), 'readwrite');
		const index = tx.store.index('origin');

		for await (const cursor of index.iterate(
			IDBKeyRange.only(remote.toOrigin())
		)) {
			cursor.delete();
		}
	}
	async length(session, remote) {
		await this.#open;
		remote = new ParsedRewrittenURL(remote);
		return (await this.getKeys(session, remote)).length;
	}
	async key(session, index, remote) {
		await this.#open;
		remote = new ParsedRewrittenURL(remote);
		return (await this.getKeys(session, remote))[index];
	}
}
