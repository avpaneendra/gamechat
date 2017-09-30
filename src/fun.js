import React, { Component } from 'react'
import * as THREE from 'three'
import queryString from 'query-string'
import Room from './room'

const startTime = Date.now();

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
		mesh.position.x = Math.random() * 400 - 200;
		mesh.position.y = Math.random() * 200 - 100;
		this.scene.add(mesh)
		console.log('added to scene')

		this.videoElements.set(user.id, { 
			videoElement: video, 
			videoCanvas: canvas, 
			videoTexture, 
			mesh,
			time: Date.now()
		});
	}

	componentDidMount() {

		const room = new Room(this.parsedQuery.room, this.user_id, this.stream);

		room.onAddStream = (user, event) => this.addStream(user, event.stream)
		room.onPeerDisconnect = (user, event) => this.videoElements.delete(user.id) 

		this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 1, 1000);
		this.camera.position.z = 400;

		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		document.querySelector("#container").appendChild(this.renderer.domElement)

		this.stream.then(stream => this.addStream(this.user_id, stream));

		this.animate()

	}

	animate = () => {

		//this.videoElements.set(user.id, { videoElement: video, videoCanvas: canvas, videoTexture, mesh });
		for(let vids of this.videoElements.values()) {
			vids.videoCanvas.getContext('2d').drawImage(vids.videoElement, 0, 0);
			vids.videoTexture.needsUpdate = true;

			vids.mesh.rotation.x += 0.005;
			vids.mesh.rotation.y += 0.01;
			vids.mesh.position.x = Math.sin((Date.now() - vids.time)/(2 * Math.PI * 500)) * 200;
			vids.mesh.position.y = Math.cos((Date.now() - vids.time)/(2 * Math.PI * 500)) * 200;
		}

		this.renderer.render(this.scene, this.camera)
		requestAnimationFrame(this.animate)
	}

	render() {
		return <div id="container"></div>
	}
}