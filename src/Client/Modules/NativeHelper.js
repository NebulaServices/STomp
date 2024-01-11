import Rewrite from '../Rewrite.js';
import { isIdentifierChar, isIdentifierStart } from 'acorn';

export default class NativeHelper extends Rewrite {
	work() {
		this.calculate();
	}
	calculate() {
		const specimen = Object.toString();
		const name = 'Object';
		const occurs = specimen.indexOf(name);
		this.left = specimen.slice(0, occurs);
		this.right = specimen.slice(occurs + name.length);
	}
	valid_identifier(string) {
		/* astral = ecmaVersion >= 6 */
		for (let i = 0; i < string.length; i++) {
			if (i == 0 && !isIdentifierStart(string.charCodeAt(0), true))
				return false;

			if (!isIdentifierChar(string.charCodeAt(i), true)) return false;
		}

		return true;
	}
	is_native(string) {
		if (!string.startsWith(this.left)) return false;
		const right = string.indexOf(this.right);
		let name = string.slice(this.left.length, right);
		if (name.startsWith('get ') || name.startsWith('set '))
			name = name.slice(4);
		if (!this.valid_identifier(name)) return false;
		return true;
	}
}
