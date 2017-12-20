import React, { Component } from 'react'
import * as THREE from 'three'
import queryString from 'query-string'

import Room from '../lib/room'
import Base from '../lib/base'
//const startTime = Date.now();

export default class Fun extends Component {

	constructor(props) {
		super(props);

		this.parsedQuery = queryString.parse(props.location.search)

		this.stream = navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})

		this.user_id = this.parsedQuery.user || Math.random();

		this.videoElements = new Map(); // userId, { videoElement, videoCanvas, videoTexture }
	}

	addStream = (user, stream) => {
		console.log('new stream');

		if(this.videoElements.has(user.id)) {
			console.log('already have it')
		}

		const video = document.createElement('video');
		video.srcObject = stream;
		video.muted = true;
		video.play();

		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')
		ctx.fillStyle = "#fff000"
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		const videoTexture = new THREE.Texture(canvas);

		const geometry = new THREE.BoxBufferGeometry(100, 100, 100);
		const material = new THREE.MeshBasicMaterial({
			map: videoTexture
		})

		const mesh = new THREE.Mesh(geometry, material)
		//mesh.position.x = Math.random() * 400 - 200;
		//mesh.position.y = Math.random() * 200 - 100;
		mesh.position.x = 0;
		mesh.position.y = 0; 
		this.scene.add(mesh)
		console.log('added to scene')

		this.videoElements.set(user.id, { 
			videoElement: video, 
			videoCanvas: canvas, 
			videoTexture, 
			mesh,
			time: Date.now(),
			rand: Math.random() * 100
		});
	}

	componentDidMount() {

		const room = new Room(this.parsedQuery.room, this.user_id, this.stream, "Navigator");
		this.room = room;

		room.onAddStream = (user, event) => this.addStream(user, event.stream)
		room.onPeerDisconnect = (user, event) => {
			console.log("DISCONNECT")
			this.scene.remove(this.videoElements.get(user.id).mesh)
			this.videoElements.delete(user.id) 
		}

		this.stream.then(stream => this.addStream({ id: this.user_id }, stream));

		document.onkeydown = this.onKeyDown;
		this.room.onGameMessage = this.onGameMessage;
	}

	onKeyDown = e => {
		console.log(e.key)

		const v = this.videoElements.get(this.user_id);
		//const d = { up: false, down: false, left: false, right: false };
		// keep "virtual" position of my guy locally in mesh.position.
		// transmit the 'move' 

		const move_keys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

		if(move_keys.has(e.key)) {
			e.preventDefault();

			this.room.wsSend("move", { 
				direction: e.key
			});

			if(e.key === "ArrowUp") {
				v.mesh.position.y += 10;
			}
			else if(e.key === "ArrowDown") {
				v.mesh.position.y -= 10;
			}
			else if(e.key === "ArrowRight") {
				v.mesh.position.x += 10;
			}
			else if(e.key === "ArrowLeft") {
				v.mesh.position.x -= 10;
			}
		}

	}

	onGameMessage = data => {
		console.log('got game message', data)
	}

	animate = (scene, camera) => {

		//this.videoElements.set(user.id, { videoElement: video, videoCanvas: canvas, videoTexture, mesh });
		if(this.scene !== scene) {
			this.scene = scene;
		}

		for(let [user, vids] of this.videoElements) {
			vids.videoCanvas.getContext('2d').drawImage(vids.videoElement, 0, 0, 520, 300);
			vids.videoTexture.needsUpdate = true;

			/*
			vids.mesh.rotation.x += 0.005;
			vids.mesh.rotation.y += 0.01;
			vids.mesh.position.x = Math.sin((Date.now() - vids.time)/(2 * Math.PI * 500) + vids.rand) * 200 ;
			vids.mesh.position.y = Math.cos((Date.now() - vids.time)/(2 * Math.PI * 500) + vids.rand) * 200;
			*/

			if(user !== this.user_id) {
				vids.videoElement.muted = false;
			}
		}
	}

	render() {
		//return <div id="container"></div>
		return <Base animate={this.animate.bind(this)} />
	}
}
