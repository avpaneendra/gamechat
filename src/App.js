import React, { Component } from 'react';
import queryString from 'query-string'
import Room from './room';

import './App.css';

class App extends Component {

	constructor(props) {
		super(props)

		this.parsedQuery = queryString.parse(props.location.search)

		this.stream = navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})

		this.user_id = this.parsedQuery.user || Math.random();

		this.state = {
			remoteStreams: []
		}

	}

	componentDidMount() {

		const room = new Room(this.parsedQuery.id, this.user_id, this.stream);

		this.stream.then(stream => this.local_vid.srcObject = stream)

		room.onAddStream = (user, streamEvent) => this.setState({
			remoteStreams: [
				...this.state.remoteStreams,
				{
					user,
					stream: streamEvent.stream
				}
			]
		}, () => {
			console.log(this[user.id + "_video"])
			console.log(streamEvent)
			this[user.id + "_video"].srcObject = streamEvent.stream;
		})

		room.onPeerDisconnect = (user, event) => this.setState({
			remoteStreams: [...this.state.remoteStreams].filter(s => s.user.id !== user.id)
		})
	}

	render() {
		return (
			<div>
				<video id="local_vid" ref={x => this.local_vid = x} autoPlay muted />
				{
					this.state.remoteStreams.map(s =>
						<video id={s.user.id} key={s.user.id} ref={x => {
							this[s.user.id + "_video"] = x;
							}} autoPlay controls />
					)
				}
			</div>
		);
	}

}

export default App;
