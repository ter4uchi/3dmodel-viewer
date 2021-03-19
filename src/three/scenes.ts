import * as THREE from "three";
import { LoadingManager } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader";
import Setting from './Setting'

////初期設定

//シーン
const scene = new THREE.Scene();

//レンダー
const render = null;

//カメラ
const camera = new THREE.PerspectiveCamera(
    Setting.model.camera.PerspectiveCamera.fov,
    Setting.model.camera.PerspectiveCamera.aspectX / Setting.model.camera.PerspectiveCamera.aspectY,
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
    Setting.model.light.DirectionLight.color,
    Setting.model.light.DirectionLight.intensity
);
light.position.set(
    Setting.model.light.position.x,
    Setting.model.light.position.y,
    Setting.model.light.position.z
);

//ローダー
const manager = new LoadingManager();
const MMDloader = new MMDLoader(manager);
const GLTFloader = new GLTFLoader(manager);

export {
    scene,
    render,
    camera,
    light,
    MMDloader,
    GLTFloader
}