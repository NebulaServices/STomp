// Base class for a client rewrite

export default class Rewrite {
	constructor(client) {
		this.client = client;
		this.tomp = this.client.tomp;
	}
	work() {
		// throw new Error('.work() not implemented');
	}
}
