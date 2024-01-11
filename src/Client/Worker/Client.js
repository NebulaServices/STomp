import Client from '../Client.js';
import ImportScriptsRewrite from './Modules/ImportScripts.js';

export default class WorkerClient extends Client {
	static type = 'worker';
	base = this.tomp.url.parse_url(this.tomp.url.unwrap_ez(location));
	host = this.tomp.url.parse_url(location.href);
	constructor(config) {
		super(config);

		this.load_modules(ImportScriptsRewrite);
	}
}
