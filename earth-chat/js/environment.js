let myMesh;

function createEnvironment(scene, camera, renderer) {
  console.log("Adding environment");

  let texture = new THREE.TextureLoader().load(
    "https://cdn.glitch.global/3c1bb2de-b910-4800-9b53-fba67f5b2e9b/earth.jpg?v=1648264628817"
  );
  let myGeometry = new THREE.SphereGeometry(3, 40, 20);
  let myMaterial = new THREE.MeshBasicMaterial({
    map: texture,
  });
  myMaterial.map.minFilter = THREE.LinearFilter;
  myMesh = new THREE.Mesh(myGeometry, myMaterial);
  myMesh.position.set(0, 0, 0);
  scene.add(myMesh);

  for (let i = 0; i < 200; ++i) {
    const starGeo = new THREE.SphereGeometry(Math.random() * 0.2 + 0.12, 4, 2);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const starMesh = new THREE.Mesh(starGeo, starMat);

    let a1 = Math.random() * Math.PI * 2;
    let a2 = (Math.random() - 0.5) * Math.PI;
    let d = Math.random() * 100 + 100;
    let d0 = Math.cos(a2) * d;

    starMesh.position.set(
      Math.sin(a1) * d0,
      Math.sin(a2) * d,
      Math.cos(a1) * d0
    );
    scene.add(starMesh);
  }
}

function updateEnvironment(scene, camera, renderer) {}
