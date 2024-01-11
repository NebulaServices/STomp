import global from '../global.js';

export const function_strings = new Map();

export const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;

export const defineProperties = Object.defineProperties;

export const Proxy = global.Proxy;

// reflect functions may be updated during runtime
export const Reflect = {
	apply: global.Reflect.apply.bind(global.Reflect),
	construct: global.Reflect.construct.bind(global.Reflect),
	defineProperty: global.Reflect.defineProperty.bind(global.Reflect),
	deleteProperty: global.Reflect.deleteProperty.bind(global.Reflect),
	get: global.Reflect.get.bind(global.Reflect),
	getOwnPropertyDescriptor: global.Reflect.getOwnPropertyDescriptor.bind(
		global.Reflect
	),
	getPrototypeOf: global.Reflect.getPrototypeOf.bind(global.Reflect),
	isExtensible: global.Reflect.isExtensible.bind(global.Reflect),
	ownKeys: global.Reflect.ownKeys.bind(global.Reflect),
	preventExtensions: global.Reflect.preventExtensions.bind(global.Reflect),
	set: global.Reflect.set.bind(global.Reflect),
	setPrototypeOf: global.Reflect.setPrototypeOf.bind(global.Reflect),
};

const { hasOwnProperty: hasOwnProperty_ } = Object.prototype;

export function hasOwnProperty(object, key) {
	try {
		return Reflect.apply(hasOwnProperty_, object, [key]);
	} catch (err) {
		return false;
	}
	// return Reflect.ownKeys(object).includes(key);
}

export function mirror_attributes(from, to) {
	function_strings.set(to, from.toString());
	Reflect.defineProperty(
		to,
		'length',
		Reflect.getOwnPropertyDescriptor(from, 'length')
	);
	Reflect.defineProperty(
		to,
		'name',
		Reflect.getOwnPropertyDescriptor(from, 'name')
	);
	return to;
}

export function wrap_function(fn, wrap, construct) {
	if (typeof fn !== 'function')
		throw new TypeError(
			`First argument to wrap_function(fn, wrap, construct) was not a function.`
		);

	const name = fn.name;

	const wrapped =
		'prototype' in fn
			? function attach(...args) {
					let new_target = new.target;

					if (construct) {
						if (new.target === undefined) {
							// should throw an error if fn was a class
							fn();
						} else if (new.target === wrapped) {
							new_target = fn;
							Reflect.setPrototypeOf(this, fn.prototype);
							this.constructor = fn;
						}
					}

					return wrap(fn, this, args, new_target);
			  }
			: {
					attach(...args) {
						if (construct && new.target === undefined) {
							// should throw an error if fn was a class
							fn();
						}

						return wrap(fn, this, args);
					},
			  }['attach'];

	mirror_attributes(fn, wrapped);

	if (construct) {
		wrapped.prototype = fn.prototype;
		wrapped.prototype.constructor = wrapped;
	}

	return wrapped;
}

export const native_proxies = new WeakMap();

export function resolve_native(proxy /*?*/) {
	if (native_proxies.has(proxy)) return native_proxies.get(proxy);
	else return proxy;
}

function pick_target(first, second, prop) {
	if (prop in first) {
		return first;
	}

	return second;
}

export function proxy_multitarget(first, second) {
	return {
		get(_, prop, receiver) {
			return Reflect.get(pick_target(first, second, prop), prop, receiver);
		},
		set(_, prop, value) {
			return Reflect.set(pick_target(first, second, prop), prop, value);
		},
		has(_, prop) {
			return Reflect.has(pick_target(first, second, prop), prop);
		},
		getOwnPropertyDescriptor(_, prop) {
			const desc = Reflect.getOwnPropertyDescriptor(
				pick_target(first, second, prop),
				prop
			);
			Reflect.defineProperty(_, prop, desc);
			return desc;
		},
		defineProperty(_, prop, desc) {
			Reflect.defineProperty(_, prop, desc);
			return Reflect.defineProperty(
				pick_target(first, second, prop),
				prop,
				desc
			);
		},
		deleteProperty(_, prop, descriptor) {
			return Reflect.deleteProperty(
				pick_target(first, second, prop),
				prop,
				descriptor
			);
		},
	};
}

export function bind_natives(target) {
	for (let prop in target) {
		const desc = Reflect.getOwnPropertyDescriptor(target, prop);

		if (!desc?.configurable) continue;

		let changed = false;

		if (typeof desc.value === 'function') {
			desc.value = wrap_function(desc.value, (target, that, args) => {
				return Reflect.apply(target, resolve_native(that), args);
			});

			changed = true;
		}

		if (typeof desc.get === 'function') {
			desc.get = wrap_function(desc.get, (target, that, args) => {
				return Reflect.apply(target, resolve_native(that), args);
			});

			changed = true;
		}

		if (typeof desc.set === 'function') {
			desc.set = wrap_function(desc.set, (target, that, args) => {
				return Reflect.apply(target, resolve_native(that), args);
			});

			changed = true;
		}

		if (changed) {
			Reflect.defineProperty(target, prop, desc);
		}
	}
}

// calling window.fetch as fetch
export function context_this(that) {
	if (that === undefined || that === null) {
		return global;
	} else {
		return that;
	}
}

export function test_args(target, args, length, class_name) {
	if (args.length < length) {
		throw new TypeError(
			`Failed to execute '${target.name}' on '${class_name}': ${length} arguments required, but only ${args.length} present.`
		);
	}
}
