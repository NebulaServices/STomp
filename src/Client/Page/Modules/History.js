import Rewrite from '../../Rewrite.js';
import global from '../../../global.js';
import { Reflect, wrap_function } from '../../rewriteUtil.js';

export default class HistoryRewrite extends Rewrite {
	global = global.history;
	handler(target, that, args) {
		// workaround
		// todo: store signatures for every wrap_function
		if (
			that === undefined ||
			that === null ||
			String(that) !== '[object History]'
		) {
			throw new TypeError('Illegal invocation');
		}

		if (args.length < 2) {
			throw new TypeError(
				`Failed to execute '${target.name}' on 'History': 2 arguments required, but only ${args.length} present.`
			);
		}

		let [data, title, url] = args;

		if (url !== undefined) {
			url = new URL(url, this.client.base);
			url = this.client.tomp.url.parse_url(url);

			if (url.toOrigin() !== this.client.base.toOrigin()) {
				throw new TypeError(
					`Failed to execute '${
						target.name
					}' on 'History': A history state object with URL '${url.toOrigin()}' cannot be created in a document with origin '${this.client.base.toOrigin()}' and URL '${this.client.base.toString()}'.`
				);
			}

			url = this.client.tomp.html.serve(
				new URL(url, this.client.base),
				this.client.base
			);
		}

		return Reflect.apply(target, that, [data, title, url]);
	}
	work() {
		History.prototype.pushState = wrap_function(
			History.prototype.pushState,
			this.handler.bind(this)
		);
		History.prototype.replaceState = wrap_function(
			History.prototype.replaceState,
			this.handler.bind(this)
		);
	}
}
