export class AcornContext {
	root = false;
	attached = false;
	stack = [];
	entries = [];
	constructor(node, parent, parent_key, stack, root) {
		this.node = node;

		this.stack = stack;

		if (parent instanceof AcornContext) {
			this.parent = parent;
			this.parent_key = parent_key;
			this.attached = true;
		} else if (!root) {
			throw new TypeError(`New parent isnt an instance of AcornContext.`);
		}

		if (root == true) this.root = true;
	}
	// only used by array() and index()
	get parent_object() {
		return this.parent.node[this.parent_key];
	}
	get parent_array() {
		return Array.isArray(this.parent_object);
	}
	get parent_index() {
		if (!this.parent_array) {
			throw new Error('Not an array');
		}

		return this.parent_object.indexOf(this.node);
	}
	get type() {
		return this.node.type;
	}
	detach() {
		if (this.root) throw new RangeError('Cannot detach the root.');
		else if (!this.attached)
			throw new RangeError('Cannot detach a detached node.');

		if (this.parent_array) {
			let place = this.parent_object.indexOf(this.node);
			if (place == -1) return false;
			this.parent_object.splice(place, 1);
		} else {
			delete this.parent.node[this.parent_key];
		}

		this.attached = false;

		return true;
	}
	// success = new AcornContext, failure = false
	replace_with(node) {
		if (this.root) throw new RangeError('Cannot replace the root.');
		else if (!this.attached)
			throw new RangeError('Cannot replace a detached node.');

		if (this.parent_array) {
			let place = this.parent_object.indexOf(this.node);
			if (place == -1) return false;
			this.parent_object.splice(place, 1, node);
		} else {
			delete this.parent.node[this.parent_key];
			this.parent.node[this.parent_key] = node;
		}

		this.attached = false;

		const created = new AcornContext(
			node,
			this.parent,
			this.parent_key,
			this.stack
		);
		delete this.parent;
		return created;
	}
	remove_descendants_from_stack() {
		const i = this.stack.indexOf(this);

		if (i != -1) this.stack.splice(i, 1);

		for (let entry of this.entries) {
			entry.remove_descendants_from_stack();
		}
	}
}

export default class AcornIterator {
	constructor(ast) {
		this.stack = [];
		this.stack.push(
			new AcornContext(ast, undefined, undefined, this.stack, true)
		);
	}
	next() {
		if (!this.stack.length) {
			return { value: undefined, done: true };
		}

		const context = this.stack.pop();
		const entries = [];

		for (let key in context.node) {
			const value = context.node[key];

			if (typeof value !== 'object' || value === null) {
				continue;
			}

			if (typeof value.type === 'string') {
				entries.push([key, value]);
			} else if (Array.isArray(value)) {
				for (let sv of value) {
					if (typeof sv !== 'object' || sv === null) {
						continue;
					}

					if (typeof sv.type === 'string') {
						entries.push([key, sv]);
					}
				}
			}
		}

		const start = this.stack.length - 1;
		let length = entries.length;

		for (let [key, node] of entries) {
			const ent = new AcornContext(node, context, key, this.stack);
			this.stack[start + length--] = ent;
			context.entries.push(ent);
		}

		return { value: context, done: false };
	}
	[Symbol.iterator]() {
		return this;
	}
}
