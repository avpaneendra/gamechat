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

		room.onAddStream = (user, event) => this.onAddStream(user.id, event.stream);
		room.onPeerDisconnect = (user, event) => {
			console.log('user disconnect!')

			const entry = this.audioElements.get(user.id);

			this.scene.remove(entry.splineObj);
			document.removeChild(entry.sound);
			this.audioElements.delete(user.id);
		}
	}

	onAddStream = (user_id, stream) => {
		console.log("ADDING ", user_id)

		const media_source = this.audio_ctx.createMediaStreamSource(stream);
		console.log(media_source)
		const analyzer_node = this.audio_ctx.createAnalyser();
		media_source.connect(analyzer_node)

		analyzer_node.fftSize = 2048;
		const bufferLength = analyzer_node.frequencyBinCount;
		const dataArray = new Float32Array(bufferLength);
		analyzer_node.getFloatFrequencyData(dataArray);

		const curve = new THREE.SplineCurve(dataArray.map((f, i) => new THREE.Vector2(i * 10, f)));
		const path = new THREE.Path(curve.getPoints(1024))
		const geo = path.createPointsGeometry(1024)
		const material = new THREE.LineBasicMaterial({ color: user_id * (0xffffff), linewidth: 50});
		const splineObj = new THREE.Line(geo, material);

		let sound;
		if(user_id != this.user_id) {
			sound = document.createElement('audio');
			sound.muted = false;
			sound.srcObject = stream;
			sound.play();
		}

		this.audioElements.set(user_id, {
			source: media_source,
			analyzer: analyzer_node,
			length: bufferLength,
			data: dataArray,
			sound,
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
			vertices.push(new THREE.Vector3(-250, 0, 0))
			for(let i = 0; i < Math.min(val.data.length, 150); i++) {

				if(val.data[i] < -100) {
					vertices.push(new THREE.Vector2(3 * i - 250, 0, 0));
				}
				else {
					if(i % 6 == 0) {
						if(i % 12 == 0) {
							vertices.push(new THREE.Vector3(3*i - 250,  -1 * (val.data[i] + 100), 0));
						}
						else {
							vertices.push(new THREE.Vector3(3*i - 250,  (val.data[i] + 100), 0));
						}
					}
				}
			}
			vertices.push(new THREE.Vector3(3 * Math.min(val.data.length, 150) - 250, 0, 0))

			const curve = new THREE.SplineCurve(vertices);
			const path = new THREE.Path(curve.getPoints(1024))
			const v = path.createPointsGeometry(1024).vertices;
			
			val.splineObj.geometry.vertices  = v;
			val.splineObj.geometry.verticesNeedUpdate = true;
		})
	}


	render() {
		return <Base animate={this.animate.bind(this)} />
	}

}