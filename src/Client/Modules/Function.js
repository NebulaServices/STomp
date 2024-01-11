import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import {
	wrap_function,
	function_strings,
	mirror_attributes,
	Reflect,
} from '../rewriteUtil.js';
import NativeHelper from './NativeHelper.js';

const is_class = /^class[{ ]/;
const is_not_member = /=>|^((async\s+)?(\(|function[( ]))/;

export default class FunctionRewrite extends Rewrite {
	global = global.Function;
	global_async = (async (_) => _).constructor;
	work() {
		const that = this;

		this.global.prototype.toString = wrap_function(
			this.global.prototype.toString,
			(target, that, args) => {
				if (function_strings.has(that)) return function_strings.get(that);
				else {
					let string = Reflect.apply(target, that, args);

					if (!this.client.get(NativeHelper).is_native(string)) {
						if (is_class.test(string)) {
							string = this.client.tomp.js.unwrap(
								`x = ${string}`,
								this.client.base
							);
							string = string.slice(string.indexOf('=') + 1);
							if (string.startsWith(' ')) {
								string = string.slice(1);
							}

							if (string.endsWith(';')) {
								string = string.slice(0, -1);
							}
						} else {
							let left = 0;
							let right;

							if (!is_not_member.test(string)) {
								// (){kind of function}
								left = 1;
								right = -1;
								string = `{${string}}`;
							}

							string = this.client.tomp.js.unwrap(
								`x = ${string}`,
								this.client.base
							);

							string = string.slice(string.indexOf('=') + 1);

							if (string.startsWith(' ')) {
								string = string.slice(1);
							}

							if (string.endsWith(';')) {
								string = string.slice(0, -1);
							}

							string = string.slice(left, right);
						}
					}

					return string;
				}
			}
		);

		function NewFunction(...args) {
			if (args.length !== 0) {
				let [code] = args.splice(-1, 1);
				code = that.client.tomp.js.wrap(code, that.client.base);
				args.push(code);
			}

			return new that.global(...args);
		}

		function NewAsyncFunction(...args) {
			if (args.length !== 0) {
				let code = args.splice(-1, 1);
				code = that.client.tomp.js.wrap(code, that.client.base);
				args.push(code);
			}

			return new that.global_async(...args);
		}

		mirror_attributes(this.global, NewFunction);
		mirror_attributes(this.global, NewFunction);

		NewFunction.prototype = this.global.prototype;
		NewAsyncFunction.prototype = this.global_async.prototype;

		this.proxy = NewFunction;
		this.proxy_async = NewAsyncFunction;

		Reflect.defineProperty(this.global.prototype, 'constructor', {
			configurable: true,
			enumerable: false,
			writable: true,
			value: this.proxy,
		});

		Reflect.defineProperty(this.global_async.prototype, 'constructor', {
			configurable: true,
			enumerable: false,
			writable: true,
			value: this.proxy_async,
		});

		this.global.prototype.constructor = this.proxy;
		this.global_async.prototype.constructor = this.proxy_async;

		global.Function = this.proxy;
	}
}
