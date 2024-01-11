import Rewriter from './Rewriter.js';
import Parse5Iterator from './IterateParse5.js';
import { serialize, parseFragment } from 'parse5';
import { TOMPElementParse5 } from './RewriteHTML.js';

export default class RewriteSVG extends Rewriter {
	static service = 'svg';
	#wrap(html, url, wrap) {
		const ast = parseFragment(html);

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

			element.sync();
		}

		return serialize(ast);
	}
	wrap(html, url) {
		return this.#wrap(html, url, true);
	}
	unwrap(html, url) {
		return this.#wrap(html, url, false);
	}
}
