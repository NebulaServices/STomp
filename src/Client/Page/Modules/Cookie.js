import Rewrite from '../../Rewrite.js';
import { Reflect, wrap_function } from '../../rewriteUtil.js';

const decoder = new TextDecoder();

export default class CookieRewrite extends Rewrite {
	global_descriptor = Reflect.getOwnPropertyDescriptor(
		Document.prototype,
		'cookie'
	);
	get value() {
		return Reflect.apply(this.global_descriptor.get, document, []);
	}
	set value(value) {
		return Reflect.apply(this.global_descriptor.set, document, [value]);
	}
	work() {
		Reflect.defineProperty(Document.prototype, 'cookie', {
			configurable: true,
			enumerable: true,
			get: wrap_function(this.global_descriptor.get, (target, that, args) => {
				if (that !== document) {
					throw new TypeError('Illegal invocation');
				}

				return this.client.sync_api('cookie', 'get_string', [this.client.base]);
			}),
			set: wrap_function(
				this.global_descriptor.set,
				(target, that, [value]) => {
					if (that !== document) {
						throw new TypeError('Illegal invocation');
					}

					return this.client.sync_api('cookie', 'set', [
						this.client.base,
						value,
					]);
				}
			),
		});
	}
}
