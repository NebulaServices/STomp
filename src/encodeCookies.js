// https://stackoverflow.com/a/45536811

const encode_char = '%';
const valid_chars =
	"abdefghijklmnqrstuvxyzABDEFGHIJKLMNQRSTUVXYZ0123456789!#$%&'()*+-./:<>?@[]^_`{|}~";
const reserved_chars = encode_char;

export function validCookie(cookie) {
	cookie = String(cookie);

	for (let i = 0; i < cookie.length; i++) {
		const char = cookie[i];

		if (!valid_chars.includes(char)) {
			return false;
		}
	}

	return true;
}

export function encodeCookie(cookie) {
	cookie = String(cookie);

	let result = '';

	for (let i = 0; i < cookie.length; i++) {
		const char = cookie[i];

		if (valid_chars.includes(char) && !reserved_chars.includes(char)) {
			result += char;
		} else {
			const code = char.charCodeAt();
			result += encode_char + code.toString(16).padStart(2, 0);
		}
	}

	return result;
}

export function decodeCookie(cookie) {
	if (typeof cookie !== 'string')
		throw new TypeError('Cookie must be a string');

	let result = '';

	for (let i = 0; i < cookie.length; i++) {
		const char = cookie[i];

		if (char === encode_char) {
			const code = parseInt(cookie.slice(i + 1, i + 3), 16);
			const decoded = String.fromCharCode(code);

			result += decoded;
			i += 2;
		} else {
			result += char;
		}
	}

	return result;
}
