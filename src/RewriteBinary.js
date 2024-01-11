// for api compatibility
import Rewriter from './Rewriter.js';

export default class RewriteBinary extends Rewriter {
	static service = 'binary';
	serve(serve, url) {
		serve = String(serve);
		if (serve.startsWith('blob:')) {
			return serve.replace(url.toOrigin(), this.tomp.origin);
		}
		return super.serve(serve, url);
	}
	unwrap_serving(serving, url) {
		serving = String(serving);
		if (serving.startsWith('blob:')) {
			return serving.replace(this.tomp.origin, url.toOrigin());
		}
		return super.unwrap_serving(serving, url);
	}
}
