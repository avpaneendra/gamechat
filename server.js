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

const rooms = new Map(); // key: roomid, value: map of userid -> ws conn

wss.on('connection', (ws, req) => {

	const location = url.parse(req.url, true)
	console.log(location.query)

	const connId = Math.random();
	const roomId = location.query.id;
	const userId = location.query.user;

	if(rooms.has(roomId)) {
		rooms.get(roomId)
			.set(connId, {
				userId,
				ws
			});
	}
	else {
		const room = new Map();
		room.set(connId, {
			userId,
			ws
		});
		rooms.set(roomId, room);
	}

	ws.on('message', msg => {

		const { user, payload, target } = JSON.parse(msg);

		const room = rooms.get(roomId);

		// if theres no target, send to everyone except originating conn
		if(!target || !target.id) {
			room.forEach(userConn => {
				if(userConn.ws !== ws) {
					userConn.ws.send(msg)
				}
			})
		}
		else {
			room.forEach(userConn => {
				if(userConn.userId == target.id) {
					userConn.ws.send(msg);
				}
			})
		}
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
