import Rewriter from './Rewriter.js';
import Parse5Iterator from './IterateParse5.js';
import { serialize, parse, parseFragment } from 'parse5';
import { global_client } from './RewriteJS.js';
import { TOMPElement } from './RewriteElements.js';

const essential_nodes = [
	'#documentType',
	'#document',
	'#text',
	'html',
	'head',
	'body',
];

export class TOMPElementParse5 extends TOMPElement {
	#ctx = {};
	constructor(ctx) {
		super();

		this.#ctx = ctx;

		for (let { name, value } of this.#ctx.node.attrs) {
			if (!this.attributes.has(name)) this.attributes.set(name, value);
		}

		this.#ctx.node.attrs.length = 0;
	}
	get type() {
		return this.#ctx.node.nodeName;
	}
	set type(value) {
		this.#ctx.node.tagName = value;
		this.#ctx.node.nodeName = value;
		return value;
	}
	get detached() {
		return !this.#ctx.attached;
	}
	detach() {
		this.#ctx.detach();
	}
	sync() {
		this.#ctx.node.attrs.length = 0;

		for (let [name, value] of this.attributes) {
			if (typeof value != 'string')
				throw new TypeError(`Attribute ${name} was not a string.`);
			this.#ctx.node.attrs.push({ name, value });
		}
	}
	get text() {
		return this.#ctx.node?.childNodes[0]?.value;
	}
	set text(value) {
		this.#ctx.node.childNodes = [
			{
				nodeName: '#text',
				value,
				parentNode: this.#ctx.node,
			},
		];
	}
	get parent() {
		return new TOMPElementParse5(this.#ctx.parent);
	}
}

export default class RewriteHTML extends Rewriter {
	static service = 'html';
	get_head(url) {
		const nodes = [];

		if (!this.tomp.noscript) {
			nodes.push({
				nodeName: 'script',
				tagName: 'script',
				childNodes: [],
				attrs: [
					{
						name: 'src',
						value: `${this.tomp.directory}client.js`,
					},
					{
						name: 'data-is-tomp',
						value: 'true',
					},
				],
			});

			nodes.push({
				nodeName: 'script',
				tagName: 'script',
				childNodes: [
					{
						nodeName: '#text',
						value: `if(typeof ${global_client}==='function')${global_client}(${JSON.stringify(
							this.tomp
						)})`,
					},
				],
				attrs: [
					{
						name: 'data-is-tomp',
						value: 'true',
					},
				],
			});
		}

		return nodes;
	}
	#wrap(html, url, fragment, wrap) {
		const ast = (fragment ? parseFragment : parse)(html, {
			// https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/options/parser-options.md#optional-scriptingenabled
			// <noscript>
			scriptingEnabled: !this.tomp.noscript,
		});

		let inserted_script = false;

		const persist = {};

		for (let ctx of new Parse5Iterator(ast)) {
			if (!ctx.node.attrs) {
				// #text node
				continue;
			}

			const element = new TOMPElementParse5(ctx);

			if (wrap) {
				this.tomp.elements.wrap(element, url, persist);
			} else {
				this.tomp.elements.unwrap(element, url, persist);
			}

			// todo: instead of first non essential node, do first live rewritten node (script, if node has on* tag)
			// on the first non-essential node (not html,head,or body), insert the client script before it
			if (
				!fragment &&
				wrap &&
				!element.detached &&
				!inserted_script &&
				!essential_nodes.includes(ctx.node.nodeName)
			) {
				inserted_script = ctx.insert_before(...this.get_head(url));
			}

			element.sync();
		}

		return serialize(ast);
	}
	wrap(html, url, fragment = false) {
		return this.#wrap(html, url, fragment, true);
	}
	unwrap(html, url, fragment = false) {
		return this.#wrap(html, url, fragment, false);
	}
	// excellent resource
	// https://web.archive.org/web/20210514140514/https://www.otsukare.info/2015/03/26/refresh-http-header
	wrap_http_refresh(value, url) {
		const urlstart = value.toLowerCase().indexOf('url=');

		if (urlstart == -1) {
			return value;
		}

		var urlend = value.indexOf(';', urlstart);
		if (urlend == -1) urlend = value.indexOf(',', urlstart);
		if (urlend == -1) urlend = value.length;

		const resolved = new URL(value.slice(urlstart + 4, urlend), url).href;
		return (
			value.slice(0, urlstart) +
			'url=' +
			this.serve(resolved, url) +
			value.slice(urlend)
		);
	}
}
