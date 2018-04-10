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
		return new THREE.PlaneBufferGeometry(200, 100);
	}

	if(key == "box") {
		return new THREE.BoxBufferGeometry(200, 100, 100);
	}

	if(key == "dodecahedron") {
		return new THREE.DodecahedronGeometry(100, 1);
	}

	if(key == "icosahedron") {
		return new THREE.IcosahedronGeometry(100, 1)
	}
	
	if(key == "cone") {
		return new THREE.ConeBufferGeometry(50, 100);
	}

	if(key == "cylinder") {
		return new THREE.CylinderBufferGeometry(50, 50, 100);
	}

	return new THREE.ConeBufferGeometry(50, 100);
}

const getStepSize = (current, target) => {

	const stepSize = 0.75;

	const diff = target - current;
	const direction = Math.abs(diff)/diff; // either 1 or -1

	return 0.1 * diff;

	if(Math.abs(diff) > 40 * stepSize) {
		return 0.1 * diff;
	}

	if(Math.abs(diff) < 1) {
		return diff;
	}

	return stepSize * direction;
}

let lastDraw;

export default class Fun extends Component {

	constructor(props) {
		super(props);

		this.parsedQuery = queryString.parse(props.location.search)

		this.stream = navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})
		.catch(err => navigator.mediaDevices.getUserMedia({ audio: true }))


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
		/*
		canvas.width = 512;
		canvas.height = 256;
		*/
		canvas.width = 512;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')
		ctx.fillStyle = "#fff000"
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		const videoTexture = new THREE.Texture(canvas);

		const geometry = getShapeFromKey("plane");
		const material = new THREE.MeshBasicMaterial({
			map: videoTexture,
			side: THREE.DoubleSide
		})

		const mesh = new THREE.Mesh(geometry, material)

		mesh.position.x = 0;
		mesh.position.y = 0; 
		this.scene.add(mesh)
		console.log('added to scene')

		this.videoElements.set(user.id, { 
			videoElement: video, 
			videoCanvas: canvas, 
			videoTexture, 
			mesh,
			state: { 
				rotation: {
					x: 0,
					y: 0,
					z: 0
				},
				orientation: new THREE.Quaternion(0, 0, 0, 1),
				position: {
					x: 0,
					y: 0
				}
			},
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
			const increment = 0.1;
			const v = this.videoElements.get(this.user_id);
			const orientation = {
				w: v.mesh.quaternion.w,
				x: v.mesh.quaternion.x,
				y: v.mesh.quaternion.y,
				z: v.mesh.quaternion.z
			}


			//console.log(v.mesh.rotation)

			if(e.key == "q") {
				this.room.wsSend("spin", {spin: "stop", orientation})
				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						rotation: {
							x: 0,
							y: 0,
							z: 0
						},
						orientation
					}
				})
			}

			if(e.key == "i") {
				this.room.wsSend("spin", {spin: "xup", orientation })

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						rotation: {
							...v.state.rotation,
							x: v.state.rotation.x + increment
						},
						orientation
					}
				})
			}

			if(e.key == "j") {
				this.room.wsSend("spin", {spin: "zdown", orientation})

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						rotation: {
							...v.state.rotation,
							z: v.state.rotation.z - increment
						},
						orientation
					}
				})

			}
			if(e.key == "k") {
				this.room.wsSend("spin", {spin: "xdown", orientation})

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						rotation: {
							...v.state.rotation,
							x: v.state.rotation.x - increment
						},
						orientation
					}
				})
			}
			if(e.key == "l") {
				this.room.wsSend("spin", {spin: "zup", orientation})

				this.videoElements.set(this.user_id, {
					...v,
					state: {
						...v.state,
						rotation: {
							...v.state.rotation,
							z: v.state.rotation.z + increment
						},
						orientation
					}
				})
			}
		}

		if(move_keys.has(e.key)) {
			e.preventDefault();

			this.room.wsSend("move", { 
				direction: e.key
			});

			const increment = 10;
			if(e.key === "ArrowUp") {
				v.state.position.y += increment;
			}
			else if(e.key === "ArrowDown") {
				v.state.position.y -= increment;
			}
			else if(e.key === "ArrowRight") {
				v.state.position.x += increment;
			}
			else if(e.key === "ArrowLeft") {
				v.state.position.x -= increment;
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
				//if(this.user_id == user_id || !this.videoElements.has(user_id)) {
				if(!this.videoElements.has(user_id)) {
					continue;
				}

				console.log('updating position')
				const v = this.videoElements.get(user_id);
				const d = data.payload[user_id];

				v.state = d;

				v.mesh.geometry = getShapeFromKey(d.shape)

			}
		}
	}

	animate = (scene, camera) => {

		const n = Date.now();

		let interval = 300;    // pretend its been this many milliseconds

		if(lastDraw) {
			interval = n - lastDraw;
		}

		lastDraw = n;

		//this.videoElements.set(user.id, { videoElement: video, videoCanvas: canvas, videoTexture, mesh });
		if(this.scene !== scene) {
			this.scene = scene;
		}

		for(let [user, vids] of this.videoElements) {
			vids.videoCanvas.getContext('2d').drawImage(vids.videoElement, 0, 0, 520, 300);
			vids.videoTexture.needsUpdate = true;

			const rot = vids.state.rotation;
			vids.mesh.rotation.x += (Math.PI) * vids.state.rotation.x * interval/1000;
			vids.mesh.rotation.y += (Math.PI) * vids.state.rotation.y * interval/1000;
			vids.mesh.rotation.z += (Math.PI) * vids.state.rotation.z * interval/1000;

			if(rot.x == 0 && rot.y == 0 && rot.z == 0) {
				const o = vids.state.orientation;
				// make sure you slerp to the correct orientation.
				const target = new THREE.Quaternion(o.x, o.y, o.z, o.w);
				vids.mesh.setRotationFromQuaternion(vids.mesh.quaternion.slerp(target, 0.01))

				//console.log('setting mesh to target', user, target)
			}


			const stepSize = 1.0;
			const xdiff = getStepSize(vids.mesh.position.x, vids.state.position.x)
			const ydiff = getStepSize(vids.mesh.position.y, vids.state.position.y)

			vids.mesh.position.x += xdiff;
			vids.mesh.position.y += ydiff;
			/*
			const xdiff = vids.state.position.x - vids.mesh.position.x;
			if(Math.abs(xdiff) < 0.5) {
				vids.mesh.position.x += xdiff;
			}
			else {
				vids.mesh.position.x += xdiff > 0 ? stepSize : -stepSize;
			}

			const ydiff = vids.state.position.y - vids.mesh.position.y;
			if(Math.abs(ydiff) < 0.5) {
				vids.mesh.position.y += ydiff;
			}
			else {
				vids.mesh.position.y += ydiff > 0 ? stepSize : -stepSize;
			}
			*/
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
