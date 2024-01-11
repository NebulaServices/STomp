export class Parse5Context {
	root = false;
	attached = false;
	constructor(node, parent, root) {
		this.node = node;

		if (parent instanceof Parse5Context) {
			this.parent = parent;
			this.attached = true;
		} else if (!root) {
			throw new TypeError(`New parent isnt an instance of Parse5Context.`);
		}

		if (root == true) this.root = true;
	}
	get type() {
		return this.node.nodeName;
	}
	// returns new context if this node is attached and in parent, false otherwise
	insert_before(...nodes) {
		if (this.root) throw new RangeError('Cannot insert before the root.');
		else if (!this.attached)
			throw new RangeError('Cannot insert before a detached node.');

		let place = this.parent.node.childNodes.indexOf(this.node);
		if (place == -1) return false;
		this.parent.node.childNodes.splice(place, 0, ...nodes);
		return nodes.length > 1 ? true : new Parse5Context(nodes[0], this.parent);
	}
	// returns new context if this node is attached and in parent, false otherwise
	insert_after(...nodes) {
		if (this.root) throw new RangeError('Cannot insert after the root.');
		else if (!this.attached)
			throw new RangeError('Cannot insert after a detached node.');

		let place = this.parent.node.childNodes.indexOf(this.node);
		if (place == -1) return false;
		this.parent.node.childNodes.splice(place + 1, 0, node);
		return new Parse5Context(node, this.parent);
	}
	// returns new context if this node is attached and in parent, false otherwise
	replace_with(...nodes) {
		if (this.root) throw new RangeError('Cannot replace the root.');
		else if (!this.attached)
			throw new RangeError('Cannot replace a detached node.');

		let place = this.parent.node.childNodes.indexOf(this.node);
		if (place == -1) return false;
		this.parent.node.childNodes.splice(place, 1, ...nodes);
		this.attached = false;

		let created =
			nodes.length > 1 ? true : new Parse5Context(nodes[0], this.parent);
		delete this.parent;
		return created;
	}
	append(...nodes) {
		this.node.childNodes.push(...nodes);
		return nodes.length > 1 ? true : new Parse5Context(nodes[0], this);
	}
	// appends this to a context
	// returns true if successful, false otherwise
	// exception if context isnt an instance of Parse5Context
	attach(context) {
		if (this.attached)
			throw new RangeError(
				'Cannot attach an already attached node. Call .detach() first.'
			);

		if (!(context instanceof Parse5Context))
			throw new TypeError(`New parent isnt an instance of Parse5Context.`);
		this.parent = context;
		this.parent.append(this.node);
		return true;
	}
	// returns true if this node was detached from the parent, false otherwise
	detach() {
		if (this.root) throw new RangeError('Cannot detach the root.');
		if (!this.attached)
			throw new RangeError(
				'Cannot detach an already detached node. Call .attach(context) first.'
			);
		let place = this.parent.node.childNodes.indexOf(this.node);
		if (place == -1) return false;
		this.parent.node.childNodes.splice(place, 1);
		this.attached = false;
		delete this.parent;
		return true;
	}
}

export default class Parse5Iterator {
	constructor(ast) {
		this.stack = [new Parse5Context(ast, undefined, true)];
	}
	next() {
		if (!this.stack.length) {
			return { value: undefined, done: true };
		}

		const context = this.stack.pop();

		if (context.node.childNodes) {
			// insert new contexts in reverse order
			// not cloning arrays then reversing in the interest of optimization
			const start = this.stack.length - 1;
			let length = context.node.childNodes.length;

			for (let node of context.node.childNodes) {
				this.stack[start + length--] = new Parse5Context(node, context);
			}
		}

		return { value: context, done: false };
	}
	[Symbol.iterator]() {
		return this;
	}
}
