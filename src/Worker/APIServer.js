export default class APIServer {
	constructor(name, server, target) {
		this.name = name;
		this.server = server;
		this.target = target;

		this.server.routes.set(name, this.handle.bind(this));
	}
	async handle(_server, request, field) {
		const { target, args } = await request.json();

		if (typeof this.target[target] !== 'function') {
			throw new Error(`Unknown API: ${target}`);
		}

		const result = await this.target[target].call(this.target, ...args);

		return this.server.json(200, result);
	}
}
