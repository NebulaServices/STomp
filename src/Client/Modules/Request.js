import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import { wrap_function, Reflect, context_this } from '../rewriteUtil.js';

export default class RequestRewrite extends Rewrite {
	response_url = new WeakMap();
	request_urls = new WeakMap();
	eventsource_urls = new WeakMap();
	global_fetch = global.fetch;
	global = global.Request;
	work() {
		{
			const url = Reflect.getOwnPropertyDescriptor(
				global.EventSource.prototype,
				'url'
			);

			Reflect.defineProperty(global.EventSource.prototype, 'url', {
				configurable: true,
				enumerable: true,
				get: wrap_function(url.get, (target, that, args) => {
					if (this.eventsource_urls.has(that)) {
						return this.eventsource_urls.get(that);
					} else {
						return Reflect.apply(target, that, args);
					}
				}),
			});
		}

		global.URL.createObjectURL = wrap_function(
			global.URL.createObjectURL,
			(target, that, args) => {
				let url = Reflect.apply(target, that, args);
				url = url.replace(this.client.tomp.origin, this.client.base.toOrigin());
				return url;
			}
		);

		global.URL.revokeObjectURL = wrap_function(
			global.URL.revokeObjectURL,
			(target, that, args) => {
				if (args.length < 1) {
					throw new TypeError(
						`Failed to execute 'revokeObjectURL' on 'URL': 1 argument required, but only ${args.length} present.`
					);
				}

				let [url] = args;
				url = String(url);
				url = url.replace(this.client.base.toOrigin(), this.client.tomp.origin);
				Reflect.apply(target, that, [url]);
			}
		);

		global.EventSource = wrap_function(
			global.EventSource,
			(target, that, [url]) => {
				url = new URL(input, this.client.base);

				const result = Reflect.construct(
					target,
					[this.client.tomp.binary.serve(url, this.client.base)],
					that
				);
				this.eventsource_urls.set(result, url.href);

				return result;
			},
			true
		);

		const desc_url = Reflect.getOwnPropertyDescriptor(
			Response.prototype,
			'url'
		);

		global.fetch = wrap_function(
			global.fetch,
			(target, that, [input, init]) => {
				if (context_this(that) !== global) {
					throw new TypeError('Illegal invocation');
				}

				if (!this.request_urls.has(input)) {
					input = this.client.tomp.binary.serve(
						new URL(input, this.client.base),
						this.client.base
					);

					if (typeof init == 'object' && init != undefined) {
						init = { ...init };

						if (
							init.headers != undefined &&
							!(init.headers instanceof Headers)
						) {
							// preserve header capitalization for http/1 and http/1.1
							init.headers = {
								...init.headers,
								'x-tomp-impl-names': JSON.stringify(
									Reflect.ownKeys(init.headers)
								),
							};
						}
					}
				}

				const promise = Reflect.apply(target, that, [input, init]);

				return new Promise((resolve, reject) => {
					promise.then((response) => {
						this.response_url.set(
							response,
							this.client.tomp.url
								.unwrap_ez(desc_url.get.call(response))
								.toString()
						);
						resolve(response);
					});

					promise.catch((error) => {
						reject(error);
					});
				});
			}
		);

		Reflect.defineProperty(Response.prototype, 'url', {
			get: wrap_function(desc_url.get, (target, that, args) => {
				if (this.response_url.has(that)) {
					return this.response_url.get(that);
				} else {
					return Reflect.apply(target, that, args);
				}
			}),
		});

		global.Request = wrap_function(
			global.Request,
			(target, that, args, new_target) => {
				if (args.length === 0) {
					throw new DOMException(
						`Failed to construct 'Request': 1 argument required, but only 0 present.`
					);
				}

				let [url, init] = args;

				url = new URL(url, this.client.base);

				const result = Reflect.construct(
					target,
					[this.client.tomp.binary.serve(url), init],
					new_target
				);

				this.request_urls.set(result, url.toString());

				return result;
			},
			true
		);

		{
			const url = Reflect.getOwnPropertyDescriptor(
				this.global.prototype,
				'url'
			);

			Reflect.defineProperty(this.global.prototype, 'url', {
				configurable: true,
				enumerable: true,
				get: wrap_function(url.get, (target, that, args) => {
					if (!this.request_urls.has(that)) {
						return Reflect.apply(target, that, args);
					}

					return this.request_urls.get(that);
				}),
			});
		}

		return Request;
	}
}
