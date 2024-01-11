import Rewrite from '../../Rewrite.js';
import global from '../../../global.js';
import {
	wrap_function,
	Reflect,
	getOwnPropertyDescriptors,
	context_this,
} from '../../rewriteUtil.js';
import WindowRewrite from './Window.js';
import { global_client } from '../../../RewriteJS.js';

const beacon_protocols = ['http:', 'https:'];

export const is_tomp = global_client + 'from_tomp';

export default class PageRequestRewrite extends Rewrite {
	work() {
		global.open = wrap_function(
			global.open,
			(target, that, [url, tar, features]) => {
				if (url !== '' && url !== undefined) {
					url = new URL(url, this.client.base);
					url = this.client.tomp.html.serve(url, this.client.base);
				}

				let result = Reflect.apply(target, that, [url, tar, features]);
				result = this.client.get(WindowRewrite).restrict_window(result);

				if (result !== null) {
					if (!(global_client in result)) {
						this.client.get(WindowRewrite).inject_client(result);
					}
				}

				return result;
			}
		);

		global.postMessage = wrap_function(
			global.postMessage,
			(target, that, args) => {
				if (args.length < 1) {
					throw new TypeError(
						`Failed to execute 'postMessage' on 'Window': 1 argument required, but only ${args.length} present.`
					);
				}

				return this.client
					.get(WindowRewrite)
					.postMessage(context_this(that), ...args);
			}
		);

		const message_data = new WeakMap();

		const { data, origin } = getOwnPropertyDescriptors(MessageEvent.prototype);

		global.addEventListener('message', (event) => {
			const event_data = Reflect.apply(data.get, event, []);

			if (
				typeof event_data === 'object' &&
				event_data !== undefined &&
				event_data[is_tomp]
			) {
				message_data.set(event, event_data);
			} else {
				console.warn('Unknown message', event_data);
			}
		});

		Reflect.defineProperty(MessageEvent.prototype, 'origin', {
			configurable: true,
			enumerable: true,
			get: wrap_function(origin.get, (target, that, args) => {
				if (message_data.has(that)) {
					return message_data.get(that).origin;
				}

				return Reflect.apply(target, that, args);
			}),
		});

		Reflect.defineProperty(MessageEvent.prototype, 'data', {
			configurable: true,
			enumerable: true,
			get: wrap_function(data.get, (target, that, args) => {
				if (message_data.has(that)) {
					return message_data.get(that).message;
				}

				return Reflect.apply(target, that, args);
			}),
		});

		AudioWorklet.prototype.addModule = wrap_function(
			AudioWorklet.prototype.addModule,
			(target, that, [url, options]) => {
				url = new URL(url, this.client.base);
				// worklets have little to no apis relevant to the dom/page
				url = this.client.tomp.binary.serve(url, this.client.base);
				// not a worker, worklet
				// worklets dont contain location etc
				// todo: rewrite MessageEvent.prototype.origin inside worklet
				return Reflect.apply(target, that, [url, options]);
			}
		);

		Navigator.prototype.sendBeacon = wrap_function(
			Navigator.prototype.sendBeacon,
			(target, that, [url, data]) => {
				if (that != navigator) throw new TypeError('Illegal invocation');

				url = new URL(url, this.client.base);

				if (!beacon_protocols.includes(url.protocol)) {
					throw new TypeError(
						`Failed to execute 'sendBeacon' on 'Navigator': Beacons are only supported over HTTP(S).`
					);
				}

				url = this.client.tomp.binary.serve(url, this.client.base);
				return Reflect.apply(target, that, [url, data]);
			}
		);

		/*XMLHttpRequest.prototype.setRequestHeader = wrap_function(XMLHttpRequest.prototype.setRequestHeader, (target, that, [header, value]) => {
			value = String(value);
			
			if(!that instanceof XMLHttpRequest){
				throw new TypeError('Illegal Invocation');
			}

			if(this.xml_data.has(that)){
				const data = this.xml_data.get(that);
				data.headers[header] = value;
				// if data is undefined, xmlhttprequest likely isnt open and therefore cant have any headers set
			}else{
				Reflect.apply(target, that, [header, value]);
				throw new Error('An unknown error occured');
			}
		});

		XMLHttpRequest.prototype.send = wrap_function(XMLHttpRequest.prototype.send, (target, that, [body]) => {
			if(this.xml_data.has(that)){
				const data = this.xml_data.get(that);

				data.headers['x-tomp-impl-names'] = JSON.stringify(Reflect.ownKeys(data.headers));

				data.body = body;

				this.handle_xml_request(that, data);
			}else{
				Reflect.apply(target, that, [body]);
				throw new Error('An unknown error occured');
			}
		});*/
	}
}
