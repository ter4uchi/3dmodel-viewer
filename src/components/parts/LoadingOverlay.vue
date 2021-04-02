<template>
    <div class="overlay">
        <div class="cv-spinner">
            <span class="spinner" />
        </div>
    </div>
</template>

<script lang="ts">
//import { defineComponent } from 'vue'

export default{
    name: "LoadingOverlay",
    data(){
        return{}
    },
    props:{
        isLoading:{
            type:Boolean,
            default:true,
            required:true
        }
    }
}
</script>
<style scoped>
.overlay {
    position: fixed;
    top: 0;
    z-index: 100;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
}
.cv-spinner {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}
.spinner {
    width: 40px;
    height: 40px;
    border: 4px #ddd solid;
    border-top: 4px #2e93e6 solid;
    border-radius: 50%;
    animation: sp-anime 0.8s infinite linear;
}
@keyframes sp-anime {
    100% {
        transform: rotate(360deg);
    }
}
.is-hide {
    display: none;
}
</style>
