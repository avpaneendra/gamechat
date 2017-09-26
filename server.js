const url = require('url')
const https = require('https')
const fs = require('fs')

const WebSocket = require('ws')

let opts;

if(process.env.NODE_ENV === "production") {
	opts = {
		//key: fs.readFileSync('/etc/nginx/metal.fish.key'),
		//cert: fs.readFileSync('/etc/nginx/metal.fish.crt')
	}
} 
else {
	opts = { 
		key: fs.readFileSync('key.pem'),
		cert: fs.readFileSync('cert.pem'),
		passphrase: 'password'
	}
}

const server = https.createServer(opts, (req, res) => { res.end('hi') }).listen(8443);

const wss = new WebSocket.Server({ server })

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
