/*
The Room is the base context for where all shit goes down

each module would instantiate a room.

anyone else who joins a room with the same id, will dial in automatically


*/
export default class Room {

	constructor(roomId, getUserMedia) {

		this.roomId = roomId;
		this.peerConnections = new Map(); // key: string, value: RTCPeerConnection

		// maybe this promise should be supplied by instantiator
		this.stream = navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})

		this.ws = new WebSocket("wss://metal.fish:8443?id=" + roomId);
		this.ws.onopen = () => console.log('websocket open')
		this.ws.onerror = err => console.error('websocket error', err)
		this.ws.onmessage = this.onWebsocketMessage;
		this.ws.onclose = (e) => console.log('ws closed', e); // retry?

		this.getUserMedia = getUserMedia;

	}

	// the server will tell us all the signaling
	// it will also tell us who is in the room
	// it will also be sending state updates


	// it is the responsibility of everyone in the room to initiate a call.
	// websocket will notify a person has joined.
	// then everyone will call that person
	onWebsocketMessage(msg) {

		const parsed = JSON.parse(msg);
		// we expect { type, payload, user }
		switch(parsed.type) {

			case "signaling":
				this.onSignal(parsed)
				break;
			case "member_join":
				this.onMemberJoin(parsed);
				break;
			default:
				console.log("no case for websocket message", parsed.type);
				break;
		}

	}

	onMemberJoin(msg) {

		const { payload, user } = msg;

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

		peerConn.ondatachannel = e => {
			e.channel.onmessage = msg => console.log('msg from', user, msg);
		}

		this.stream
			.then(stream => peerConn.addStream(stream))
			.then(() => peerConn.createOffer())
			.then(offer => peerConn.setLocalDescription(offer))
			.then(() => {
				this.ws.send(JSON.stringify(
					{
						room: {
							id: this.roomId
						},
						
					}
				))
			})
	}

	onSignal(msg) {

		const { payload, user } = msg

		if(payload.type === "offer") {
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