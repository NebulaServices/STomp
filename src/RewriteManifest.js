import Rewriter from './Rewriter.js';

export default class RewriteManifest extends Rewriter {
	static service = 'manifest';
	wrap(code, url) {
		let manifest;

		try {
			manifest = JSON.parse(code);
		} catch (err) {
			console.error(err);
			return code;
		}

		if ('scope' in manifest) {
			const resolved = new URL(manifest.scope, url).href;
			manifest.scope = this.tomp.html.serve(resolved, url);
		}

		if ('start_url' in manifest) {
			const resolved = new URL(manifest.start_url, url).href;
			manifest.start_url = this.tomp.html.serve(resolved, url);
		}

		if ('shortcuts' in manifest)
			for (let shortcut of manifest.shortcuts) {
				if ('icons' in shortcut)
					for (let icon of shortcut.icons) {
						const resolved = new URL(icon.src, url).href;
						icon.src = this.tomp.binary.serve(resolved, url);
					}

				const resolved = new URL(shortcut.url, url).href;
				shortcut.url = this.tomp.binary.serve(resolved, url);
			}

		if ('icons' in manifest)
			for (let icon of manifest.icons) {
				const resolved = new URL(icon.src, url).href;
				icon.src = this.tomp.binary.serve(resolved, url);
			}

		if ('screenshots' in manifest)
			for (let screenshot of manifest.screenshots) {
				const resolved = new URL(screenshot.src, url).href;
				screenshot.src = this.tomp.binary.serve(resolved, url);
			}

		if ('protocol_handlers' in manifest)
			for (let icon of manifest.protocol_handlers) {
				const resolved = new URL(app.url, url).href;
				app.url = this.tomp.binary.serve(resolved, url);
			}

		if ('related_applications' in manifest)
			for (let app of manifest.related_applications) {
				const resolved = new URL(app.url, url).href;
				app.url = this.tomp.binary.serve(resolved, url);
			}

		return JSON.stringify(manifest);
	}
	unwrap(code, url) {
		return code;
	}
}
