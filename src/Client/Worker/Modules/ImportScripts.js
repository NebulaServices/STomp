import Rewrite from '../../Rewrite.js';
import global from '../../../global.js';
import { Reflect, wrap_function } from '../../rewriteUtil.js';

export default class ImportScriptsRewrite extends Rewrite {
	global = global.importScripts;
	work() {
		global.importScripts = wrap_function(
			this.global,
			(target, that, scripts) => {
				for (let i = 0; i < scripts.length; i++) {
					scripts[i] = this.client.tomp.js.serve(
						new URL(scripts[i], this.client.base),
						this.client.base,
						true
					);
				}

				return Reflect.apply(target, that, scripts);
			}
		);
	}
}
