<template>
  <div id="app">
    <canvas id="MV" ref="MV"></canvas>
  </div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import * as ThreeScenes from "./three/scenes";
import * as Setting from "./three/Setting";

let defaultModel;
let defaultScene;
let defaultCamera;
let defaultLight;

export default{
  name:"App",
  data(){
    return {
      scene:null,
      render:null,
      camera:null,
      light:null,
      model:null,
      Control:null,
      loader:ThreeScenes.MMDloader,
    }
  },
  mounted(){
    defaultScene = ThreeScenes.scene;
    defaultCamera = ThreeScenes.camera;
    defaultLight = ThreeScenes.light;
    defaultScene.add(defaultLight);
    this.scene = defaultScene;
    this.camera= defaultCamera;

    this.render = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.$refs.MV
    });
    this.render.setClearColor(0xEEEEEE);

    this.control = new OrbitControls(defaultCamera,this.render.domElement);
    this.control.target = Setting.default.model.camera.lookAt
    // 滑らかにカメラコントローラーを制御する
    this.control.enableDamping = true;
    this.control.dampingFactor = 0.2;

    this.render.render(defaultScene, defaultCamera);
    this.loadModel();
    this.animate();
  },
  methods:{
    animate() {
      setTimeout(null,10);

      if (this.resizeRendererToDisplaySize(this.render)) {
        const canvas = this.render.domElement;
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
      }

      requestAnimationFrame(this.animate);
      this.control.update();
      this.render.render(defaultScene, defaultCamera);
    },
    /////////
    resizeRendererToDisplaySize(renderer) {
      const canvas = renderer.domElement;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        this.render.setSize(width, height, false);
      }
      return needResize;
    },
    loadModel(){
      const url = Setting.default.model.model.url;
      var self = this;//eslint-disable-line
      this.loader.load(
        url,
        function(obj){
          defaultModel = obj;
          console.log('model loaded');
          self.model = defaultModel;
        },
        function(xhr){
          console.log(Math.round( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.group( 'error! reason:' );
            console.log(error);
            console.groupEnd();
        }
      )
    }
  },
  watch:{
    model:function(){
      //モデルのロード完了時に追加する。
      defaultScene.add(defaultModel);
      this.model =  defaultModel;
      console.log('model insert')
    }
  }
}
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
}
#MV{
  height: 100%;
  width: 100%;
}
</style>
