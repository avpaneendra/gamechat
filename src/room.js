/*,
The Room is the base context for where all shit goes down

each module would instantiate a room.

anyone else who joins a room with the same id, will dial in automatically

*/

const initPeerConn = (room, user) => {
	const peerConn = new RTCPeerConnection({
		iceServers: [
			{
				urls: [
					'stun:stun.l.google.com:19302',
					'stun:stun1.l.google.com:19302',
					'stun:stun2.l.google.com:19302',
					'stun:stun3.l.google.com:19302',
					'stun:stun4.l.google.com:19302'
				]
			}
		]
	})

	peerConn.onaddstream = e =>{
		console.log("on add stream", e);
		room.onAddStream(user, e);
	} 

	peerConn.onicecandidate = e => {
		console.log('ice candidate event', e.candidate)
		if(e.candidate) {
			room.wsSend("signaling", { candidate: e.candidate }, user.id);
		}
	}
	peerConn.ondatachannel = e => {
		e.channel.onmessage = msg => console.log('msg ', msg);
	}

	peerConn.oniceconnectionstatechange = e => {
		console.log('on ice conn sate change', peerConn.iceConnectionState)

		if(peerConn.iceConnectionState == "disconnected") {
			room._onPeerDisconnect(user, e);
		}
	}

	return peerConn;
}

export default class Room {

	constructor(roomId, userId, getUserMedia) {

		this.roomId = roomId;
		this.userId = userId;
		console.log('userid', this.userId)

		this.peerConnections = new Map(); // key: string, value: RTCPeerConnection

		// maybe this promise should be supplied by instantiator

		this.connectWs();
		this.stream = getUserMedia;

		this.onAddStream = (user, event) => console.log('new stream added: overwrite me')
		this.onPeerDisconnect = (user, event) => console.log('peer disconnected, overwrite me', user, event);
	}

	_onPeerDisconnect(user, event) {
		const pc = this.peerConnections.get(user.id);
		pc.close();
		this.peerConnections.delete(user.id);
		this.onPeerDisconnect(user, event);
	}

	wsSend(type, payload, targetId) {

		this.ws.send(JSON.stringify({
			type,
			room: { id: this.roomId },
			user: { id: this.userId },
			target: { id: targetId },
			payload
		}))

	}

	connectWs() {

		this.ws = new WebSocket(`wss://metal.fish:8443?id=${this.roomId}&user=${this.userId}`);
		//this.ws = new WebSocket(`wss://localhost:8443?id=${this.roomId}&user=${this.userId}`);
		this.ws.onopen = () => {
			console.log('websocket open');
			this.wsSend("member_join");
		}
		this.ws.onerror = err => console.error('websocket error', err)
		this.ws.onmessage = this.onWebsocketMessage.bind(this);
		this.ws.onclose = (e) => {
			console.log('ws closed', e);
			this.connectWs();
		}

	}

	// the server will tell us all the signaling
	// it will also tell us who is in the room
	// it will also be sending state updates


	// it is the responsibility of everyone in the room to initiate a call.
	// websocket will notify a person has joined.
	// then everyone will call that person
	onWebsocketMessage(msg) {

		const parsed = JSON.parse(msg.data);
		// we expect { type, payload, user }
		if(parsed.user.id === this.userId) {
			console.log('ignoring message')
			return;
		}
		switch(parsed.type) {

			case "signaling":
				this.onSignal(parsed)
				break;
			case "member_join":
				console.log("MEMBER JOIN MESSAGE:", parsed)
				this.onMemberJoin(parsed);
				break;
			default:
				console.log("no case for websocket message", parsed.type, parsed);
				break;
		}
	}

	onMemberJoin(msg) {

		const { payload, user } = msg;

		const peerConn = initPeerConn(this, user);
		this.peerConnections.set(user.id, peerConn);

		console.log("CREATING OFFER")
		this.stream
			.then(stream => {
				console.log("stream!", stream)
				return peerConn.addStream(stream)
			})
			.then(() => peerConn.createOffer())
			.then(offer => peerConn.setLocalDescription(offer))
			.then(() => this.wsSend("signaling", peerConn.localDescription, user.id))
			.catch(err => console.error(err))
	}

	receiveAnswer(payload, user) {
		console.log('GOT ANSWER', user)
		this.peerConnections.get(user.id)
			.setRemoteDescription(new RTCSessionDescription(payload))
			.then(() => {
				console.log('set remote description');
			})
	}

	receiveOffer(payload, user) {
		// you receive an offer when you join a room 
		// and the existing members say hello

		const peerConn = initPeerConn(this, user);

		console.log('received offer from', user.id)
		this.peerConnections.set(user.id, peerConn);
		console.log(payload)
		this.stream
			.then(stream => peerConn.addStream(stream))
			.then(() => peerConn.setRemoteDescription(new RTCSessionDescription(payload)))
			.then(() => peerConn.createAnswer())
			.then(answer => {
				console.log("creating and sending answer", answer)
				peerConn.setLocalDescription(answer);
				this.wsSend("signaling", answer, user.id);
			})

	}

	onSignal(msg) {

		const { payload, user } = msg

		if(payload.type === "offer") {
			console.log("GOT OFFER")
			this.receiveOffer(payload, user)
		}

		if(payload.type === "answer") {
			this.receiveAnswer(payload, user)
		}

		if(payload.candidate) {
			this.peerConnections.get(user.id)
				.addIceCandidate(new RTCIceCandidate(payload.candidate))
				.then(() => console.log('ice candidate added'))
				.catch(err => console.error('ice candidate failed', err))
		}

	}

}