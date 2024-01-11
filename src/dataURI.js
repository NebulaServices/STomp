import { decodeBase64, encodeBase64 } from './Base64.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const protocol = 'data:';

export function parseDataURI(href) {
	href = String(href);

	if (!href.startsWith(protocol)) throw new Error('Not a data: URI');

	href = href.slice(protocol.length);

	const datapos = href.indexOf(',');
	if (datapos == -1) throw new URIError('Invalid data: URI');

	const split = `${href.slice(0, datapos)}`.split(';');

	let mime = split.splice(0, 1);

	if (mime == undefined) throw new URIError('Invalid data: URI');

	let base64 = false;

	for (let part of split) {
		if (part.startsWith('charset=')) {
			mime += ';' + part;
		} else if (part == 'base64') {
			base64 = true;
		}
	}

	let data = decodeURIComponent(href.slice(datapos + 1));

	if (base64) {
		data = decoder.decode(decodeBase64(data));
	}

	return {
		mime,
		data,
		base64,
	};
}

export function createDataURI(mime, data, base64) {
	const parts = [mime];

	mime = String(mime);

	if (base64) {
		if (!(data instanceof ArrayBuffer)) {
			data = String(data);
			data = encoder.encode(data);
		}

		data = encodeBase64(data);
		parts.push('base64');
	} else {
		data = String(data);
	}

	return `data:${parts.join(';')},${data}`;
}

/*console.log(ParseDataURI(`data:text/vnd-example+xyz;foo=bar;base64,R0lGODdh`));
console.log(ParseDataURI(`data:text/plain;charset=UTF-8;page=21,the%20data:1234,5678`));
console.log(ParseDataURI(`data:text/html;charset=utf-8,%3C!DOCTYPE%20html%3E%3Chtml%20lang%3D%22en%22%3E%3Chead%3E%3Ctitle%3EEmbedded%20Window%3C%2Ftitle%3E%3C%2Fhead%3E%3Cbody%3E%3Ch1%3E42%3C%2Fh1%3E%3C%2Fbody%3E%3C%2Fhtml%3E`));
console.log(ParseDataURI(`data:,test`));*/
