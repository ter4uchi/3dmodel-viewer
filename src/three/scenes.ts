import * as THREE from "three";
import { LoadingManager } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import Setting from './Setting'

////初期設定

//シーン
const scene = new THREE.Scene();
scene.background = new THREE.Color(Setting.model.space.backgroundColor);

//レンダー
const render = null;

//カメラ
const camera = new THREE.PerspectiveCamera(
  Setting.model.camera.PerspectiveCamera.fov,
  Setting.model.camera.PerspectiveCamera.aspectX / Setting.model.camera.PerspectiveCamera.aspectY,//1.33,//
  Setting.model.camera.PerspectiveCamera.near,
  Setting.model.camera.PerspectiveCamera.far
);
camera.position.set(
  Setting.model.camera.position.x,
  Setting.model.camera.position.y,
  Setting.model.camera.position.z
);
camera.lookAt(Setting.model.camera.lookAt);

//ライト
const light = new THREE.DirectionalLight(
  0xffffff,
  Setting.model.light.DirectionLight.intensity
);
light.position.set(
  Setting.model.light.position.x,
  Setting.model.light.position.y,
  Setting.model.light.position.z
);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
light.shadow.camera.left = -120;
light.shadow.camera.right = 120;
light.shadow.camera.top = 120;
light.shadow.camera.bottom = -120;
light.shadow.camera.near = 1;
light.shadow.camera.far = 350;
light.shadow.bias = -0.00008;
light.shadow.normalBias = 0.02;

const ambientLight = new THREE.AmbientLight(
  Setting.model.light.AmbientLight.color,
  Setting.model.light.AmbientLight.intensity
);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(Setting.model.floor.size, Setting.model.floor.size),
  new THREE.MeshStandardMaterial({
    color: Setting.model.floor.color,
    roughness: 0.9,
    metalness: 0.02
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = Setting.model.floor.y;
floor.receiveShadow = false;

const floorMirror = new Reflector(
  new THREE.PlaneGeometry(Setting.model.floor.size, Setting.model.floor.size),
  {
    textureWidth: 1024,
    textureHeight: 1024,
    color: Setting.model.floor.reflectionColor,
    clipBias: 0.003
  }
);
floorMirror.rotation.x = -Math.PI / 2;
floorMirror.position.y = Setting.model.floor.y + 0.003;

const floorShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(Setting.model.floor.size, Setting.model.floor.size),
  new THREE.ShadowMaterial({
    opacity: Setting.model.floor.shadowOpacity
  })
);
floorShadow.rotation.x = -Math.PI / 2;
floorShadow.position.y = Setting.model.floor.y + 0.006;
floorShadow.receiveShadow = true;

//ローダー
const manager = new LoadingManager();
const MMDloader = new MMDLoader(manager);
const GLTFloader = new GLTFLoader(manager);

export {
  scene,
  render,
  camera,
  light,
  ambientLight,
  floor,
  floorMirror,
  floorShadow,
  MMDloader,
  GLTFloader
}
