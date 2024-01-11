// interface for wrap/unwrap is
// input, crytographic key
// eg for salts, seeds
// per client basis

import { decodeCodecURI, encodeCodecURI } from './encodeCodecURI.js';

export class CodecInterface {
	generate_key() {
		throw new Error('generate_key() not implemented');
	}
	wrap(input, key) {
		throw new Error('wrap() not implemented');
	}
	unwrap(input, key) {
		throw new Error('unwrap() not implemented');
	}
}

export class PlainCodec extends CodecInterface {
	generate_key() {
		return String(0);
	}
	wrap(input, key) {
		key = parseInt(key);
		return input;
	}
	unwrap(input, key) {
		key = parseInt(key);
		return input;
	}
}

// nature of xor allows wrap to be used both ways
export class XORCodec extends CodecInterface {
	URI_max = 0x7f;
	URI_min = 0x01;
	generate_key() {
		const xor = ~~(Math.random() * (this.URI_max - 3)) + 2,
			// 2-4
			frequency = Math.min(~~(Math.random() * 0xf), 4);

		// SHORT xor
		// CHAR frequency
		return ((xor << 4) + frequency).toString(16);
	}
	wrap(input, key) {
		key = parseInt(key, 16);

		const xor = key >> 0x4,
			frequency = key & 0xf;
		var result = '';

		for (let i = 0; i < input.length; i++) {
			if (i % frequency == 0) {
				const char = (input[i].charCodeAt() ^ xor) + this.URI_min;
				result += String.fromCharCode(char);
			} else {
				result += input[i];
			}
		}

		return encodeCodecURI(result);
	}
	unwrap(input, key) {
		key = parseInt(key, 16);
		input = decodeCodecURI(input);

		const xor = key >> 0x4,
			frequency = key & 0xf;
		var result = '';

		for (let i = 0; i < input.length; i++) {
			if (i % frequency == 0) {
				const char = (input[i].charCodeAt() - this.URI_min) ^ xor;
				result += String.fromCharCode(char);
			} else {
				result += input[i];
			}
		}

		return result;
	}
}
