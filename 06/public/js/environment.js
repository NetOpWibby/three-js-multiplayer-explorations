let myMesh;

function createEnvironment(scene) {
  console.log("Adding environment");

  const texture = new THREE.TextureLoader().load("../assets/texture.png");
  const myGeometry = new THREE.SphereGeometry(3, 12, 12);
  const myMaterial = new THREE.MeshBasicMaterial({ map: texture });

  myMesh = new THREE.Mesh(myGeometry, myMaterial);
  myMesh.position.set(5, 2, 5);

  scene.add(myMesh);
}


function updateEnvironment(scene) {
  myMesh.position.x += 0.01;
}
