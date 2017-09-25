import React, { Component } from 'react';
import './App.css';

class App extends Component {

	constructor(props) {
		super(props)

		this.state = {
			receivedMessages: []
		}
	}

	receievedOffer = offer => {
		console.log('got offer', offer)

		this.remoteConnection.setRemoteDescription(new RTCSessionDescription(offer))
		.then(() => this.remoteConnection.createAnswer())
		.then(answer => {
			this.remoteConnection.setLocalDescription(answer)
			this.ws.send(JSON.stringify(answer))
		})
	}

	receivedAnswer = answer => {
		console.log('got answer', answer)

		this.localConnection.setRemoteDescription(new RTCSessionDescription(answer))
		.then(() => console.log('set remote description, ready to send.'))
	}

	connectWs = () => {

		this.ws = new WebSocket("ws://localhost:8080")
		this.ws.onopen = () => console.log('websocket open')
		this.ws.onmessage = (msg) => {
			const parsed = JSON.parse(msg.data)
			console.log(parsed)

			if(parsed.type == "offer") {
				this.receievedOffer(parsed)
			}

			if(parsed.type == "answer") {
				this.receivedAnswer(parsed)
			}

			if(parsed.candidate) {
				this.remoteConnection.addIceCandidate(new RTCIceCandidate(parsed.candidate))
				this.localConnection.addIceCandidate(new RTCIceCandidate(parsed.candidate))
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
		this.localConnection = new RTCPeerConnection();

		this.sendChannel = this.localConnection.createDataChannel("sendChannel");
		this.sendChannel.onopen = () => { console.log('send channel open'); this.sendButton.disabled = false; }
		this.sendChannel.onclose = () => { console.log('sendchannel close'); this.sendButton.disabled = true; }

		this.connectWs();

		this.remoteConnection = new RTCPeerConnection();
		this.remoteConnection.ondatachannel = this.receiveChannelCallback;

		this.localConnection.onicecandidate = e => {
			console.log("ice candidate event: " + e)
			this.ws.send(JSON.stringify({candidate: e.candidate}))
		}
		this.localConnection.onaddstream = e => {
			console.log('add stream')
		}



		this.localConnection.createOffer()
			.then(offer => this.localConnection.setLocalDescription(offer))
			.then(() => {
				this.ws.send(JSON.stringify(this.localConnection.localDescription))
			})
			/*
				this.remoteConnection.setRemoteDescription(this.localConnection.localDescription);
			})
			.then(() => this.remoteConnection.createAnswer())
			.then(answer => {
				this.remoteConnection.setLocalDescription(answer);

				this.ws.send(JSON.stringify(answer))
			})
			.then(() => { this.localConnection.setRemoteDescription(this.remoteConnection.localDescription); console.log(this.remoteConnection); })
			.catch(err => console.error('create description error', err))
			*/

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
				<button id="connecto" onClick={this.connect}>Connect</button>
				<button id="disconnecto" onClick={this.disconnect}>Disconnect</button>

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
