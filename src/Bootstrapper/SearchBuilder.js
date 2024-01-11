const whitespace = /\s/;
const http_s_protocol = /^https?:\/\//;

export default class SearchBuilder {
	constructor(template) {
		this.template = String(template);
	}
	query(input) {
		input = String(input);

		if (input.match(http_s_protocol)) {
			return input;
		} else if (input.includes('.') && !input.match(whitespace)) {
			return `http://${input}`;
		} else {
			return this.template.replace('%s', encodeURIComponent(input));
		}
	}
}
