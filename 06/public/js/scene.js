/*
 *
 * This uses code from a THREE.js Multiplayer boilerplate made by Or Fleisher:
 * https://github.com/juniorxsound/THREE.Multiplayer
 * Aidan Nelson, April 2020
 *
 */

// import { Octree } from "three/addons/math/Octree.js";
// import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";

class Scene {
  constructor() {
    //THREE scene
    this.scene = new THREE.Scene();

    //Utility
    this.height = window.innerHeight; // * 0.9;
    this.width = window.innerWidth;

    // lerp value to be used when interpolating positions and rotations
    this.lerpValue = 0;

    //THREE Camera
    // this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 5000);
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    // this.camera.position.set(0, 3, 6);
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.order = "YXZ"; //

    this.scene.add(this.camera);

    // create an AudioListener and add it to the camera
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    //THREE WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ antialiasing: true });
    this.renderer.setClearColor(new THREE.Color("lightblue"));

    this.renderer.setPixelRatio(window.devicePixelRatio); //
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // add controls:
    this.controls = new FirstPersonControls(this.scene, this.camera, this.renderer);

    //Push the canvas to the DOM
    const domElement = document.getElementById("canvas-container");
    domElement.append(this.renderer.domElement);

    //Setup event listeners for events and handle the states
    window.addEventListener("resize", e => this.onWindowResize(e), false);

    // Helpers
    this.scene.add(new THREE.GridHelper(500, 500));
    this.scene.add(new THREE.AxesHelper(10));
    this.addLights();

    // createEnvironment(this.scene); // random ball

    // Start the loop
    this.frameCount = 0;
    this.update();
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Lighting 💡

  addLights() {
    // this.scene.add(new THREE.AmbientLight(0xffffe6, 0.7));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); //
    const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5); //

    fillLight1.position.set(2, 1, 1);
    this.scene.background = new THREE.Color(0x88ccee);
    this.scene.fog = new THREE.Fog(0x88ccee, 0, 50);
    this.scene.add(fillLight1);

    directionalLight.position.set(- 5, 25, - 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = - 30;
    directionalLight.shadow.camera.top  = 30;
    directionalLight.shadow.camera.bottom = - 30;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = - 0.00006;
    this.scene.add(directionalLight);
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Clients 👫

  // add a client meshes, a video element and canvas for three.js video texture
  addClient(id) {
    const videoMaterial = makeVideoMaterial(id);
    const otherMat = new THREE.MeshNormalMaterial();
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [otherMat,otherMat,otherMat,otherMat,otherMat,videoMaterial]);

    // set position of head before adding to parent object
    head.position.set(0, 0, 0);

    // https://threejs.org/docs/index.html#api/en/objects/Group
    const group = new THREE.Group();
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

    for (const id in clientProperties) {
      if (id !== mySocket.id) {
        peers[id].previousPosition.copy(peers[id].group.position);
        peers[id].previousRotation.copy(peers[id].group.quaternion);
        peers[id].desiredPosition = new THREE.Vector3().fromArray(clientProperties[id].position);
        peers[id].desiredRotation = new THREE.Quaternion().fromArray(clientProperties[id].rotation);
      }
    }
  }

  interpolatePositions() {
    this.lerpValue += 0.1; // updates are sent roughly every 1/5 second == 10 frames

    for (const id in peers) {
      if (peers[id].group) {
        peers[id].group.position.lerpVectors(peers[id].previousPosition,peers[id].desiredPosition, this.lerpValue);
        peers[id].group.quaternion.slerpQuaternions(peers[id].previousRotation,peers[id].desiredRotation, this.lerpValue);
      }
    }
  }

  updateClientVolumes() {
    for (const id in peers) {
      const audioEl = document.getElementById(`${id}_audio`);

      if (audioEl && peers[id].group) {
        const distSquared = this.camera.position.distanceToSquared(peers[id].group.position);

        if (distSquared > 500) {
          audioEl.volume = 0;
        } else {
          // from lucasio here: https://discourse.threejs.org/t/positionalaudio-setmediastreamsource-with-webrtc-question-not-hearing-any-sound/14301/29
          const volume = Math.min(1, 10 / distSquared);
          audioEl.volume = volume;
        }
      }
    }
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Interaction 🤾‍♀️

  getPlayerPosition() {
    // TODO: use quaternion or are euler angles fine here?
    return [
      [
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
      ],
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

    // updateEnvironment(); // random ball

    if (this.frameCount % 25 === 0)
      this.updateClientVolumes();

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

  onWindowResize(_) {
    this.width = window.innerWidth;
    this.height = Math.floor(window.innerHeight * 0.9);

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }
}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Utilities

function makeVideoMaterial(id) {
  const videoElement = document.getElementById(`${id}_video`);
  const videoTexture = new THREE.VideoTexture(videoElement);

  const videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    overdraw: true,
    side: THREE.DoubleSide
  });

  return videoMaterial;
}
