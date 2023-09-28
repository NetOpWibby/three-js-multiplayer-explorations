"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });

exports.PhysicsGame = exports.GRAVITY = void 0;

var index_1 = require("netplayjs/src/index");
var THREE = require("three");
var GLTFLoader_js_1 = require("three/examples/jsm/loaders/GLTFLoader.js");
var Octree_js_1 = require("three/examples/jsm/math/Octree.js");
var Capsule_js_1 = require("three/examples/jsm/math/Capsule.js");
var three_1 = require("three");
exports.GRAVITY = 30;
var NUM_SPHERES = 20;
var SPHERE_RADIUS = 0.2;
var PLAYER_HEIGHT = 1.35;
var PLAYER_RADIUS = 0.35;
var PLAYER_JUMP = 10;
var PLAYER_MOVE_SPEED = 10;
var UP_VECTOR = new THREE.Vector3(0, 1, 0);
var PLAYER_COLLIDER = new Capsule_js_1.Capsule();

// Adapted from https://github.com/mrdoob/three.js/blob/master/examples/games_fps.html
var PhysicsGame = /** @class */ (function (_super) {
    __extends(PhysicsGame, _super);
    function PhysicsGame(canvas, players) {
        var _this = _super.call(this) || this;
        _this.playerStates = new Map();
        _this.playerObjects = new Map();
        _this.players = players;
        _this.scene = new THREE.Scene();
        _this.scene.background = new THREE.Color(0x88ccff);
        _this.scene.add(PhysicsGame.level);
        _this.camera = new THREE.PerspectiveCamera(75, PhysicsGame.canvasSize.width / PhysicsGame.canvasSize.height, 0.1, 1000);
        _this.camera.rotation.order = "YXZ";
        for (var _i = 0, players_1 = players; _i < players_1.length; _i++) {
            var player = players_1[_i];
            _this.playerStates.set(player, _this.createPlayerState());
        }
        var ambientlight = new THREE.AmbientLight(0x6688cc);
        _this.scene.add(ambientlight);
        var fillLight1 = new THREE.DirectionalLight(0xff9999, 0.5);
        fillLight1.position.set(-1, 1, 2);
        _this.scene.add(fillLight1);
        var fillLight2 = new THREE.DirectionalLight(0x8888ff, 0.2);
        fillLight2.position.set(0, -1, 0);
        _this.scene.add(fillLight2);
        var directionalLight = new THREE.DirectionalLight(0xffffaa, 1.2);
        directionalLight.position.set(-5, 25, -1);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = -0.00006;
        _this.scene.add(directionalLight);
        _this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
        });
        _this.renderer.shadowMap.enabled = true;
        _this.renderer.shadowMap.type = THREE.VSMShadowMap;
        return _this;
    }
    PhysicsGame.prototype.createPlayerState = function () {
        return {
            angleHorizontal: 0,
            angleVertical: 0,
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            lastMousePosition: null,
            onFloor: false,
        };
    };
    PhysicsGame.prototype.createPlayerObject = function () {
        var geometry = new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT, 6);
        var material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        return mesh;
    };
    PhysicsGame.prototype.serialize = function () {
        var _this = this;
        return this.players.map(function (p) {
            // @ts-ignore
            return _this.playerStates.get(p);
        });
    };
    PhysicsGame.prototype.deserialize = function (value) {
        var _this = this;
        this.players.forEach(function (player, i) {
            var serialized = value[i];
            var state = _this.playerStates.get(player);
            state.angleHorizontal = serialized.angleHorizontal;
            state.angleVertical = serialized.angleVertical;
            state.onFloor = serialized.onFloor;
            state.lastMousePosition = serialized.lastMousePosition;
            state.position.copy(serialized.position);
            state.velocity.copy(serialized.velocity);
        });
    };
    PhysicsGame.prototype.getForwardVector = function (state) {
        return new THREE.Vector3(1, 0, 0).applyAxisAngle(UP_VECTOR, state.angleHorizontal);
    };
    PhysicsGame.prototype.getSideVector = function (state) {
        return new THREE.Vector3(0, 0, 1).applyAxisAngle(UP_VECTOR, state.angleHorizontal);
    };
    PhysicsGame.prototype.getMousePosition = function (input) {
        if (input.touches && input.touches.length > 0) {
            return input.touches[0];
        }
        if (input.mousePosition)
            return input.mousePosition;
        return null;
    };
    PhysicsGame.prototype.tick = function (playerInputs) {
        var dt = PhysicsGame.timestep / 1000;
        for (var _i = 0, playerInputs_1 = playerInputs; _i < playerInputs_1.length; _i++) {
            var _a = playerInputs_1[_i], player = _a[0], input = _a[1];
            var state = this.playerStates.get(player);
            var movement = input.wasd();
            if (movement.x === 0 && movement.y === 0 && input.touchControls) {
                movement = input.touchControls.leftStick;
            }
            state.velocity.add(this.getForwardVector(state).multiplyScalar(PLAYER_MOVE_SPEED * dt * movement.y));
            state.velocity.add(this.getSideVector(state).multiplyScalar(PLAYER_MOVE_SPEED * dt * movement.x));
            var mouse = this.getMousePosition(input);
            if (mouse) {
                if (state.lastMousePosition) {
                    state.angleHorizontal -= (mouse.x - state.lastMousePosition.x) / 100;
                    state.angleVertical -= (mouse.y - state.lastMousePosition.y) / 100;
                }
                state.lastMousePosition = mouse;
            }
            else {
                state.lastMousePosition = null;
            }
            state.angleVertical = three_1.MathUtils.clamp(state.angleVertical, -1, 1);
            this.camera.position.copy(state.position);
        }
        for (var _b = 0, _c = this.playerStates; _b < _c.length; _b++) {
            var _d = _c[_b], player = _d[0], state = _d[1];
            var damping = Math.exp(-3 * dt) - 1;
            state.velocity.addScaledVector(state.velocity, damping);
            state.position.addScaledVector(state.velocity, dt);
            var offset = new THREE.Vector3(0, PLAYER_HEIGHT / 2 - PLAYER_RADIUS, 0);
            PLAYER_COLLIDER.set(state.position.clone().sub(offset), state.position.clone().add(offset), PLAYER_RADIUS);
            var result = PhysicsGame.octree.capsuleIntersect(PLAYER_COLLIDER);
            state.onFloor = false;
            if (result) {
                state.onFloor = result.normal.y > 0.1;
                var resolution = result.normal.clone().multiplyScalar(result.depth);
                state.position.add(resolution);
            }
            if (state.onFloor) {
                state.velocity.y = 0;
            }
            else {
                state.velocity.y -= exports.GRAVITY * dt;
            }
        }
        // Players collide with each other.
        for (var i = 0; i < this.players.length; ++i) {
            for (var j = i + 1; j < this.players.length; ++j) {
                var a = this.playerStates.get(this.players[i]);
                var b = this.playerStates.get(this.players[j]);
                var aPos2D = new THREE.Vector2(a.position.x, a.position.z);
                var bPos2D = new THREE.Vector2(b.position.x, b.position.z);
                var dist = aPos2D.distanceTo(bPos2D);
                if (Math.abs(a.position.y - b.position.y) < PLAYER_HEIGHT &&
                    dist < PLAYER_RADIUS * 2) {
                    var penetrationDepth = PLAYER_RADIUS * 2 - dist;
                    var resolution2D = bPos2D
                        .clone()
                        .sub(aPos2D)
                        .normalize()
                        .multiplyScalar(penetrationDepth)
                        .multiplyScalar(0.5);
                    var resolution = new THREE.Vector3(resolution2D.x, 0, resolution2D.y);
                    b.position.add(resolution);
                    a.position.sub(resolution);
                }
            }
        }
    };
    PhysicsGame.prototype.draw = function (canvas) {
        for (var _i = 0, _a = this.playerStates; _i < _a.length; _i++) {
            var _b = _a[_i], player = _b[0], state = _b[1];
            var forward = this.getForwardVector(state);
            if (player.isLocalPlayer()) {
                this.camera.position
                    .copy(state.position)
                    .add(new THREE.Vector3(0, PLAYER_HEIGHT / 2 - PLAYER_RADIUS, 0));
                this.camera.lookAt(this.camera.position.clone().add(forward));
                this.camera.rotation.x = state.angleVertical;
            }
            else {
                var object = this.playerObjects.get(player);
                if (!object) {
                    object = this.createPlayerObject();
                    this.scene.add(object);
                    this.playerObjects.set(player, object);
                }
                object.position.copy(state.position);
                object.lookAt(state.position.clone().add(forward));
            }
        }
        this.renderer.render(this.scene, this.camera);
    };
    PhysicsGame.timestep = 1000 / 60;
    PhysicsGame.canvasSize = { width: 600, height: 300 };
    PhysicsGame.highDPI = true;
    PhysicsGame.octree = new Octree_js_1.Octree();
    PhysicsGame.level = new THREE.Object3D();
    // Behavior is quite deterministic, so synchronize the
    // state every five seconds.
    PhysicsGame.stateSyncPeriod = 60 * 5;
    PhysicsGame.pointerLock = true;
    PhysicsGame.touchControls = {
        leftStick: new index_1.VirtualJoystick(),
    };
    return PhysicsGame;
}(index_1.Game));
exports.PhysicsGame = PhysicsGame;
var loader = new GLTFLoader_js_1.GLTFLoader();
loader.load("../files/collision-world.glb", function (gltf) {
    gltf.scene.traverse(function (child) {
        child.castShadow = true;
        child.receiveShadow = true;
    });
    PhysicsGame.level = gltf.scene;
    PhysicsGame.octree.fromGraphNode(gltf.scene);
    new index_1.RollbackWrapper(PhysicsGame).start();
});
