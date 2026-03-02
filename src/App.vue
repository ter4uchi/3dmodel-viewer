<template>
  <div id="app">
    <loading-overlay v-if="isloading" />
    <canvas id="MV" ref="MV"></canvas>
    <!--<controller id="Contoroller"/>-->
    <div>
      <!-- <controller/> -->
      <button value="ミライアカリ" @click="loadModel('model/MiraiAkari/MiraiAkari_v1.0.pmx')">ミライアカリ</button>
      <button value="ときのそら" @click="loadModel('model/TokinoSora/ときのそら.pmx')">ときのそら</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as ThreeScenes from "./three/scenes";
import Setting from "./three/Setting";
import LoadingOverlay from './components/parts/LoadingOverlay';

//なんかここで宣言しないとうまくいかない
let defaultModel;
let defaultScene;
let defaultCamera;
let defaultLight;

const MV = ref(null)
const scene = ref(null)
const render = ref(null)
const camera = ref(null)
const light = ref(null)
const model = ref(null)
const control = ref(null)
const isloading = ref(false)
const loader = ThreeScenes.MMDloader

const animate = () => {
  if (!render.value || !camera.value || !control.value) {
    return
  }

  if (resizeRendererToDisplaySize(render.value)) {
    const canvas = render.value.domElement;
    camera.value.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.value.updateProjectionMatrix();
  }

  requestAnimationFrame(animate);
  control.value.update();
  render.value.render(defaultScene, defaultCamera);
}

const resizeRendererToDisplaySize = (renderer) => {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

const setLightColor = (lightColor) => {
  light.value = new THREE.DirectionalLight(lightColor, 1.0);
}

const loadModel = (modelURL) => {
  isloading.value = true;
  loader.load(
    modelURL,
    (obj) => {
      defaultModel = obj;
      defaultModel.name = "nowModel";
      console.log('model loaded');
      model.value = defaultModel;
    },
    (xhr) => {
      console.log(Math.round(xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.group('error! reason:');
      console.log(error);
      console.groupEnd();
    }
  )
}

watch(model, () => {
  if (!defaultScene || !defaultModel) {
    return
  }

  const deleteModel = defaultScene.getObjectByName("nowModel");
  if (deleteModel) {
    defaultScene.remove(deleteModel);
  }
  defaultScene.add(defaultModel);
  model.value = defaultModel;
  isloading.value = false;
})

watch(light, (newLight) => {
  if (!defaultScene || !newLight) {
    return
  }

  defaultScene.remove(defaultLight);
  defaultLight = newLight;
  defaultScene.add(defaultLight);
})

onMounted(() => {
  defaultScene = ThreeScenes.scene;
  defaultCamera = ThreeScenes.camera;
  defaultLight = ThreeScenes.light;
  defaultScene.add(defaultLight);
  scene.value = defaultScene;
  camera.value = defaultCamera;

  if (!MV.value) {
    return
  }

  render.value = new THREE.WebGLRenderer({
    antialias: true,
    canvas: MV.value
  });
  render.value.setClearColor(0xEEEEEE);

  control.value = new OrbitControls(defaultCamera, render.value.domElement);
  control.value.target = Setting.model.camera.lookAt
  control.value.enableDamping = true;
  control.value.dampingFactor = 0.2;
  render.value.render(defaultScene, defaultCamera);
  loadModel(Setting.model.model.MiraiAkari);
  animate();
})

defineExpose({
  light,
  setLightColor
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100vh;
  width: 100vw;
  display: flex;
}

#MV {
  position: relative;
  left: 0;
  height: 100%;
  width: 80%;
}

#Controller {
  width: 20%;
  position: fixed;
  right: 0;
  top: 0;
}
</style>
