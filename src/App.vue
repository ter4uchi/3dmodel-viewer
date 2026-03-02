<template>
  <div id="app">
    <loading-overlay v-if="isloading" />
    <canvas id="MV" ref="MV"></canvas>
    <!--<controller id="Contoroller"/>-->
    <div>
      <!-- <controller/> -->
      <button value="ミライアカリ" @click="loadModel(Setting.model.model.MiraiAkari)">ミライアカリ</button>
      <button value="ときのそら" @click="loadModel(Setting.model.model.TokinoSora)">ときのそら</button>
      <button @click="toggleAnimation" :disabled="!hasLoadedModel">
        {{ isPlaying ? '一時停止' : '再生' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
import * as ThreeScenes from "./three/scenes";
import Setting from "./three/Setting";
import LoadingOverlay from './components/parts/LoadingOverlay';

//なんかここで宣言しないとうまくいかない
let defaultModel;
let defaultScene;
let defaultCamera;
let defaultLight;

const MV = ref(null)
const render = ref(null)
const camera = ref(null)
const light = ref(null)
const control = ref(null)
const isloading = ref(false)
const isPlaying = ref(true)
const hasLoadedModel = ref(false)
const loader = ThreeScenes.MMDloader
const helper = new MMDAnimationHelper({ afterglow: 2.0 })
const clock = new THREE.Clock()

const removeCurrentModel = () => {
  if (!defaultScene) {
    return
  }

  const currentModel = defaultScene.getObjectByName("nowModel");
  if (!currentModel) {
    return
  }

  try {
    helper.remove(currentModel);
  } catch (error) {
    console.warn('failed to remove model from helper');
    console.warn(error);
  }
  defaultScene.remove(currentModel);
}

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
  const delta = clock.getDelta();
  if (isPlaying.value) {
    helper.update(delta);
  }
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

const toggleAnimation = () => {
  if (!hasLoadedModel.value) {
    return
  }

  isPlaying.value = !isPlaying.value;
}

const loadModel = (modelURL) => {
  isloading.value = true;
  loader.loadWithAnimation(
    modelURL,
    Setting.model.motion.RucaRucaNightFever,
    (mmd) => {
      const mesh = mmd.mesh;
      const animation = mmd.animation;

      removeCurrentModel();

      helper.add(mesh, {
        animation: animation,
        physics: false
      });

      defaultModel = mesh;
      defaultModel.name = "nowModel";
      defaultScene.add(defaultModel);
      clock.getDelta();
      isPlaying.value = true;
      hasLoadedModel.value = true;
      console.log('model and motion loaded');
      isloading.value = false;
    },
    (xhr) => {
      console.log(Math.round(xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
      console.group('error! reason:');
      console.log(error);
      console.groupEnd();
      hasLoadedModel.value = false;
      isloading.value = false;
    }
  )
}

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
