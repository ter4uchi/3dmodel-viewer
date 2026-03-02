<template>
  <div id="controller">
    <form>
      <label for="light_color">ライトの色</label><input type="color" v-model="light_color" id="light_color"
        ref="light_color" />
      <p>{{ light_color }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import * as THREE from "three";

defineOptions({
  name: 'ModelController'
})

const emit = defineEmits(['change-light'])
const light_color = ref('#ffffff')

watch(light_color, (value) => {
  emit('change-light', new THREE.DirectionalLight(value, 1.0))
})
</script>
<style scoped></style>
