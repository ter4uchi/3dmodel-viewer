<template>
  <div id="controller">
    <form>
      <label for="light_color">ライトの色</label><input type="color" v-model="light_color" id="light_color" ref="light_color"/>
      <p>{{light_color}}</p>
    </form>
  </div>
</template>

<script >

import * as ThreeScenes from "../three/scenes";
import * as Setting from "../three/Setting";
import * as THREE from "three";

export default {
  name:"Controller",
  data(){
    return{
      light_color:"0xFFFFFF"
    };
  },
  watch:{
    light_color:function(){
      console.log(this.$refs.light_color.value);
      this.$parent.light = new THREE.DirectionalLight(
          this.$refs.light_color.value,
          1.0
      );
    }
  }
}
</script>
<style scoped>


</style>
