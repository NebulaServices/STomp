import {
	LOG_TRACE,
	LOG_DEBUG,
	LOG_INFO,
	LOG_WARN,
	LOG_ERROR,
} from './LoggerConstants.js';
export * from './LoggerConstants.js';

const trace = console.trace.bind(console);
const debug = console.debug.bind(console);
const info = console.info.bind(console);
const warn = console.warn.bind(console);
const error = console.error.bind(console);

export default class Logger {
	levels = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];
	constructor(loglevel) {
		this.loglevel = loglevel;
	}
	trace(...args) {
		if (this.loglevel <= LOG_TRACE) trace('[TOMP]', ...args);
	}
	debug(...args) {
		if (this.loglevel <= LOG_DEBUG) debug('[TOMP]', ...args);
	}
	info(...args) {
		if (this.loglevel <= LOG_INFO) info('[TOMP]', ...args);
	}
	warn(...args) {
		if (this.loglevel <= LOG_WARN) warn('[TOMP]', ...args);
	}
	error(...args) {
		if (this.loglevel <= LOG_ERROR) error('[TOMP]', ...args);
	}
}
