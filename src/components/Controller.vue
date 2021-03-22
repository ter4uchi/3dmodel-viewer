<template>
  <div id="controller">
    <form>
      <label for="light_color">ライトの色</label><input type="color" value="0xFFFFFF" id="light_color" @change="setLightColor" />
    </form>
  </div>
</template>

<script >

import * as ThreeScenes from "../three/scenes";
import * as Setting from "../three/Setting";
var defaultModel;

export default {
  name:"Controller",
  data(){
    return{};
  },
  methods:{
    Mirai_Akari(){
      var self = this;//eslint-disable-line
      ThreeScenes.MMDloader.load(
        Setting.default.model.model.MiraiAkari,
        function(obj){
          defaultModel = obj;
          console.log('model loaded');
          self.$parent.model = defaultModel;
        },
        function(xhr){
          console.log(Math.round( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.group( 'error! reason:' );
            console.log(error);
            console.groupEnd();
        })
    },
    Tokino_Sora(){
      var self = this;//eslint-disable-line
      ThreeScenes.MMDloader.load(
        Setting.default.model.model.TokinoSora,
        function(obj){
          defaultModel = obj;
          console.log('model loaded');
          self.$parent.model = defaultModel;
        },
        function(xhr){
          console.log(Math.round( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.group( 'error! reason:' );
            console.log(error);
            console.groupEnd();
        })
    }
  }

}
</script>
<style scoped>


</style>
