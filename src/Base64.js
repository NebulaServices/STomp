const b64chs = [
	'A',
	'B',
	'C',
	'D',
	'E',
	'F',
	'G',
	'H',
	'I',
	'J',
	'K',
	'L',
	'M',
	'N',
	'O',
	'P',
	'Q',
	'R',
	'S',
	'T',
	'U',
	'V',
	'W',
	'X',
	'Y',
	'Z',
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'h',
	'i',
	'j',
	'k',
	'l',
	'm',
	'n',
	'o',
	'p',
	'q',
	'r',
	's',
	't',
	'u',
	'v',
	'w',
	'x',
	'y',
	'z',
	'0',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'+',
	'/',
	'=',
];
const b64tab = {
	0: 52,
	1: 53,
	2: 54,
	3: 55,
	4: 56,
	5: 57,
	6: 58,
	7: 59,
	8: 60,
	9: 61,
	A: 0,
	B: 1,
	C: 2,
	D: 3,
	E: 4,
	F: 5,
	G: 6,
	H: 7,
	I: 8,
	J: 9,
	K: 10,
	L: 11,
	M: 12,
	N: 13,
	O: 14,
	P: 15,
	Q: 16,
	R: 17,
	S: 18,
	T: 19,
	U: 20,
	V: 21,
	W: 22,
	X: 23,
	Y: 24,
	Z: 25,
	a: 26,
	b: 27,
	c: 28,
	d: 29,
	e: 30,
	f: 31,
	g: 32,
	h: 33,
	i: 34,
	j: 35,
	k: 36,
	l: 37,
	m: 38,
	n: 39,
	o: 40,
	p: 41,
	q: 42,
	r: 43,
	s: 44,
	t: 45,
	u: 46,
	v: 47,
	w: 48,
	x: 49,
	y: 50,
	z: 51,
	'+': 62,
	'/': 63,
	'=': 64,
};

export function encodeBase64(input) {
	input = new Uint8Array(input);

	let asc = '';

	const pad = input.length % 3;

	for (let i = 0; i < input.length; ) {
		let c0, c1, c2;

		if (
			(c0 = input[i++]) > 255 ||
			(c1 = input[i++]) > 255 ||
			(c2 = input[i++]) > 255
		) {
			throw new RangeError('Invalid character found');
		}

		let u32 = (c0 << 16) | (c1 << 8) | c2;

		asc +=
			b64chs[(u32 >> 18) & 63] +
			b64chs[(u32 >> 12) & 63] +
			b64chs[(u32 >> 6) & 63] +
			b64chs[u32 & 63];
	}

	return pad ? asc.slice(0, pad - 3) + '==='.slice(pad) : asc;
}

export function decodeBase64(string) {
	string = String(string);

	string += '=='.slice(2 - (string.length & 3));

	const bin = [];

	for (let i = 0; i < string.length; ) {
		let r1, r2;

		let u24 =
			(b64tab[string.charAt(i++)] << 18) |
			(b64tab[string.charAt(i++)] << 12) |
			((r1 = b64tab[string.charAt(i++)]) << 6) |
			(r2 = b64tab[string.charAt(i++)]);

		if (r1 === 64) {
			bin.push((u24 >> 16) & 255);
		} else if (r2 == 64) {
			bin.push((u24 >> 16) & 255, (u24 >> 8) & 255);
		} else {
			bin.push((u24 >> 16) & 255, (u24 >> 8) & 255, u24 & 255);
		}
	}

	return new Uint8Array(bin);
}
