import TOMP from '../TOMP.js';
import Rewrite from './Rewrite.js';
import NativeHelper from './Modules/NativeHelper.js';
import LocationRewrite from './Modules/Location.js';
import WebSocketRewrite from './Modules/WebSocket.js';
import RequestRewrite from './Modules/Request.js';
import EvalRewrite from './Modules/Eval.js';
import AccessRewrite from './Modules/Access.js';
import IDBRewrite from './Modules/IndexedDB.js';
import WorkerRewrite from './Modules/Worker.js';
import FunctionRewrite from './Modules/Function.js';
import EventRewrite from './Modules/Event.js';
import XMLHttpRequestRewrite from './Modules/XMLHttpRequest.js';
import global from '../global.js';
import { openDB } from 'idb/with-async-ittr';

export default class Client {
	type = this.constructor.type;
	constructor(config) {
		this.tomp = new TOMP(config);
		this.ready = this.async_work();

		this.load_modules(
			NativeHelper,
			FunctionRewrite,
			WebSocketRewrite,
			IDBRewrite,
			EventRewrite,
			WorkerRewrite,
			RequestRewrite,
			EvalRewrite,
			LocationRewrite,
			AccessRewrite,
			XMLHttpRequestRewrite
		);

		// this.modules.get(NativeHelper)[...]
	}
	async api(api, target, args) {
		const response = await Reflect.apply(
			this.get(RequestRewrite).global_fetch,
			global,
			this.api_fetch_opts(api, target, args)
		);
		const decoded = await response.text();

		let parsed;

		if (decoded === '') {
			parsed = undefined;
		} else {
			parsed = JSON.parse(decoded);
		}

		if (!response.ok) {
			throw parsed;
		} else {
			return parsed;
		}
	}
	api_fetch_opts(api, target, args) {
		return [
			`${this.tomp.directory}${api}:`,
			{
				headers: {
					'content-type': 'application/json',
				},
				method: 'POST',
				body: JSON.stringify({
					target,
					args,
				}),
			},
			true,
		];
	}
	/**
	 * @argument {Rewrite.constructor} Module
	 * @returns {Rewrite} module
	 */
	get(Module) {
		return this.#modules.get(Module);
	}
	#modules = new Map();
	load_modules(...Modules) {
		for (let Module of Modules) {
			this.#modules.set(Module, new Module(this));
		}
	}
	work() {
		for (let [Module, module] of this.#modules) {
			module.work();
		}
	}
	async async_work() {
		this.db = await openDB('tomp', 1, {
			upgrade: (db, oldv, newv, transaction) => {
				throw new Error(`Service worker didn't register the TOMP database.`);
			},
		});
	}
}
