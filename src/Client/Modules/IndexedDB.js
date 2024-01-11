import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import {
	getOwnPropertyDescriptors,
	Reflect,
	wrap_function,
} from '../rewriteUtil.js';

export default class IDBRewrite extends Rewrite {
	work() {
		global.IDBFactory.prototype.open = wrap_function(
			global.IDBFactory.prototype.open,
			(target, that, [name, version]) => {
				return Reflect.apply(target, that, [
					`${name}@${this.client.base.toOrigin()}`,
				]);
			}
		);

		const { name } = getOwnPropertyDescriptors(IDBDatabase.prototype);

		Reflect.defineProperty(IDBDatabase.prototype, 'name', {
			get: wrap_function(name.get, (target, that, args) => {
				let name = Reflect.apply(target, that, args);

				name = name.slice(0, name.lastIndexOf('@'));

				return name;
			}),
		});
	}
}
