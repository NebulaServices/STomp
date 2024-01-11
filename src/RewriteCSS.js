import Rewriter from './Rewriter.js';
import { parse, walk, generate } from 'css-tree';

export default class RewriteCSS extends Rewriter {
	static service = 'css';
	wrap(code, url, context = 'stylesheet') {
		let ast;

		try {
			ast = parse(code, { context });
		} catch (err) {
			if (err instanceof SyntaxError) {
				return `/*${JSON.stringify(err.message)}*/`;
			} else throw err;
		}

		const that = this;

		walk(ast, function (node, item, list) {
			if (node.type === 'Raw' && node.value.includes('url(')) {
				// node.value that be any raw data from what I see
				node.value = that.wrap(node.value, url, 'value');
			} else if (node.type === 'Url')
				try {
					const resolved = new URL(node.value, url);

					if (this.atrule?.name === 'import') {
						node.value = that.tomp.css.serve(resolved, url);
					} else {
						node.value = that.tomp.binary.serve(resolved, url);
					}
				} catch (err) {
					console.error(err);
					return;
				}
			else if (node.name === 'import') {
				const data = node?.prelude?.children?.tail?.data;

				if (data !== undefined && data.type === 'String')
					try {
						const resolved = new URL(data.value, url);
						data.value = that.tomp.css.serve(resolved, url);
					} catch (err) {
						console.error(err);
						return;
					}
			}
		});

		code = generate(ast);

		if (context === 'stylesheet') {
			code = '@charset "UTF-8";' + code;
		}

		return code;
	}
	unwrap(code, url, context = 'stylesheet') {
		try {
			var ast = parse(code, { context });
		} catch (err) {
			if (err instanceof SyntaxError) {
				return `/*${JSON.stringify(err.message)}*/`;
			} else throw err;
		}

		const that = this;

		walk(ast, function (node, item, list) {
			if (node.type === 'Url')
				try {
					if (this.atrule?.name == 'import') {
						node.value = that.tomp.css
							.unwrap_serving(node.value, url)
							.toString();
					} else {
						node.value = that.tomp.binary
							.unwrap_serving(node.value, url)
							.toString();
					}
				} catch (err) {
					// console.error(err);
					return;
				}
			else if (node.name === 'import') {
				const data = node?.prelude?.children?.tail?.data;

				if (data !== undefined && data.type === 'String')
					try {
						data.value = that.tomp.css
							.unwrap_serving(data.value, url)
							.toString();
					} catch (err) {
						// console.error(err);
						return;
					}
			}
		});

		return generate(ast);
	}
}
