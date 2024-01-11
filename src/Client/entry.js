import PageClient from './Page/Client.js';
import WorkerClient from './Worker/Client.js';
import global from '../global.js';
import { global_client } from '../RewriteJS.js';
import { is_page, is_worker } from './environment.js';

function create_instance(...args) {
	let created;

	/*if(is_serviceworker){
		created = new WorkerClient(config);
	}else */ if (is_worker) {
		created = new WorkerClient(...args);
	} else if (is_page) {
		created = new PageClient(...args);
	} else {
		throw new Error('Unknown context!');
	}

	created.work();

	Reflect.defineProperty(global, global_client, {
		enumerable: false,
		configurable: false,
		writable: false,
		value: created,
	});
}

// consider iframes
if (!(global_client in global)) {
	global[global_client] = create_instance;
}
