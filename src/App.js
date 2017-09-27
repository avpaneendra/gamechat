import React, { Component } from 'react';
import queryString from 'query-string'
import './App.css';

class App extends Component {

	constructor(props) {
		super(props)

		this.state = {
			receivedMessages: []
		}

		this.parsedQuery = queryString.parse(props.location.search)

		this.stream = navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})
		.then(stream => {
			console.log('adding stream')
			this.localConnection.addStream(stream);
			console.log('added stream')
			this.local_vid.srcObject = stream;

			this.stream.oninactive = () => console.log('inactive stream')

		})
		.catch(err => {
			console.error(err)
		})
	}

	receievedOffer = offer => {
		console.log('got offer', offer)

		//this.localConnection.addStream(this.stream)

		console.log('stream: ', this.stream)
		this.stream.then(() => this.localConnection.setRemoteDescription(new RTCSessionDescription(offer)))
		.then(() => this.localConnection.createAnswer())
		.then(answer => {
			this.localConnection.setLocalDescription(answer)
			this.ws.send(JSON.stringify({
				target: this.parsedQuery.target,
				from: this.parsedQuery.id,
				payload: answer
			}))
		})
	}

	receivedAnswer = answer => {
		console.log('got answer', answer)

		this.localConnection.setRemoteDescription(new RTCSessionDescription(answer))
		.then(() => console.log('set remote description, ready to send.'))
	}

	connectWs = () => {

		this.ws = new WebSocket("wss://metal.fish:8443?id=" + this.parsedQuery.id)
		//this.ws = new WebSocket("wss://localhost:8443?id=" + this.parsedQuery.id)
		this.ws.onopen = () => console.log('websocket open')
		this.ws.onerror = err => console.error(err)
		this.ws.onmessage = (msg) => {
			const parsed = JSON.parse(msg.data)
			console.log(parsed)

			if(parsed.init) {
				this.connect();
				return;
			}
			if(parsed.close) {
				this.remote_vid.srcObject = null;
				return;
			}
			// assume they always accept a connection targeted at them for now.

			const { payload } = parsed;

			if(payload.type === "offer") {
				this.receievedOffer(payload)
			}

			if(payload.type === "answer") {
				this.receivedAnswer(payload)
			}

			if(payload.candidate) {
				console.log(payload.candidate)
				this.localConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
					.then(x => console.log('ice candidate success'))
					.catch(x => console.log('ice candidate failed'))
			}
			else {
				console.log("null candidate")
			}

		}
		this.ws.onclose = () => {
			console.log('ws closed');
			setTimeout(x => {
				this.connectWs();
			}, 5000)
		}
	}

	componentDidMount() {

		this.localConnection = new RTCPeerConnection({
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
		});
		this.localConnection.ondatachannel = this.receiveChannelCallback;
		console.log(this.localConnection)

		this.sendChannel = this.localConnection.createDataChannel("sendChannel");
		this.sendChannel.onopen = () => { console.log('send channel open'); this.sendButton.disabled = false; }
		this.sendChannel.onclose = () => { console.log('sendchannel close'); this.sendButton.disabled = true; }


		this.localConnection.onicecandidate = e => {
			console.log("ice candidate event: " + e.candidate)
			if(e.candidate) {
				this.ws.send(JSON.stringify({
					from: this.parsedQuery.id,
					target: this.parsedQuery.target || "default",
					payload: { candidate: e.candidate} 
				}))
			}
		}
		this.localConnection.onaddstream = e => {
			console.log('add stream', e)
			this.remote_vid.srcObject = e.stream;
		}

		this.connectWs();

	}

	gotRemoteStream = event => {
		console.log('got remote stream')

		if(this.remote_vid.srcObject !== event.streams[0]) {
			this.remote_vid.srcObject = event.streams[0];
			console.log('set remote stream')
		}
	}
	receiveChannelCallback = (event) => {
		console.log(event, this.receiveChannel)
		this.receiveChannel = event.channel;
		this.receiveChannel.onmessage = this.onReceive;
		this.receiveChannel.onopen = () => console.log('receive channel open')
		this.receiveChannel.onclose = () => console.log('receive channel closed')
	}

	onReceive = msg => {
		this.setState({
			receivedMessages: [
				...this.state.receivedMessages,
				msg.data
			]
		})
	}

	send = () => {
		console.log('sending')
		const message = this.textInput.value;

		this.sendChannel.send(message)

		this.textInput.value = "";
		this.textInput.focus();
	}

	connect = () => {

		this.stream
			.then(() => this.localConnection.createOffer())
			.then(offer => this.localConnection.setLocalDescription(offer))
			.then(() => {
				this.ws.send(JSON.stringify(
					{
						from: this.parsedQuery.id,
						target: this.parsedQuery.target,
						payload: this.localConnection.localDescription
					}
				))
			})
			.catch(err => console.log(err))
	}

	disconnect = () => {

	}

	render() {
		return (
			<div>
				<div className="messagebox">
					<label htmlFor="message">Enter a message:
						<input type="text" name="message" id="message" ref={(input) => this.textInput = input} placeholder="Message" size="60" maxLength="120" />
					</label>
					<button id="sendButton" ref={x => this.sendButton = x} onClick={ () => this.send()}>send</button>
				</div>

				<video id="remote_vid" ref={x => this.remote_vid = x} autoPlay controls/>
				<video id="local_vid" ref={x => this.local_vid = x} autoPlay muted />
				<div id="receivebox">
					<p>Messages received:</p>
					{
						this.state.receivedMessages.map(m => <p key={m}>{m}</p>)
					}
				</div>
			</div>
		);
	}

}

export default App;
