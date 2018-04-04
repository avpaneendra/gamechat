import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'

import './style.css'

class Main extends Component {

	constructor(props) 
	{
		super(props)
		this.state = {
			room: 'roomname',
			roomType: 'fun'
		}
	}

	onUpdate = (e) => {
		this.setState({ room: e.target.value })
	}

	radio = (e) => {
		this.setState({ roomType: e.target.value })
	}

	onClick = () => {
		// redirect to the room
		console.log('click')

		this.props.history.push(`/${this.state.roomType}?room=${this.state.room}`)
	}

	render() {
		return <div className="big-main">

			<div className="thing">
				<div>Select a room name:</div>
				<input type="text" value={this.state.room} onChange={this.onUpdate} />
				<div>Select a Room type</div>
				<label>
					<input type="radio" value="fun" checked={this.state.roomType == 'fun'} onChange={this.radio} />
					Fun Cubes
				</label>
				<label>
					<input type="radio" value="boring" checked={this.state.roomType == 'boring'} onChange={this.radio} />
					Plain Boring
				</label>
				<label>
					<input type="radio" value="vwave" checked={this.state.roomType == 'vwave'} onChange={this.radio}/>
					Voice Wave
				</label>
				<div className="go" onClick={this.onClick}>Go</div>
			</div>
		</div>
	}
}

export default withRouter(Main);