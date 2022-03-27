// controls implementation from https://github.com/yorb-club/YORB2020
// includes simple collision detection
// just add meshes to layer 3 to have them become collidable!

class FirstPersonControls {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.paused = false;

    this.cameraHeight = 1.5;

    this.raycaster = new THREE.Raycaster();

    this.longPressed = false;
    this.longPressTimeoutId;

    this.setupControls();
    this.setupCollisionDetection();

    this.v = (Math.random() + 1) * Math.random() > 0.5 ? 1 : -1;

    this.velocity.y = 0;
    // variables for drag controls
    this.onPointerDownPointerX = 0;
    this.isUserInteracting = false;
    this.camera.target = new THREE.Vector3(0, 0, 0);
    this.camera.lookAt(this.camera.target);

    this.computeCameraOrientation();
  }

  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }

  // Set up pointer lock controls and corresponding event listeners
  setupControls() {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.prevTime = performance.now();
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    document.addEventListener(
      "keydown",
      (event) => {
        switch (event.keyCode) {
          case 38: // up
          case 87: // w
            this.moveForward = true;
            break;

          case 37: // left
          case 65: // a
            this.moveLeft = true;
            break;

          case 32: // space
            if (this.v > 0) {
              this.moveLeft = true;
            } else {
              this.moveRight = true;
            }
            break;

          case 40: // down
          case 83: // s
            this.moveBackward = true;
            break;

          case 39: // right
          case 68: // d
            this.moveRight = true;
            break;
        }
      },
      false
    );

    document.addEventListener(
      "keyup",
      (event) => {
        switch (event.keyCode) {
          case 38: // up
          case 87: // w
            this.moveForward = false;
            break;

          case 37: // left
          case 65: // a
            this.moveLeft = false;
            break;

          case 32: // space
            if (this.v > 0) {
              this.moveLeft = false;
            } else {
              this.moveRight = false;
            }
            break;

          case 40: // down
          case 83: // s
            this.moveBackward = false;
            break;

          case 39: // right
          case 68: // d
            this.moveRight = false;
            break;
        }
      },
      false
    );

    this.renderer.domElement.addEventListener(
      "mousedown",
      (e) => {
        if (e.button > 0) return;
        this.onDocumentMouseDown(e);
      },
      false
    );
    this.renderer.domElement.addEventListener(
      "mousemove",
      (e) => {
        if (e.button > 0) return;
        this.onDocumentMouseMove(e);
      },
      false
    );
    this.renderer.domElement.addEventListener(
      "mouseup",
      (e) => {
        this.onDocumentMouseUp(e);
      },
      false
    );
    this.renderer.domElement.addEventListener(
      "mouseleave",
      (e) => {
        this.onDocumentMouseUp(e);
      },
      false
    );

    this.renderer.domElement.addEventListener(
      "touchstart",
      (e) => {
        this.onDocumentTouchStart(e);
      },
      false
    );
    this.renderer.domElement.addEventListener(
      "touchmove",
      (e) => {
        this.onDocumentTouchMove(e);
      },
      false
    );
    this.renderer.domElement.addEventListener(
      "touchend",
      (e) => {
        this.onDocumentTouchEnd(e);
      },
      false
    );
  }

  // clear control state every time we reenter the game
  clearControls() {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity.x = 0;
    this.velocity.z = 0;
    this.velocity.y = 0;
  }

  update() {
    this.detectCollisions();
    this.updateControls();
  }

  getCollidables() {
    let collidableMeshList = [];
    this.scene.traverse(function (object) {
      if (object.isMesh) {
        collidableMeshList.push(object);
      }
    });
    return collidableMeshList;
  }

  // update for these controls, which are unfortunately not included in the controls directly...
  // see: https://github.com/mrdoob/three.js/issues/5566
  updateControls() {
    let speed = 100;

    var time = performance.now();
    var rawDelta = (time - this.prevTime) / 1000;
    // clamp delta so lower frame rate clients don't end up way far away
    let delta = Math.min(rawDelta, 0.1);

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x =
      Number(this.moveRight || (this.longPressed && this.v < 0)) -
      Number(this.moveLeft || (this.longPressed && this.v > 0));
    this.direction.normalize(); // this ensures consistent this.movements in all this.directions

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * delta;
    }

    if (this.moveLeft || this.moveRight || this.longPressed) {
      this.velocity.x -= this.direction.x * speed * delta;
    }

    const r1 = this.getNormalizedOrbit();

    // left-right movement
    if (
      (this.velocity.x > 0 && !this.obstacles.left) ||
      (this.velocity.x < 0 && !this.obstacles.right)
    ) {
      this.camera.position.add(
        this.getCameraSideDirAlongXZPlane().multiplyScalar(
          (this.velocity.x * delta * 2 * r1) / 20
        )
      );
    }

    this.camera.position.add(
      this.getCameraSideDirAlongXZPlane().multiplyScalar(
        (this.v * 0.1 * r1) / 20
      )
    );

    const r2 = this.getOrbitRadius();

    this.camera.position.x *= r1 / r2;
    this.camera.position.z *= r1 / r2;

    if (r1 === 15) {
      this.moveForward = false;
    }

    if (r1 === 45) {
      this.moveBackward = false;
    }

    // front-back movement
    if (
      (this.velocity.z > 0 && !this.obstacles.backward) ||
      (this.velocity.z < 0 && !this.obstacles.forward)
    ) {
      this.camera.position.add(
        this.getCameraForwardDirAlongXZPlane().multiplyScalar(
          -this.velocity.z * delta
        )
      );
    }

    this.computeCameraOrientation();

    this.prevTime = time;
  }

  getCameraForwardDirAlongXZPlane() {
    let forwardDir = new THREE.Vector3(0, 0, -1);
    // apply the camera's current rotation to that direction vector:
    forwardDir.applyQuaternion(this.camera.quaternion);

    let forwardAlongXZPlane = new THREE.Vector3(forwardDir.x, 0, forwardDir.z);
    forwardAlongXZPlane.normalize();

    return forwardAlongXZPlane;
  }

  getNormalizedOrbit() {
    return Math.min(45, Math.max(15, this.getOrbitRadius()));
  }

  getOrbitRadius() {
    return Math.sqrt(
      this.camera.position.x * this.camera.position.x +
        this.camera.position.z * this.camera.position.z
    );
  }

  getCameraSideDirAlongXZPlane() {
    let sideDir = new THREE.Vector3(-1, 0, 0);
    // apply the camera's current rotation to that direction vector:
    sideDir.applyQuaternion(this.camera.quaternion);

    let forwardAlongXZPlane = new THREE.Vector3(sideDir.x, 0, sideDir.z);
    forwardAlongXZPlane.normalize();

    return forwardAlongXZPlane;
  }

  //==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//
  //==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//==//
  // Collision Detection 🤾‍♀️

  /*
   * setupCollisionDetection()
   *
   * Description:
   * This function sets up collision detection:
   * 	- creates this.collidableMeshList which will be populated by this.loadFloorModel function
   * 	- creates this.obstacles object which will be queried by player controls before performing movement
   * 	- generates arrays of collision detection points, from which we will perform raycasts in this.detectCollisions()
   *
   */
  setupCollisionDetection() {
    this.obstacles = {
      forward: false,
      backward: false,
      right: false,
      left: false,
    };
  }

  /*
   * detectCollisions()
   *
   * based on method shown here:
   * https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/Collision-Detection.html
   *
   * Description:
   * 1. Creates THREE.Vector3 objects representing the current forward, left, right, backward direction of the character.
   * 2. For each side of the cube,
   * 		- uses the collision detection points created in this.setupCollisionDetection()
   *		- sends a ray out from each point in the direction set up above
   * 		- if any one of the rays hits an object, set this.obstacles.SIDE (i.e. right or left) to true
   * 3. Give this.obstacles object to this.controls
   *
   * To Do: setup helper function to avoid repetitive code
   */
  detectCollisions() {
    // reset obstacles:
    this.obstacles = {
      forward: false,
      backward: false,
      right: false,
      left: false,
    };

    // TODO only use XZ components of forward DIR in case we are looking up or down while travelling forward
    // NOTE: THREE.PlayerControls seems to be backwards (i.e. the 'forward' controls go backwards)...
    // Weird, but this function respects those directions for the sake of not having to make conversions
    // https://github.com/mrdoob/three.js/issues/1606
    var matrix = new THREE.Matrix4();
    matrix.extractRotation(this.camera.matrix);
    var backwardDir = new THREE.Vector3(0, 0, 1).applyMatrix4(matrix);
    var forwardDir = backwardDir.clone().negate();
    var rightDir = forwardDir
      .clone()
      .cross(new THREE.Vector3(0, 1, 0))
      .normalize();
    var leftDir = rightDir.clone().negate();

    // TODO more points around avatar so we can't be inside of walls
    // let pt = this.controls.getObject().position.clone()
    let pt = this.camera.position.clone();

    this.forwardCollisionDetectionPoints = [pt];
    this.backwardCollisionDetectionPoints = [pt];
    this.rightCollisionDetectionPoints = [pt];
    this.leftCollisionDetectionPoints = [pt];

    // check forward
    this.obstacles.forward = this.checkCollisions(
      this.forwardCollisionDetectionPoints,
      forwardDir
    );
    this.obstacles.backward = this.checkCollisions(
      this.backwardCollisionDetectionPoints,
      backwardDir
    );
    this.obstacles.left = this.checkCollisions(
      this.leftCollisionDetectionPoints,
      leftDir
    );
    this.obstacles.right = this.checkCollisions(
      this.rightCollisionDetectionPoints,
      rightDir
    );
  }

  checkCollisions(pts, dir) {
    // distance at which a collision will be detected and movement stopped (this should be greater than the movement speed per frame...)
    var detectCollisionDistance = 1;

    for (var i = 0; i < pts.length; i++) {
      var pt = pts[i].clone();

      this.raycaster.set(pt, dir);
      this.raycaster.layers.set(3);
      var collisions = this.raycaster.intersectObjects(this.getCollidables());

      if (
        collisions.length > 0 &&
        collisions[0].distance < detectCollisionDistance
      ) {
        return true;
      }
    }
    return false;
  }

  onDocumentMouseDown(event) {
    this.onPointerDownPointerX = event.clientX;
    this.isUserInteracting = true;

    this.longPressTimeoutId = setTimeout(() => {
      this.longPressed = true;
    }, 300);
  }

  onDocumentTouchStart(event) {
    if (event.touches.length !== 1) return;

    this.onDocumentMouseDown(event.touches[0]);
  }

  onDocumentMouseMove(event) {
    clearTimeout(this.longPressTimeoutId);

    if (this.isUserInteracting && !this.longPressed) {
      const r1 = this.getNormalizedOrbit();

      this.computeCameraOrientation();
      this.camera.position.add(
        this.getCameraSideDirAlongXZPlane().multiplyScalar(
          ((this.onPointerDownPointerX - event.clientX) * -0.2 * r1) / 20
        )
      );

      this.onPointerDownPointerX = event.clientX;

      const r2 = this.getOrbitRadius();

      this.camera.position.x *= r1 / r2;
      this.camera.position.z *= r1 / r2;
    }
  }

  onDocumentTouchMove(event) {
    clearTimeout(this.longPressTimeoutId);

    if (event.touches.length !== 1) return;

    this.onDocumentMouseMove(event.touches[0]);
  }

  onDocumentMouseUp(event) {
    clearTimeout(this.longPressTimeoutId);
    this.longPressed = false;
    this.isUserInteracting = false;
  }

  onDocumentTouchEnd(event) {
    clearTimeout(this.longPressTimeoutId);
    this.longPressed = false;
    this.isUserInteracting = false;
  }

  computeCameraOrientation() {
    this.camera.target.x = 0;
    this.camera.target.y = 0;
    this.camera.target.z = 0;
    this.camera.lookAt(this.camera.target);
  }
}
