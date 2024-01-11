import Rewrite from '../Rewrite.js';
import global from '../global.js';

export default class CookieStoreRewrite extends Rewrite {
	global = global.CookieStore;
	work() {}
}
