const encode_char = '$';
const valid_chars =
	'-_~:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const reserved_chars = encode_char;

export function validCodecURI(protocol) {
	protocol = protocol.toString();

	for (let i = 0; i < protocol.length; i++) {
		const char = protocol[i];

		if (!valid_chars.includes(char)) {
			return false;
		}
	}

	return true;
}

export function encodeCodecURI(ci) {
	ci = String(ci);

	let result = '';

	for (let i = 0; i < ci.length; i++) {
		const char = ci[i];

		if (valid_chars.includes(char) && !reserved_chars.includes(char)) {
			result += char;
		} else {
			const code = char.charCodeAt();
			result += encode_char + code.toString(16).padStart(2, 0);
		}
	}

	return result;
}

export function decodeCodecURI(ci) {
	if (typeof ci !== 'string') throw new TypeError('Codec URI must be a string');

	let result = '';

	for (let i = 0; i < ci.length; i++) {
		const char = ci[i];

		if (char === encode_char) {
			const code = parseInt(ci.slice(i + 1, i + 3), 16);
			const decoded = String.fromCharCode(code);

			result += decoded;
			i += 2;
		} else {
			result += char;
		}
	}

	return result;
}
