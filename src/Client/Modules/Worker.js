import Rewrite from '../Rewrite.js';
import global from '../../global.js';

export default class WorkerRewrite extends Rewrite {
	work() {
		const that = this;

		const _Worker = global.Worker;

		class Worker extends EventTarget {
			#worker;
			#onerror;
			#onmessage;
			constructor(url, options) {
				super();

				url = new URL(url, that.client.base);

				if (url.origin != that.client.base.toOrigin()) {
					// throw new DOMException(`Failed to construct 'Worker': Script at '${url}' cannot be accessed from origin '${that.client.base.toOrigin()}'.`);
				}

				this.#worker = new _Worker(
					that.client.tomp.js.serve(url, that.client.base, true),
					options
				);

				this.#worker.addEventListener('message', (event) => {
					this.dispatchEvent(new MessageEvent('message', event));
				});

				this.#worker.addEventListener('error', (event) => {
					this.dispatchEvent(new ErrorEvent('error', event));
				});
			}
			terminate() {
				return this.#worker.terminate();
			}
			postMessage(message, options) {
				return this.#worker.postMessage(message, options);
			}
			get onmessage() {
				return this.#onmessage;
			}
			set onmessage(value) {
				if (typeof value == 'function') {
					if (typeof this.#onmessage == 'function') {
						this.removeEventListener('message', this.#onmessage);
					}

					this.#onmessage = value;
					this.addEventListener('message', value);
				}

				return value;
			}
			get onerror() {
				return this.#onerror;
			}
			set onerror(value) {
				if (typeof value == 'function') {
					if (typeof this.#onerror == 'function') {
						this.removeEventListener('error', this.#onerror);
					}

					this.#onerror = value;
					this.addEventListener('error', value);
				}

				return value;
			}
		}

		global.Worker = Worker;
	}
}
