import global from '../global.js';

export const engine = navigator.userAgent.includes('Firefox/')
	? 'gecko'
	: 'webkit';
export const is_page = typeof Window == 'function' && global instanceof Window;
export const is_serviceworker =
	typeof ServiceWorkerGlobalScope == 'function' &&
	global instanceof ServiceWorkerGlobalScope;
export const is_worker =
	typeof WorkerGlobalScope == 'function' && global instanceof WorkerGlobalScope;
