


/// import

import * as Physics from "physicsjs";
import * as THREE from "three";
import { Vector3 } from "three";

var renderer, camera, scene;
let puck, human, cpu;

function createScene() {
  scene = new THREE.Scene();
}

function createLoop() {
  const loop = new Loop(camera, scene, renderer);
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x99e0ff);

  document.body.appendChild(renderer.domElement);
}

function animation() {
  renderer.setAnimationLoop(() => {
    console.log(Math.round(puck.position.z));

    cpu.position.x = puck.position.x / 2 - 4;
    renderer.render(scene, camera);

    collisionsZ();
  });
}

function collisionsZ() {
  let topZ, bottomZ;
  let humanZ, cpuZ;

  topZ = 10;
  bottomZ = -20;
  humanZ = human.position.z;
  cpuZ = cpu.position.z + 1;

  if ((puck.position.x >= cpu.position.x - 4) | (puck.position.x <= cpu.position.x + 4)) {
    if ((Math.round(puck.position.z) === cpuZ) | (puck.rotation.y >= Math.PI)) {
      puck.position.z += 0.2;
      puck.position.x += 0.1;
      puck.rotation.y = Math.PI;
    } /*else if (puck.position.x <= cpu.position.x - 4 | puck.position.x >= cpu.position.x + 4) {
      puck.position.z -= 0.2;
    }*/
  } else if (puck.position.z < cpuZ) {
    puck.position.set(0, 0, -20);
    alert("WINNER");
  }

  if ((puck.position.x >= human.position.x - 4) | (puck.position.x <= human.position.x + 4)) {
    if ((Math.round(puck.position.z) === humanZ) | (puck.rotation.y <= 0)) {
      puck.position.z -= 0.2;
      puck.position.x -= 0.1;
      puck.rotation.y = 0;
    } /*else if (puck.position.x <= human.position.x - 4 | puck.position.x >= human.position.x + 4) {
      puck.position.z += 0.2;
    }*/
  } else if (puck.position.z > humanZ) {
    puck.position.set(0, 0, -20);
    alert("LOSER");
  }
}

function createSurface() {
  const surfaceGeometry = new THREE.BoxGeometry(100, 1, 100);
  const surfaceMaterial = new THREE.MeshPhongMaterial({ color: 0x64ff5c });
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

  scene.add(surface);
  surface.position.set(0, -1, 0);
}

function createcamera() {
  camera = new THREE.PerspectiveCamera(
    80,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.name = "camera";
  camera.position.set(0, 15, 20);
  camera.rotation.set(-44.6, 0, 0);
}

function createCubo() {
  const puckGeometry = new THREE.BoxGeometry(1, 1, 1);
  const puckMaterial = new THREE.MeshPhongMaterial({ color: "red" });

  puck = new THREE.Mesh(puckGeometry, puckMaterial);
  puck.position.set(0, 0, -19);
  scene.add(puck);
}

function createRaquetas() {
  const humanMaterial = new THREE.MeshPhongMaterial({ color: "blue" });
  const racketGeometry = new THREE.BoxGeometry(8, 1, 1);
  const cpuMaterial = new THREE.MeshPhongMaterial({ color: 0xc500fb });

  cpu = new THREE.Mesh(racketGeometry, cpuMaterial);
  human = new THREE.Mesh(racketGeometry, humanMaterial);
  human.position.set(0, 0, 10);
  cpu.position.set(0, 0, -20);
  scene.add(cpu, human);
}

function createLight() {
  const light1 = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(light1);
}

document.addEventListener("mousemove", event => {
  human.position.x = event.clientX / 20 - 50;
});

function init() {
  createScene();
  createRenderer();
  createcamera();
  createCubo();
  createRaquetas();
  createLight();
  createSurface();
  animation();
}

init();
