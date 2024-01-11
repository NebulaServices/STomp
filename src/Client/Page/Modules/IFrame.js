import Rewrite from '../../Rewrite.js';
import { global_client } from '../../../RewriteJS.js';
import {
	getOwnPropertyDescriptors,
	Reflect,
	wrap_function,
} from '../../rewriteUtil.js';
import WindowRewrite from './Window.js';

export default class IFrameRewrite extends Rewrite {
	get_contentWindow(target, that, args) {
		const window = Reflect.apply(target, that, args);

		if (window === null) {
			return null;
		}

		if (!(global_client in window)) {
			this.client.get(WindowRewrite).inject_client(window);
		}

		return window;
	}
	work() {
		const { contentWindow, contentDocument } = getOwnPropertyDescriptors(
			HTMLIFrameElement.prototype
		);

		Reflect.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
			get: wrap_function(contentWindow.get, (target, that, args) => {
				const window = this.get_contentWindow(contentWindow.get, that, []);

				if (window === null) {
					return null;
				}

				return this.client.get(WindowRewrite).restrict_window(window);
			}),
			enumerable: true,
			configurable: true,
		});

		Reflect.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
			get: wrap_function(contentDocument.get, (target, that, args) => {
				const window = this.get_contentWindow(contentWindow.get, that, []);

				if (
					window === null ||
					!this.client.get(WindowRewrite).same_origin(window)
				) {
					return null;
				}

				return window.document;
			}),
			enumerable: true,
			configurable: true,
		});
	}
}
