/*
 *
 * This uses code from a THREE.js Multiplayer boilerplate made by Or Fleisher:
 * https://github.com/juniorxsound/THREE.Multiplayer
 * Aidan Nelson, April 2020
 *
 */

class Scene {
  constructor() {
    //THREE scene
    this.scene = new THREE.Scene();

    //Utility
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // lerp value to be used when interpolating positions and rotations
    this.lerpValue = 0;

    //THREE Camera
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height);

    const deg = (Math.random() * 2 - 1) * Math.PI;

    this.camera.position.set(
      Math.sin(deg) * (Math.random() * 30 + 15),
      0,
      Math.cos(deg) * (Math.random() * 30 + 15)
    );
    this.scene.add(this.camera);

    // create an AudioListener and add it to the camera
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    //THREE WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialiasing: true,
    });
    this.renderer.setClearColor(new THREE.Color(0x000000));
    this.renderer.setSize(this.width, this.height);

    // add controls:
    this.controls = new FirstPersonControls(
      this.scene,
      this.camera,
      this.renderer
    );

    //Push the canvas to the DOM
    let domElement = document.getElementById("canvas-container");
    domElement.append(this.renderer.domElement);

    //Setup event listeners for events and handle the states
    window.addEventListener("resize", (e) => this.onWindowResize(e), false);

    // Helpers
    // this.scene.add(new THREE.GridHelper(500, 500));

    this.addLights();
    createEnvironment(this.scene, this.camera, this.renderer);

    // Start the loop
    this.frameCount = 0;
    this.update();
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Lighting 💡

  addLights() {
    this.scene.add(new THREE.AmbientLight());
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Clients 👫

  // add a client meshes, a video element and  canvas for three.js video texture
  addClient(id) {
    let videoMaterial = makeVideoMaterial(id);
    let otherMat = new THREE.MeshNormalMaterial();

    let head = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), [
      videoMaterial,
      videoMaterial,
      otherMat,
      otherMat,
      videoMaterial,
      videoMaterial,
    ]);

    // set position of head before adding to parent object
    head.position.set(0, 0, 0);

    // https://threejs.org/docs/index.html#api/en/objects/Group
    var group = new THREE.Group();
    group.add(head);

    // add group to scene
    this.scene.add(group);

    peers[id].group = group;

    peers[id].previousPosition = new THREE.Vector3();
    peers[id].previousRotation = new THREE.Quaternion();
    peers[id].desiredPosition = new THREE.Vector3();
    peers[id].desiredRotation = new THREE.Quaternion();
  }

  removeClient(id) {
    this.scene.remove(peers[id].group);
  }

  // overloaded function can deal with new info or not
  updateClientPositions(clientProperties) {
    this.lerpValue = 0;
    for (let id in clientProperties) {
      if (id != mySocket.id) {
        peers[id].previousPosition.copy(peers[id].group.position);
        peers[id].previousRotation.copy(peers[id].group.quaternion);
        peers[id].desiredPosition = new THREE.Vector3().fromArray(
          clientProperties[id].position
        );
        peers[id].desiredRotation = new THREE.Quaternion().fromArray(
          clientProperties[id].rotation
        );
      }
    }
  }

  interpolatePositions() {
    this.lerpValue += 0.1; // updates are sent roughly every 1/5 second == 10 frames
    for (let id in peers) {
      if (peers[id].group) {
        peers[id].group.position.lerpVectors(
          peers[id].previousPosition,
          peers[id].desiredPosition,
          this.lerpValue
        );
        peers[id].group.quaternion.slerpQuaternions(
          peers[id].previousRotation,
          peers[id].desiredRotation,
          this.lerpValue
        );
      }
    }
  }

  updateClientVolumes() {
    for (let id in peers) {
      let audioEl = document.getElementById(id + "_audio");
      if (audioEl && peers[id].group) {
        let distSquared = this.camera.position.distanceToSquared(
          peers[id].group.position
        );

        // from lucasio here: https://discourse.threejs.org/t/positionalaudio-setmediastreamsource-with-webrtc-question-not-hearing-any-sound/14301/29
        let volume = Math.min(1, 64 / distSquared);
        audioEl.volume = volume;
      }
    }
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Interaction 🤾‍♀️

  getPlayerPosition() {
    // TODO: use quaternion or are euler angles fine here?
    return [
      [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      [
        this.camera.quaternion._x,
        this.camera.quaternion._y,
        this.camera.quaternion._z,
        this.camera.quaternion._w,
      ],
    ];
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Rendering 🎥

  update() {
    requestAnimationFrame(() => this.update());
    this.frameCount++;

    updateEnvironment(this.scene, this.camera, this.renderer);

    if (this.frameCount % 25 === 0) {
      this.updateClientVolumes();
    }

    this.interpolatePositions();
    this.controls.update();
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Event Handlers 🍽

  onWindowResize(e) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Utilities

function makeVideoMaterial(id) {
  let videoElement = document.getElementById(id + "_video");
  let videoTexture = new THREE.VideoTexture(videoElement);

  let videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    overdraw: true,
    side: THREE.DoubleSide,
  });

  return videoMaterial;
}
