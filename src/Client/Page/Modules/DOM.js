import Rewrite from '../../Rewrite.js';
import g from '../../../global.js';
// https://github.com/webpack/webpack/issues/12960
const global = g;
import {
	bind_natives,
	getOwnPropertyDescriptors,
	native_proxies,
	Proxy,
	Reflect,
	wrap_function,
	test_args,
} from '../../rewriteUtil.js';
import {
	attribute_original,
	get_mime,
	TOMPElement,
} from '../../../RewriteElements.js';

const {
	getAttribute,
	getAttributeNS,
	setAttribute,
	setAttributeNS,
	hasAttribute,
	hasAttributeNS,
	removeAttribute,
	removeAttributeNS,
	getAttributeNames,
	getAttributeNamesNS,
} = global?.Element?.prototype || {};
const { localName } = getOwnPropertyDescriptors(
	global?.Element?.prototype || {}
);

class TOMPElementDOMAttributes {
	#node;
	constructor(node) {
		this.#node = node;
	}
	get(name) {
		return Reflect.apply(getAttribute, this.#node, [name]);
	}
	set(name, value) {
		return Reflect.apply(setAttribute, this.#node, [name, value]);
	}
	has(name) {
		return Reflect.apply(hasAttribute, this.#node, [name]);
	}
	delete(name) {
		return Reflect.apply(removeAttribute, this.#node, [name]);
	}
	*keys() {
		for (let name of Reflect.apply(getAttributeNames, this.#node, [])) {
			yield name;
		}
	}
	*values() {
		for (let name of this.keys()) {
			yield this.get(name);
		}
	}
	*entries() {
		for (let name of this.keys()) {
			yield [name, this.get(name)];
		}
	}
	[Symbol.iterator]() {
		return this.entries();
	}
}

class TOMPElementDOM extends TOMPElement {
	#node;
	constructor(node) {
		super();
		this.#node = node;
		this.is_html = this.#node instanceof HTMLElement;

		if (this.is_html) {
			this.attributes = new TOMPElementDOMAttributes(this.#node);
		} else {
			this.attributes = new Map();
		}
	}
	get type() {
		if (this.is_html) {
			return Reflect.apply(localName.get, this.#node, []);
		} else {
			return '';
		}
	}
	set type(value) {
		this.node.remove();
		const replacement = document.createElement(value);
		replacement.append(...this.node.children);

		for (let [attribute, value] of this.attributes) {
			replacement.setAttribute(attribute, value);
		}

		this.#node = replacement;
		return value;
	}
	get detached() {
		return !this.node.parentNode;
	}
	get text() {
		return this.#node.textContent;
	}
	set text(value) {
		return (this.#node.textContent = value);
	}
	detach() {
		this.#node.remove();
	}
	sync() {}
	get parent() {
		return new TOMPElementDOM(this.parentNode);
	}
}

export default class DOMRewrite extends Rewrite {
	styles = new WeakMap();
	style_proxy(style) {
		if (this.styles.has(style)) {
			return this.styles.get(style);
		}

		const proxy = new Proxy(style, {
			get: (target, prop, receiver) => {
				let result = Reflect.get(target, prop, receiver);

				if (typeof result == 'string' && prop != 'cssText') {
					result = this.client.tomp.css.unwrap(
						result,
						this.client.base,
						'value'
					);
				}

				return result;
			},
			set: (target, prop, value) => {
				if (typeof value == 'string' && prop != 'cssText') {
					value = this.client.tomp.css.wrap(value, this.client.base, 'value');
				}

				const result = Reflect.set(target, prop, value);
				return result;
			},
			getOwnPropertyDescriptor: (target, prop) => {
				const desc = Reflect.getOwnPropertyDescriptor(target, prop);

				if (
					typeof desc === 'object' &&
					desc !== null &&
					typeof desc.value == 'string'
				) {
					desc.value = this.client.tomp.css.wrap(
						desc.value,
						this.client.base,
						'value'
					);
				}

				return desc;
			},
		});

		native_proxies.set(proxy, style);
		this.styles.set(style, proxy);

		return proxy;
	}
	style_work() {
		bind_natives(CSSStyleDeclaration.prototype);

		const { cssText } = getOwnPropertyDescriptors(
			CSSStyleDeclaration.prototype
		);

		Reflect.defineProperty(CSSStyleDeclaration.prototype, 'cssText', {
			get: wrap_function(cssText.get, (target, that, args) => {
				let result = Reflect.apply(target, that, args);
				result = this.client.tomp.css.unwrap(
					result,
					this.client.base,
					'declarationList'
				);
				return result;
			}),
			set: wrap_function(cssText.set, (target, that, [value]) => {
				value = this.client.tomp.css.wrap(
					value,
					this.client.base,
					'declarationList'
				);
				const result = Reflect.apply(target, that, [value]);
				return result;
			}),
			configurable: true,
			enumerable: true,
		});

		CSSStyleDeclaration.prototype.getPropertyValue = wrap_function(
			CSSStyleDeclaration.prototype.getPropertyValue,
			(target, that, [property]) => {
				let result = Reflect.apply(target, that, [property]);
				result = this.client.tomp.css.unwrap(result, this.client.base, 'value');
				return result;
			}
		);

		CSSStyleDeclaration.prototype.setProperty = wrap_function(
			CSSStyleDeclaration.prototype.setProperty,
			(target, that, [property, value, priority]) => {
				value = this.client.tomp.css.wrap(value, this.client.base, 'value');
				const result = Reflect.apply(target, that, [property, value, priority]);
				return result;
			}
		);
	}
	anchor_work() {
		const { href } = getOwnPropertyDescriptors(HTMLAnchorElement.prototype);

		for (let prop of [
			'port',
			'host',
			'hostname',
			'pathname',
			'origin',
			'search',
			'protocol',
			'hash',
			'username',
			'password',
		]) {
			const desc = Reflect.getOwnPropertyDescriptor(
				HTMLAnchorElement.prototype,
				prop
			);

			Reflect.defineProperty(HTMLAnchorElement.prototype, prop, {
				get: desc.get
					? wrap_function(desc.get, (target, that, args) => {
							const the_href = Reflect.apply(href.get, that, []);
							const url = new URL(
								this.client.tomp.url.unwrap_ez(
									new URL(the_href, this.client.base),
									this.client.base
								)
							);
							return url[prop];
					  })
					: undefined,
				set: desc.set
					? wrap_function(desc.set, (target, that, [value]) => {
							const the_href = Reflect.apply(href.get, that, []);
							const url = new URL(
								this.client.tomp.url.unwrap_ez(
									new URL(the_href, this.client.base),
									this.client.base
								)
							);
							url[prop] = value;
							Reflect.apply(href.set, that, [
								this.client.tomp.url.wrap(url.href, this.client.base),
							]);
							return value;
					  })
					: undefined,
			});
		}
	}
	attr_work() {
		const value = Reflect.getOwnPropertyDescriptor(Attr.prototype, 'value');

		Reflect.defineProperty(Attr.prototype, 'value', {
			get: wrap_function(value.get, (target, that, args) => {
				return Reflect.apply(
					this.get_attribute(true, getAttributeNS),
					that.ownerElement,
					[that.namespaceURI, that.name]
				);
			}),
			set: wrap_function(value.set, (target, that, [value]) => {
				return Reflect.apply(
					this.get_attribute(true, setAttributeNS),
					that.ownerElement,
					[that.namespaceURI, that.name, value]
				);
			}),
			enumerable: true,
			configurable: true,
		});
	}
	domparser_work() {
		DOMParser.prototype.parseFromString = wrap_function(
			DOMParser.prototype.parseFromString,
			(target, that, [str, type]) => {
				if (get_mime(type) === 'image/svg+xml') {
					str = this.client.tomp.svg.wrap(str, this.tomp.base);
				} else {
					str = this.client.tomp.html.wrap(str, this.tomp.base);
				}

				return Reflect.apply(target, that, [str, type]);
			}
		);

		XMLSerializer.prototype.serializeToString = wrap_function(
			XMLSerializer.prototype.serializeToString,
			(target, that, args) => {
				let result = Reflect.apply(target, that, args);
				result = this.client.tomp.html.unwrap(result, this.client.base);
				return result;
			}
		);
	}
	audio_work() {
		global.Audio = wrap_function(
			global.Audio,
			(target, that, [src]) => {
				if (typeof src !== 'undefined') {
					src = this.client.tomp.binary.wrap(src, this.client.base);
				}

				return Reflect.construct(target, [src], that);
			},
			true
		);
	}
	write_work() {
		document.write = wrap_function(document.write, (target, that, [html]) => {
			html = String(html);
			html = this.client.tomp.html.wrap(html, this.client.base);
			return Reflect.apply(target, that, [html]);
		});

		document.writeln = wrap_function(
			document.writeln,
			(target, that, [html]) => {
				html = String(html);
				html = this.client.tomp.html.wrap(html, this.client.base);
				return Reflect.apply(target, that, [html]);
			}
		);
	}
	work() {
		this.write_work();
		this.style_work();
		this.attr_work();
		this.anchor_work();
		this.domparser_work();

		for (let key of Reflect.ownKeys(global)) {
			for (let ab of this.client.tomp.elements.abstractions) {
				if (!ab.name.test_class(key)) {
					continue;
				}

				const cls = global[key];

				if (!cls.prototype) {
					this.client.tomp.log.warn('Class', key, 'has no prototype.');
					continue;
				}

				if ('attributes' in ab)
					for (let data of ab.attributes) {
						for (let name of Reflect.ownKeys(cls.prototype)) {
							if (!data.name.test_class(name)) {
								continue;
							}

							const desc = Reflect.getOwnPropertyDescriptor(
								cls.prototype,
								name
							);

							Reflect.defineProperty(cls.prototype, name, {
								enumerable: true,
								configurable: true,
								get: desc.get
									? wrap_function(desc.get, (target, that, args) => {
											const value = Reflect.apply(target, that, args);

											if (value instanceof CSSStyleDeclaration) {
												return this.style_proxy(value);
											}

											const element = new TOMPElementDOM(that);
											const context = this.client.tomp.elements.get_property(
												name,
												value,
												element,
												this.client.base,
												key
											);

											if (context.deleted) {
												return '';
											} else if (context.modified) {
												console.assert(
													typeof context.value === 'string',
													`Context value wasn't a string.`
												);
												return context.value;
											} else {
												// console.error('no data in context');
												return value;
											}
									  })
									: undefined,
								set: desc.set
									? wrap_function(desc.set, (target, that, [value]) => {
											value = String(value);

											const element = new TOMPElementDOM(that);
											const context = this.client.tomp.elements.set_property(
												name,
												value,
												element,
												this.client.base,
												key
											);

											if (context.modified && data.name.tag !== false) {
												// not a property
												element.attributes.set(
													attribute_original + name,
													value
												);
											}

											if (context.deleted) {
												Reflect.deleteProperty(that, [name]);
											} else if (context.modified) {
												console.assert(
													typeof context.value === 'string',
													`Context value wasn't a string.`
												);
												Reflect.apply(target, that, [context.value]);
											} else {
												Reflect.apply(target, that, [value]);
												// console.error('no data in context');
											}

											this.client.tomp.elements.done_wrapping(
												true,
												element,
												this.client.base
											);

											return value;
									  })
									: undefined,
							});
						}
					}
			}
		}

		this.remove_attribute = (is_namespace, target) =>
			wrap_function(target, (target, that, args) => {
				let suffix = [];

				if (is_namespace) {
					test_args(target, args, 2, 'Element');
					suffix = args.splice(0, 1);
				} else {
					test_args(target, args, 1, 'Element');
				}

				let [name] = args;

				const has = Reflect.apply(
					this.has_attribute(
						is_namespace,
						is_namespace ? hasAttributeNS : hasAttribute
					),
					that,
					[...suffix, name]
				);

				if (has) {
					if (Reflect.apply(hasAttribute, that, [attribute_original + name])) {
						Reflect.apply(removeAttribute, that, [attribute_original + name]);
					}

					const element = new TOMPElementDOM(that);
					this.client.tomp.elements.done_wrapping(
						true,
						element,
						this.client.base
					);

					return Reflect.apply(target, that, [...suffix, name]);
				} else {
					return null;
				}
			});

		this.get_attribute_node = (is_namespace, target) =>
			wrap_function(target, (target, that, args) => {
				let suffix = [];

				if (is_namespace) {
					test_args(target, args, 2, 'Element');
					suffix = args.splice(0, 1);
				} else {
					test_args(target, args, 1, 'Element');
				}

				let [name] = args;

				const has = Reflect.apply(
					this.has_attribute(
						is_namespace,
						is_namespace ? hasAttributeNS : hasAttribute
					),
					that,
					[...suffix, name]
				);

				if (has) {
					return Reflect.apply(target, that, [...suffix, name]);
				} else {
					return null;
				}
			});

		this.has_attribute = (is_namespace, target) =>
			wrap_function(Element.prototype.hasAttribute, (target, that, args) => {
				let suffix = [];

				if (is_namespace) {
					test_args(target, args, 2, 'Element');
					suffix = args.splice(0, 1);
				} else {
					test_args(target, args, 1, 'Element');
				}

				let [name] = args;
				name = String(name);

				const element = new TOMPElementDOM(that);
				const value = Reflect.apply(target, that, [...suffix, name]);
				return this.client.tomp.elements.has_attribute(
					name,
					value,
					element,
					this.client.base
				);
			});

		this.get_attribute = (is_namespace, target) =>
			wrap_function(target, (target, that, args) => {
				let suffix = [];

				if (is_namespace) {
					test_args(target, args, 2, 'Element');
					suffix = args.splice(0, 1);
				} else {
					test_args(target, args, 1, 'Element');
				}

				let [name] = args;
				name = String(name);

				const element = new TOMPElementDOM(that);
				const value = Reflect.apply(target, that, [...suffix, name]);
				const context = this.client.tomp.elements.get_attribute(
					name,
					value,
					element,
					this.client.base
				);

				if (context.deleted) {
					return null;
				} else if (context.modified) {
					console.assert(
						typeof context.value === 'string',
						`Context value wasn't a string.`
					);
					return context.value;
				} else {
					return value;
				}
			});

		this.set_attribute = (is_namespace, target) =>
			wrap_function(target, (target, that, args) => {
				let suffix = [];

				if (is_namespace) {
					test_args(target, args, 3, 'Element');
					suffix = args.splice(0, 1);
				} else {
					test_args(target, args, 2, 'Element');
				}

				let [name, value] = args;
				name = String(name);
				value = String(value);

				const element = new TOMPElementDOM(that);
				const context = this.client.tomp.elements.set_attribute(
					name,
					value,
					element,
					this.client.base
				);

				if (context.modified) {
					Reflect.apply(target, that, [
						...suffix,
						attribute_original + name,
						value,
					]);
				}

				if (context.deleted) {
					element.attributes.delete(name);
				} else if (context.modified) {
					Reflect.apply(target, that, [...suffix, name, context.value]);
				} else {
					// console.log(context, 'no data');
					Reflect.apply(target, that, [...suffix, name, value]);
				}

				this.client.tomp.elements.done_wrapping(
					true,
					element,
					this.client.base
				);
			});

		Element.prototype.getAttributeNames = wrap_function(
			Element.prototype.getAttributeNames,
			(target, that, args) => {
				const result = [];

				for (let attribute of Reflect.apply(target, that, args)) {
					const has = Reflect.apply(
						this.has_attribute(false, hasAttribute),
						that,
						[name]
					);

					if (has) {
						result.push(attribute);
					}
				}

				return result;
			}
		);

		Element.prototype.getAttribute = this.get_attribute(
			false,
			Element.prototype.getAttribute
		);
		Element.prototype.getAttributeNS = this.get_attribute(
			true,
			Element.prototype.getAttributeNS
		);

		Element.prototype.getAttributeNode = this.get_attribute_node(
			false,
			Element.prototype.getAttributeNode
		);
		Element.prototype.getAttributeNodeNS = this.get_attribute_node(
			true,
			Element.prototype.getAttributeNodeNS
		);

		Element.prototype.setAttribute = this.set_attribute(
			false,
			Element.prototype.setAttribute
		);
		Element.prototype.setAttributeNS = this.set_attribute(
			true,
			Element.prototype.setAttributeNS
		);

		Element.prototype.hasAttribute = this.has_attribute(
			false,
			Element.prototype.hasAttribute
		);
		Element.prototype.hasAttributeNS = this.has_attribute(
			true,
			Element.prototype.hasAttributeNS
		);

		Element.prototype.removeAttribute = this.remove_attribute(
			false,
			Element.prototype.removeAttribute
		);
		Element.prototype.removeAttributeNS = this.remove_attribute(
			true,
			Element.prototype.removeAttributeNS
		);
	}
}
