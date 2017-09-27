const url = require('url')
const https = require('https')
const fs = require('fs')

const WebSocket = require('ws')

let opts;

if(process.env.NODE_ENV === "production") {
	opts = {
		key: fs.readFileSync('/etc/nginx/metal.fish.key'),
		cert: fs.readFileSync('/etc/nginx/metal.fish.crt')
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

const rooms = new Map(); // key: roomid, value: list of WS

wss.on('connection', (ws, req) => {

	const location = url.parse(req.url, true)
	console.log(location.query)

	const connId = Math.random();
	const roomId = location.query.id;

	if(rooms.has(roomId)) {
		rooms.get(roomId).forEach(conn => {
			conn.send(JSON.stringify({ init: true }))
		})
		rooms.get(roomId).set(connId, ws);
	}
	else {
		const room = new Map();
		room.set(connId, ws);
		rooms.set(roomId, room);
	}

	ws.on('message', msg => {

		rooms.get(roomId)
			.forEach(conn => {
				if(conn !== ws) {
					conn.send(msg);
				}
			})

	})

	ws.on('close', () => {
		console.log('closed', roomId, connId)
		if(rooms.has(roomId)) {
			rooms.get(roomId).delete(connId);
			// for some reason ws connection keeps closing all the time.
			// investigate that later
			//rooms.get(roomId).forEach(c => c.send(JSON.stringify({ close: true })))
		}
	})
})
