import Rewrite from '../../Rewrite.js';
import global from '../../../global.js';
import { context_this, Reflect, wrap_function } from '../../rewriteUtil.js';
import { mirror_class } from '../../NativeUtil.js';

export default class StorageRewrite extends Rewrite {
	StorageHandler = {
		get: (target, prop, receiver) => {
			if (
				typeof prop == 'symbol' ||
				prop in target ||
				prop in this.proxy.prototype
			) {
				return Reflect.get(target, prop, receiver);
			}

			let result = Reflect.apply(
				this.proxy.prototype.getItem,
				this.get_proxy(target),
				[prop]
			);

			// null
			if (typeof result !== 'string') {
				result = undefined;
			}

			return result;
		},
		set: (target, prop, value) => {
			if (
				typeof prop == 'symbol' ||
				prop in target ||
				prop in this.proxy.prototype
			) {
				return Reflect.set(target, prop, value);
			}

			Reflect.apply(this.proxy.prototype.setItem, this.get_proxy(target), [
				prop,
				value,
			]);

			return value;
		},
		getOwnPropertyDescriptor: (target, prop) => {
			if (
				typeof prop == 'symbol' ||
				prop in target ||
				prop in this.proxy.prototype
			) {
				return Reflect.getOwnPropertyDescriptor(target, prop);
			}

			/*
			configurable: true
			enumerable: true
			value: "1"
			writable: true
			*/

			let result = Reflect.apply(
				this.proxy.prototype.getItem,
				this.get_proxy(target),
				[prop]
			);

			// null
			if (typeof result !== 'string') {
				return undefined;
			}

			return {
				value: result,
				writable: true,
				enumerable: true,
				configurable: true,
			};
		},
		deleteProperty: (target, prop) => {
			if (
				typeof prop == 'symbol' ||
				prop in target ||
				prop in this.proxy.prototype
			) {
				return Reflect.deleteProperty(target, prop);
			}

			Reflect.apply(this.proxy.prototype.removeItem, this.get_proxy(target), [
				prop,
			]);

			return true;
		},
		has: (target, prop) => {
			return this.client.sync_api('storage', 'hasItem', [
				this.is_session(target),
				prop,
				this.client.base,
			]);
		},
		ownKeys: (target) => {
			const keys = this.client.sync_api('storage', 'getKeys', [
				this.is_session(target),
				this.client.base,
			]);

			return Reflect.ownKeys(target).concat(keys);
		},
	};
	get_proxy(target) {
		if (target === this.sessionStorageTarget) {
			return this.sessionStorage;
		} else if (target === this.localStorageTarget) {
			return this.localStorage;
		}
	}
	global = global.Storage;
	localStorageTarget = {};
	sessionStorageTarget = {};
	is_session(target) {
		return target === this.sessionStorageTarget;
	}
	work() {
		this.worker_storage = `${this.client.tomp.directory}storage:?`;

		const that = this;
		const instances = new WeakSet();

		class StorageProxy {
			clear() {
				that.client.sync_api('storage', 'clear', [
					that.is_session(this),
					that.client.base,
				]);
			}
			getItem(...args) {
				if (args.length < 1) {
					throw new TypeError(
						`Uncaught TypeError: Failed to execute 'getItem' on 'Storage': 1 argument required, but only ${args.length} present.`
					);
				}

				let key = [args];
				key = String(key);

				const result = that.client.sync_api('storage', 'getItem', [
					that.is_session(this),
					key,
					that.client.base,
				]);

				if (result === undefined) {
					return null;
				} else {
					return result;
				}
			}
			key(...args) {
				if (args.length < 1) {
					throw new TypeError(
						`Uncaught TypeError: Failed to execute 'key' on 'Storage': 1 argument required, but only 0 present.`
					);
				}

				let [keyNum] = args;
				keyNum = Number(keyNum);

				return that.client.sync_api('storage', 'key', [
					that.is_session(this),
					keyNum,
					that.client.base,
				]);
			}
			get length() {
				return that.client.sync_api('storage', 'length', [
					that.is_session(this),
					that.client.base,
				]);
			}
			removeItem(...args) {
				if (args.length < 1) {
					throw new TypeError(
						`Uncaught TypeError: Failed to execute 'removeItem' on 'Storage': 1 argument required, but only ${args.length} present.`
					);
				}

				let [key] = args;
				key = String(key);

				return that.client.sync_api('storage', 'removeItem', [
					that.is_session(this),
					key,
					that.client.base,
				]);
			}
			setItem(...args) {
				if (args.length < 2) {
					throw new TypeError(
						`Uncaught TypeError: Failed to execute 'setItem' on 'Storage': 2 arguments required, but only ${args.length} present.`
					);
				}

				let [key, value] = args;

				key = String(key);
				value = String(value);

				return that.client.sync_api('storage', 'setItem', [
					that.is_session(this),
					key,
					value,
					that.client.base,
				]);
			}
			constructor() {
				throw new TypeError(`Illegal constructor`);
			}
		}

		this.proxy = StorageProxy;

		Reflect.defineProperty(StorageProxy.prototype, Symbol.toStringTag, {
			configurable: true,
			enumerable: false,
			writable: false,
			value: 'Storage',
		});

		const localStorage = new Proxy(
			this.localStorageTarget,
			this.StorageHandler
		);
		const sessionStorage = new Proxy(
			this.sessionStorageTarget,
			this.StorageHandler
		);

		instances.add(localStorage);
		instances.add(sessionStorage);

		Reflect.setPrototypeOf(this.localStorageTarget, StorageProxy.prototype);
		Reflect.setPrototypeOf(this.sessionStorageTarget, StorageProxy.prototype);

		this.localStorage = localStorage;
		this.sessionStorage = sessionStorage;

		const { get: localStorage_get } = Reflect.getOwnPropertyDescriptor(
			global,
			'localStorage'
		);
		const { get: sessionStorage_get } = Reflect.getOwnPropertyDescriptor(
			global,
			'sessionStorage'
		);

		Reflect.defineProperty(global, 'localStorage', {
			get: wrap_function(localStorage_get, (target, that, args) => {
				if (context_this(that) !== global) {
					throw new TypeError('Illegal invocation');
				}

				return localStorage;
			}),
			enumerable: true,
			configurable: true,
		});

		Reflect.defineProperty(global, 'sessionStorage', {
			get: wrap_function(sessionStorage_get, (target, that, args) => {
				if (context_this(that) !== global) {
					throw new TypeError('Illegal invocation');
				}

				return sessionStorage;
			}),
			enumerable: true,
			configurable: true,
		});

		mirror_class(this.global, StorageProxy, instances);

		this.proxy = StorageProxy;
		global.Storage = StorageProxy;
	}
}
