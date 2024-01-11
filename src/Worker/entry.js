import Server from './Server.js';

const params = new URLSearchParams(location.search);
const config = JSON.parse(params.get('config'));
const server = new Server(config);

self.addEventListener('install', (event) => {
	server.tomp.log.debug('Installed');
});

self.addEventListener('fetch', (event) => {
	if (server.request(event)) {
		// handled
		return;
	}
});

self.addEventListener('activate', (event) => {
	server.tomp.log.debug('Now ready to handle fetches');
});

self.addEventListener('push', (event) => {
	server.tomp.log.debug('Push', event.request.url);
});

self.addEventListener('message', (event) => {
	if (server.message(event)) {
		// handled
		return;
	}
});
