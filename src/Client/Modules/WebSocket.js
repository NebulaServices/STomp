import Rewrite from '../Rewrite.js';
import global from '../../global.js';
import { validProtocol } from '../../encodeProtocol.js';
import { Reflect } from '../rewriteUtil.js';
import {
	DOMObjectConstructor,
	TargetConstant,
	EventTarget_on,
	mirror_class,
} from '../NativeUtil.js';

const default_ports = {
	'ws:': 80,
	'wss:': 443,
};

const ws_protocols = ['wss:', 'ws:'];

export default class WebSocketRewrite extends Rewrite {
	global = global.WebSocket;
	work() {
		const that = this;

		const didnt_specify = Symbol();

		const instances = new WeakSet();

		const CONNECTING = 0;
		const OPEN = 1;
		const CLOSING = 2;
		const CLOSED = 3;

		class WebSocketProxy extends EventTarget {
			#socket;
			#ready;
			#remote = {};
			#binaryType = 'blob';
			#protocol = '';
			#extensions = '';
			#url = '';
			#id = '';
			async #read_meta(meta) {
				const headers = new Headers(meta.headers);

				if (headers.has('sec-websocket-protocol')) {
					this.#protocol = headers.get('sec-websocket-protocol');
				}

				if (headers.has('sec-websocket-extensions')) {
					this.#extensions = headers.get('sec-websocket-extensions');
				}

				if (headers.has('set-cookie')) {
					await that.client.api('cookie', 'set', [
						this.#remote,
						headers.get('set-cookie'),
					]);
				}
			}
			async #open(remote, protocol) {
				this.#remote = remote;

				const request_headers = {};
				Reflect.setPrototypeOf(request_headers, null);

				request_headers['Host'] = remote.host;
				request_headers['Origin'] = that.client.base.toOrigin();
				request_headers['Pragma'] = 'no-cache';
				request_headers['Cache-Control'] = 'no-cache';
				request_headers['Upgrade'] = 'websocket';
				request_headers['User-Agent'] = navigator.userAgent;
				request_headers['Connection'] = 'Upgrade';

				for (let proto of [].concat(protocol)) {
					if (!validProtocol(proto)) {
						throw new DOMException(
							`Failed to construct 'WebSocket': The subprotocol '${proto}' is invalid.`
						);
					}
				}

				if (protocol.length) {
					request_headers['Sec-Websocket-Protocol'] = protocol.join(', ');
				}

				let cookies = await that.client.api('cookie', 'get_string', [remote]);

				if (cookies !== '') {
					request_headers['Cookie'] = cookies.toString();
				}

				this.#socket = await that.tomp.bare.connect(
					request_headers,
					remote.protocol,
					remote.host,
					remote.port,
					remote.path
				);

				this.#socket.binaryType = this.#binaryType;

				this.#socket.addEventListener('message', (event) => {
					this.dispatchEvent(new MessageEvent('message', event));
				});

				this.#socket.meta
					.then((meta) => {
						this.#read_meta(meta);
					})
					.catch(() => {});

				this.#socket.addEventListener('open', async (event) => {
					this.dispatchEvent(new Event('open', event));
				});

				this.#socket.addEventListener('error', (event) => {
					this.dispatchEvent(new ErrorEvent('error', event));
				});

				this.#socket.addEventListener('close', (event) => {
					this.dispatchEvent(new Event('close', event));
				});
			}
			get url() {
				return this.#url;
			}
			constructor(url = didnt_specify, protocol = []) {
				super();

				instances.add(this);

				if (url == didnt_specify) {
					throw new DOMException(
						`Failed to construct 'WebSocket': 1 argument required, but only 0 present.`
					);
				}

				let parsed;

				try {
					parsed = new URL(url);
				} catch (err) {
					throw new DOMException(
						`Faiiled to construct 'WebSocket': The URL '${url}' is invalid.`
					);
				}

				if (!ws_protocols.includes(parsed.protocol)) {
					throw new DOMException(
						`Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${parsed.protocol}' is not allowed.`
					);
				}

				let port = parseInt(parsed.port);

				if (isNaN(port)) port = default_ports[parsed.protocol];

				this.#url = parsed.href;

				this.#ready = this.#open(
					{
						host: parsed.hostname,
						path: parsed.pathname + parsed.search,
						protocol: parsed.protocol,
						port,
					},
					[].concat(protocol)
				);
			}
			get protocol() {
				return this.#protocol;
			}
			get extensions() {
				return this.#extensions;
			}
			get readyState() {
				if (this.#socket) {
					return this.#socket.readyState;
				} else {
					return CONNECTING;
				}
			}
			get binaryType() {
				return this.#binaryType;
			}
			set binaryType(value) {
				this.#binaryType = value;

				if (this.#socket) {
					this.#socket.binaryType = value;
				}

				return value;
			}
			send(data) {
				if (!this.#socket) {
					throw new DOMException(
						`Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.`
					);
				}
				this.#socket.send(data);
			}
			close(code, reason) {
				if (typeof code !== 'undefined') {
					if (typeof code !== 'number') {
						code = 0;
					}

					if (code !== 1000 && (code < 3000 || code > 4999)) {
						throw new DOMException(
							`Failed to execute 'close' on 'WebSocket': The code must be either 1000, or between 3000 and 4999. ${code} is neither.`
						);
					}
				}

				this.#ready.then(() => this.#socket.close(code, reason));
			}
		}

		WebSocketProxy = DOMObjectConstructor(WebSocketProxy);
		EventTarget_on(WebSocketProxy.prototype, 'close');
		EventTarget_on(WebSocketProxy.prototype, 'open');
		EventTarget_on(WebSocketProxy.prototype, 'message');
		EventTarget_on(WebSocketProxy.prototype, 'error');
		TargetConstant(WebSocketProxy, 'CONNECTING', CONNECTING);
		TargetConstant(WebSocketProxy, 'OPEN', OPEN);
		TargetConstant(WebSocketProxy, 'CLOSING', CLOSING);
		TargetConstant(WebSocketProxy, 'CLOSED', CLOSED);
		mirror_class(this.global, WebSocketProxy, instances);

		global.WebSocket = WebSocketProxy;
	}
}
