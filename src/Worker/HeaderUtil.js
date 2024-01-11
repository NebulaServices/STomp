export function objectFromRawHeaders(raw) {
	const result = {};

	Reflect.setPrototypeOf(result, null);

	for (let i = 0; i < raw.length; i += 2) {
		let [header, value] = raw.slice(i, i + 2);
		if (result[header] != void [])
			result[header] = [].concat(result[header], value);
		else result[header] = value;
	}

	return result;
}

export function rawHeaderNames(raw) {
	const result = [];

	for (let i = 0; i < raw.length; i += 2) {
		if (!result.includes(i)) result.push(raw[i]);
	}

	return result;
}

export function mapHeaderNamesFromArray(/*Array*/ from, /*Object*/ to) {
	for (let header of from) {
		if (to[header.toLowerCase()] != void []) {
			const value = to[header.toLowerCase()];
			delete to[header.toLowerCase()];
			to[header] = value;
		}
	}

	return to;
}
