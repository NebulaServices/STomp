import {
	getOwnPropertyDescriptors,
	mirror_attributes,
	Reflect,
	wrap_function,
} from './rewriteUtil.js';

export function TargetConstant(target, key, value) {
	const descriptor = {
		configurable: false,
		writable: false,
		enumerable: true,
		value,
	};

	Reflect.defineProperty(target, key, descriptor);
	Reflect.defineProperty(target.prototype, key, descriptor);
}

export function EventTarget_on(target, event) {
	const property = `on${event}`;
	const listeners = new WeakMap();

	Reflect.defineProperty(target, property, {
		enumerable: true,
		configurable: true,
		get() {
			if (listeners.has(this)) {
				return listeners.get(this);
			} else {
				return null;
			}
		},
		set(value) {
			if (typeof value == 'function') {
				if (listeners.has(this)) {
					this.removeEventListener(event, listeners.get(this));
				}

				listeners.set(this, value);
				this.addEventListener(event, value);
			}

			return value;
		},
	});
}

export function mirror_class(from, to, instances) {
	Reflect.defineProperty(to.prototype, Symbol.toStringTag, {
		configurable: true,
		enumerable: false,
		writable: false,
		value: from.prototype[Symbol.toStringTag],
	});

	mirror_attributes(from, to);

	const descriptors = getOwnPropertyDescriptors(to.prototype);
	const mirror_descriptors = getOwnPropertyDescriptors(from.prototype);

	for (let key in descriptors) {
		const descriptor = descriptors[key];

		const mirror_descriptor = mirror_descriptors[key];

		if (!mirror_descriptor) {
			console.warn('Key not present in global:', key);
			continue;
		}

		if (!descriptor?.configurable) continue;

		let changed = false;

		if (typeof descriptor.value == 'function') {
			mirror_descriptor.value = wrap_function(
				mirror_descriptor.value,
				(target, that, args) => {
					if (!instances.has(that)) {
						throw new TypeError('Illegal Invocation');
					}

					return Reflect.apply(descriptor.value, that, args);
				}
			);

			changed = true;
		} else if ('value' in descriptor) {
			mirror_descriptor.value = descriptor.value;
		}

		if (typeof descriptor.get == 'function') {
			mirror_descriptor.get = wrap_function(
				mirror_descriptor.get,
				(target, that, args) => {
					if (!instances.has(that)) {
						throw new TypeError('Illegal Invocation');
					}

					return Reflect.apply(descriptor.get, that, args);
				}
			);

			changed = true;
		}

		if (typeof descriptor.set == 'function') {
			mirror_descriptor.set = wrap_function(
				mirror_descriptor.set,
				(target, that, args) => {
					if (!instances.has(that)) {
						throw new TypeError('Illegal Invocation');
					}

					return Reflect.apply(descriptor.set, that, args);
				}
			);

			changed = true;
		}

		if (changed) {
			Reflect.defineProperty(to.prototype, key, mirror_descriptor);
		}
	}
}

export function DOMObjectConstructor(original) {
	function result(...args) {
		if (new.target) {
			return Reflect.construct(original, args, new.target);
		} else {
			throw new TypeError(
				`Failed to construct '${original.name}': Please use the 'new' operator, this DOM object constructor cannot be called as a function.`
			);
		}
	}

	result.prototype = original.prototype;
	result.prototype.constructor = result;

	return result;
}
