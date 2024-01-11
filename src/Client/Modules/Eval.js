import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import { Reflect, wrap_function } from '../rewriteUtil.js';

export default class EvalRewrite extends Rewrite {
	global_description = Reflect.getOwnPropertyDescriptor(global, 'eval');
	global = global.eval;
	eval_global_proxy = wrap_function(this.global, (target, that, [code]) =>
		this.eval_global(code)
	);
	eval_global(x) {
		x = String(x);
		return this.global(this.tomp.js.wrap(x, this.client.base));
	}
	eval_scope(func, code, ...args) {
		code = String(code);
		if (func == this.global) {
			return [this.tomp.js.wrap(code, this.client.base)];
		} else {
			// call as if it were eval(the, args, to, non js eval)
			return [code, ...args];
		}
	}
	description = {
		configurable: true,
		enumerable: false,
		value: this.eval_global_proxy,
		writable: true,
	};
	work() {
		// expose to global
		this.client.eval = this;
	}
}
