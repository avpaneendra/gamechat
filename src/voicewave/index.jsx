import React, { Component } from 'react'
import * as THREE from 'three'
import queryString from 'query-string'

import Base from '../lib/base'
import Room from '../lib/room'

export default class VoiceWave extends Component {

	constructor(props) {
		super(props)
		this.audioElements = new Map();
	}

	componentDidMount() {

		this.stream = navigator.mediaDevices.getUserMedia({
			audio: true
		})

		this.stream.then(stream => setTimeout(() => this.onAddStream(this.user_id, stream), 400))

		this.audio_ctx = new AudioContext();
		const analyzer_node = this.audio_ctx.createAnalyser();

		this.parsedQuery = queryString.parse(this.props.location.search)
		this.user_id = this.parsedQuery.user || Math.random();


		const room = new Room(this.parsedQuery.room, this.user_id, this.stream);

		room.onAddStream = (user, event) => console.log('new stream!')
		room.onPeerDisconnect = (user, event) => {
			console.log('user disconnect!')
		}
	}

	onAddStream = (user_id, stream) => {

		const media_source = this.audio_ctx.createMediaStreamSource(stream);
		const analyzer_node = this.audio_ctx.createAnalyser();
		media_source.connect(analyzer_node)

		analyzer_node.fftSize = 2048;
		const bufferLength = analyzer_node.frequencyBinCount;
		const dataArray = new Float32Array(bufferLength);
		analyzer_node.getFloatFrequencyData(dataArray);

		const curve = new THREE.SplineCurve(dataArray.map((f, i) => new THREE.Vector2(i * 10, f)));
		const path = new THREE.Path(curve.getPoints(1024))
		const geo = path.createPointsGeometry(1024)
		const material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
		const splineObj = new THREE.Line(geo, material);

		this.audioElements.set(user_id, {
			source: media_source,
			analyzer: analyzer_node,
			length: bufferLength,
			data: dataArray,

			curve,
			path,
			geo,
			material,
			splineObj
		})

		console.log(this.scene)
		this.scene.add(splineObj);
	}

	animate = (scene, camera) => {

		if(this.scene !== scene) {
			console.log('setting scene');
			this.scene = scene;
		}

		this.audioElements.forEach((val, key) => {
			val.analyzer.getFloatFrequencyData(val.data);
			const vertices = [];
			for(let i = 0; i < Math.min(val.data.length, 700); i++) {
				if(i % 3 == 0) {
					vertices.push(new THREE.Vector3(i - 250,  (val.data[i] + 100), 0));
				}
			}
			val.splineObj.geometry.vertices  = vertices;
			val.splineObj.geometry.verticesNeedUpdate = true;
		})
	}


	render() {
		return <Base animate={this.animate.bind(this)} />
	}

}