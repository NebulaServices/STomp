import Rewrite from '../../Rewrite.js';
import global from '../../../global.js';

export default class IsolateModule extends Rewrite {
	work() {
		delete global.CookieStore;
		delete global.cookieStore;
		delete global.CookieStoreManager;
		delete global.CookieChangeEvent;
		delete global.ServiceWorker;
		delete global.ServiceWorkerContainer;
		delete global.ServiceWorkerRegistration;
		delete Navigator.prototype.serviceWorker;
	}
}
