import React, { Component } from 'react'
import * as THREE from 'three'
import queryString from 'query-string'

import Room from '../lib/room'
import Base from '../lib/base'
//const startTime = Date.now();

const shapes = [
	"plane",
	"box",
	"dodecahedron",
	"icosahedron",
	"cone",
	"cylinder"
]

const getShapeFromKey = (key) => {
	if(key == "plane") {
		return new THREE.PlaneBufferGeometry(100, 100);
	}

	if(key == "box") {
		return new THREE.BoxBufferGeometry(100, 100, 100);
	}

	if(key == "dodecahedron") {
		return new THREE.DodecahedronGeometry(50, 1);
	}

	if(key == "icosahedron") {
		return new THREE.IcosahedronGeometry(50, 1)
	}
	
	if(key == "cone") {
		return new THREE.ConeBufferGeometry(50, 100);
	}

	if(key == "cylinder") {
		return new THREE.CylinderBufferGeometry(50, 50, 100);
	}

	return new THREE.ConeBufferGeometry(50, 100);
}

export default class Fun extends Component {

	constructor(props) {
		super(props);

		this.parsedQuery = queryString.parse(props.location.search)

		this.stream = navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})


		this.shape_index = 0;

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
			state: { xspin: 0, yspin: 0, zspin: 0 },
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
		const spin_keys = new Set(["i", "j", "k", "l", "q"]);

		if(e.key == " ") {
			this.shape_index = (this.shape_index + 1) % shapes.length;
			this.videoElements.get(this.user_id).mesh.geometry = getShapeFromKey(shapes[this.shape_index]);

			this.room.wsSend("shape", {
				shape: shapes[this.shape_index]
			})
		}

		if(spin_keys.has(e.key)) {
			const increment = 0.01;
			const v = this.videoElements.get(this.user_id);

			if(e.key == "q") {
				this.room.wsSend("spin", { "spin": "stop"})
				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						xspin: 0,
						yspin: 0,
						zspin: 0
					}
				})
			}

			if(e.key == "i") {
				this.room.wsSend("spin", { "spin": "xup"})

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						xspin: v.state.xspin + increment
					}
				})
			}

			if(e.key == "j") {
				this.room.wsSend("spin", { "spin": "zdown"})

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						zspin: v.state.zspin - increment
					}
				})

			}
			if(e.key == "k") {
				this.room.wsSend("spin", { "spin": "xdown"})

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						xspin: v.state.xspin - increment
					}
				})
			}
			if(e.key == "l") {
				this.room.wsSend("spin", { "spin": "zup"})

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						zspin: v.state.zspin + increment
					}
				})
			}
		}

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

		if(data.type == "state") {
			// data.payload is a map of user ids and positions. update them
			console.log('got state msg')
			for(let user_id in data.payload) {
				user_id = parseFloat(user_id)
				if(this.user_id == user_id || !this.videoElements.has(user_id)) {
					continue;
				}

				console.log('updating position')
				const v = this.videoElements.get(user_id);
				const d = data.payload[user_id];
				v.mesh.position.x = d.x;
				v.mesh.position.y = d.y;

				v.state.xspin = d.xspin;
				v.state.yspin = d.yspin;
				v.state.zspin = d.zspin;

				v.mesh.geometry = getShapeFromKey(d.shape)

			}

		}
	}

	animate = (scene, camera) => {

		//this.videoElements.set(user.id, { videoElement: video, videoCanvas: canvas, videoTexture, mesh });
		if(this.scene !== scene) {
			this.scene = scene;
		}

		for(let [user, vids] of this.videoElements) {
			vids.videoCanvas.getContext('2d').drawImage(vids.videoElement, 0, 0, 520, 300);
			vids.videoTexture.needsUpdate = true;

			vids.mesh.rotation.x += vids.state.xspin;
			vids.mesh.rotation.y += vids.state.yspin;
			vids.mesh.rotation.z += vids.state.zspin;
			/*
			vids.mesh.position.x = Math.sin((Date.now() - vids.time)/(2 * Math.PI * 500) + vids.rand) * 200 ;
			vids.mesh.position.y = Math.cos((Date.now() - vids.time)/(2 * Math.PI * 500) + vids.rand) * 200;
			*/;

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
