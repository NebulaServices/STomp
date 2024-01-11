import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import {
	wrap_function,
	Reflect,
	getOwnPropertyDescriptors,
	defineProperties,
	context_this,
} from '../rewriteUtil.js';

export default class LocationRewrite extends Rewrite {
	description = {};
	global_description = {};
	global_description_document = {};
	work() {
		if (this.client.type == 'page') this.work_page();
		else this.work_worker();
	}
	work_worker() {
		this.global = global.location;
		this.proxy = {};

		Reflect.setPrototypeOf(
			this.global,
			defineProperties({}, getOwnPropertyDescriptors(WorkerLocation.prototype))
		);
		Reflect.setPrototypeOf(this.proxy, WorkerLocation.prototype);

		const scope_location = Reflect.getOwnPropertyDescriptor(
			WorkerGlobalScope.prototype,
			'location'
		);

		Reflect.defineProperty(WorkerGlobalScope.prototype, 'location', {
			configurable: true,
			enumerable: true,
			get: wrap_function(scope_location.get, (target, that, args) => {
				if (context_this(that) !== global)
					throw new TypeError('Illegal Invocation');
				return this.proxy;
			}),
		});

		for (let prop of [
			'href',
			'host',
			'hostname',
			'protocol',
			'port',
			'pathname',
			'origin',
			'hash',
			'search',
		]) {
			const desc = Reflect.getOwnPropertyDescriptor(
				WorkerLocation.prototype,
				prop
			);

			Reflect.defineProperty(WorkerLocation.prototype, prop, {
				configurable: true,
				enumerable: true,
				get: desc.get
					? wrap_function(desc.get, (target, that, args) => {
							if (that !== this.proxy)
								throw new TypeError('Illegal Invocation');
							return this.page_urlo[prop];
					  })
					: undefined,
				set: desc.set
					? wrap_function(desc.set, (target, that, [value]) => {
							if (that !== this.proxy)
								throw new TypeError('Illegal Invocation');
							const urlo = this.page_urlo;
							urlo[prop] = value;
							this.global.href = this.client.tomp.html.serve(
								urlo,
								this.client.base
							);
							return value;
					  })
					: undefined,
			});
		}

		const toString = Reflect.getOwnPropertyDescriptor(
			WorkerLocation.prototype,
			'toString'
		);

		Reflect.defineProperty(WorkerLocation.prototype, 'toString', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(toString.value, (target, that, args) => {
				if (that !== this.proxy) throw new TypeError('Invalid invocation');
				return this.page_url.toString();
			}),
		});
	}
	work_page() {
		this.global = global.location;

		{
			const location = Reflect.getOwnPropertyDescriptor(global, 'location');

			this.global_description = location;

			this.description = {
				configurable: false,
				enumerable: true,
				get: wrap_function(location.get, (target, that, args) => {
					if (context_this(that) !== global) {
						throw new TypeError('Illegal invocation');
					}

					return this.proxy;
				}),
				set: wrap_function(location.set, (target, that, [value]) => {
					if (context_this(that) !== global) {
						throw new TypeError('Illegal invocation');
					}

					value = new URL(value, this.client.base);
					value = this.client.tomp.html.serve(value, this.client.base);
					return Reflect.apply(target, that, [value]);
				}),
			};
		}

		{
			const location = Reflect.getOwnPropertyDescriptor(
				global.document,
				'location'
			);

			this.global_description_document = location;

			this.description_document = {
				configurable: false,
				enumerable: true,
				get: wrap_function(location.get, (target, that, args) => {
					if (that !== document) {
						throw new TypeError('Illegal invocation');
					}

					return this.proxy;
				}),
				set: wrap_function(location.set, (target, that, [value]) => {
					if (that !== document) {
						throw new TypeError('Illegal invocation');
					}

					value = new URL(value, this.client.base);
					value = this.client.tomp.html.serve(value, this.client.base);
					return Reflect.apply(target, that, [value]);
				}),
			};
		}

		this.proxy = {};
		Reflect.setPrototypeOf(this.proxy, Location.prototype);

		for (let prop of [
			'host',
			'hostname',
			'protocol',
			'port',
			'pathname',
			'origin',
			'hash',
			'search',
		]) {
			const desc = Reflect.getOwnPropertyDescriptor(this.global, prop);

			Reflect.defineProperty(this.proxy, prop, {
				configurable: false,
				enumerable: true,
				get: desc.get
					? wrap_function(desc.get, (target, that, args) => {
							if (that !== this.proxy)
								throw new TypeError('Invalid invocation');
							return this.page_urlo[prop];
					  })
					: undefined,
				set: desc.set
					? wrap_function(desc.set, (target, that, [value]) => {
							if (that !== this.proxy)
								throw new TypeError('Invalid invocation');
							const urlo = this.page_urlo;
							urlo[prop] = value;
							this.global.href = this.client.tomp.html.serve(
								urlo,
								this.client.base
							);
							return value;
					  })
					: undefined,
			});
		}

		const { href, ancestorOrigins } = getOwnPropertyDescriptors(this.global);

		Reflect.defineProperty(this.proxy, 'toString', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(this.global.toString, (target, that, args) => {
				if (that !== this.proxy) {
					throw new TypeError('Invalid invocation');
				}

				return this.page_url.toString();
			}),
		});

		Reflect.defineProperty(this.proxy, 'href', {
			configurable: false,
			enumerable: true,
			get: wrap_function(href.get, (target, that, args) => {
				return this.page_url.toString();
			}),
			set: wrap_function(href.set, (target, that, [value]) => {
				value = new URL(value, this.client.base);
				value = this.client.tomp.html.serve(value, this.client.base);
				this.global.href = value;
				return value;
			}),
		});

		Reflect.defineProperty(this.proxy, 'assign', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(this.global.assign, (target, that, [url]) => {
				if (that !== this.proxy) {
					throw new TypeError('Invalid invocation');
				}

				this.global.assign(
					this.client.tomp.html.serve(
						new URL(url, this.page_url),
						this.client.base
					)
				);
			}),
		});

		Reflect.defineProperty(this.proxy, 'replace', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(this.global.replace, (target, that, [url]) => {
				if (that !== this.proxy) {
					throw new TypeError('Invalid invocation');
				}

				this.global.replace(
					this.client.tomp.html.serve(
						new URL(url, this.page_url),
						this.client.base
					)
				);
			}),
		});

		Reflect.defineProperty(this.proxy, 'reload', {
			configurable: false,
			enumerable: true,
			writable: false,
			value: wrap_function(this.global.reload, (target, that, args) => {
				if (that !== this.proxy) {
					throw new TypeError('Invalid invocation');
				}

				this.global.reload();
			}),
		});

		if (ancestorOrigins) {
			Reflect.defineProperty(this.proxy, 'ancestorOrigins', {
				configurable: false,
				enumerable: true,
				get: wrap_function(ancestorOrigins.get, (target, that, args) => {
					if (that !== this.proxy) {
						throw new TypeError('Invalid invocation');
					}

					// should have no items
					return this.global.ancestorOrigins;
				}),
			});
		}
	}
	get page_url() {
		if (this.global.href === 'about:blank') {
			return 'about:blank';
		} else {
			return this.client.tomp.url.unwrap_ez(this.global.href);
		}
	}
	get page_urlo() {
		return new URL(this.page_url);
	}
}
