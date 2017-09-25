const WebSocket = require('ws')
const url = require('url')

const wss = new WebSocket.Server({ port: 8080 })

const people = new Map();

wss.on('connection', (ws, req) => {

	const location = url.parse(req.url, true)
	console.log(location.query)

	people.set(location.query.id, ws);

	const id = Math.random();
	ws.on('message', msg => {

		const { target, payload, from } = JSON.parse(msg);

		console.log(target)
		if(people.has(target)) {
			people.get(target).send(msg);
		}

		console.log('received: ', msg)
	})
})
