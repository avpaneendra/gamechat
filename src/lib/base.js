import React, { Component } from 'react'
import * as THREE from 'three'

export default class ThreeContainer extends Component {

	componentDidMount() {
		this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 1, 1000);
		this.camera.position.z = 400;

		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		window.onresize = this.windowResize;

		document.querySelector("#container").appendChild(this.renderer.domElement);

		this._animate();
	}
	
	_animate = () => {
		this.props.animate(this.scene, this.camera);

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this._animate);
	}

	windowResize = () => {
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
	}

	render() {
		return <div id="container" />
	}
}