const WebSocket = require('ws')
const url = require('url')

const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', (ws, req) => {

	const location = url.parse(req.url, true)
	console.log(location.pathname)

	const id = Math.random();
	ws.on('message', msg => {

		wss.clients.forEach(c => {
			if(c !== ws) {
				c.send(msg);
			}

		})
		console.log('received: ', msg)
	})
})
