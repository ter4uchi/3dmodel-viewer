<template>
  <div id="app">
    <canvas id="MV" ref="MV"></canvas>
    <!--<controller id="Contoroller"/>-->
    <div>
      <!-- <controller/> -->
      <button value="ミライアカリ" @click="loadModel('model/MiraiAkari/MiraiAkari_v1.0.pmx')">ミライアカリ</button>
      <button value="ときのそら" @click="loadModel('model/TokinoSora/ときのそら.pmx')">ときのそら</button>
    </div>
  </div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import * as ThreeScenes from "./three/scenes";
import * as Setting from "./three/Setting";
import Controller from "./components/Controller"
//import Controller from './components/Controller.vue';

//なんかここで宣言しないとうまくいかない
var defaultModel;
let defaultScene;
let defaultCamera;
let defaultLight;

export default{
  name:"App",
  components:{
    //Controller
  },
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
    this.loadModel(Setting.default.model.model.MiraiAkari);
    this.animate();
  },
  methods:{
    animate() {
      //ウィンドウリサイズ時の制御
      if (this.resizeRendererToDisplaySize(this.render)) {
        const canvas = this.render.domElement;
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
      }

      requestAnimationFrame(this.animate);
      this.control.update();
      this.render.render(defaultScene, defaultCamera);
    },
    //ウィンドウリサイズ時の制御
    //ここ適当になってるから作り直す
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
    setLightColor(lightColor){
      this.scene.remove
      this.light=new THREE.DirectionalLight(lightColor,1.0);
    },
    loadModel(modelURL){
      var self = this;//eslint-disable-line
      this.loader.load(
        modelURL,
        function(obj){
          defaultModel = obj;
          defaultModel.name ="nowModel";
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
      let deleteModel = defaultScene.getObjectByName("nowModel");
      defaultScene.remove(deleteModel);
      console.log(defaultScene);
      defaultScene.add(defaultModel);
      this.model =  defaultModel;
      this.render.render(defaultScene, defaultCamera);
      console.log(this.model);
    },
    light:function(){
      defaultScene.add(this.camera);
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
  display: flex;
}
#MV{
  position: relative;
  left: 0;
  height: 100%;
  width: 80%;
}
#Controller{
  width: 20%;
  position: fixed;
  right: 0;
  top: 0;
}
</style>
