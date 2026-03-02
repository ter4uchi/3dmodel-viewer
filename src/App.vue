<template>
  <div
    id="app"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <loading-overlay v-if="isloading" />
    <div class="layout">
      <canvas id="MV" ref="MV"></canvas>

      <aside class="sidebar">
        <div class="sidebar-panel">
          <p class="sidebar-eyebrow">MMD Controller</p>
          <h1 class="sidebar-title">3D Model Viewer</h1>
          <p class="status-badge" :class="{ loading: isloading, paused: !isPlaying }">
            {{ isloading ? 'Loading...' : (isPlaying ? 'Playing' : 'Paused') }}
          </p>

          <section class="control-section">
            <h2 class="section-title">Model</h2>
            <div class="button-grid two-col">
              <button class="side-button" @click="loadModel(Setting.model.model.MiraiAkari, currentMotionUrl)">
                ミライアカリ
              </button>
              <button class="side-button" @click="loadModel(Setting.model.model.TokinoSora, currentMotionUrl)">
                ときのそら
              </button>
            </div>
            <p class="section-note">Current: {{ fileLabel(currentModelUrl) }}</p>
          </section>

          <section class="control-section">
            <h2 class="section-title">Motion</h2>
            <div class="button-grid two-col">
              <button class="side-button primary" @click="toggleAnimation" :disabled="!hasLoadedModel">
                {{ isPlaying ? '一時停止' : '再生' }}
              </button>
              <button class="side-button" @click="seekTo(0)" :disabled="!hasLoadedModel || motionDuration <= 0">
                先頭へ
              </button>
            </div>

            <label class="toggle-inline">
              <input v-model="loopEnabled" type="checkbox">
              <span>Loop</span>
            </label>

            <label class="light-input light-range">
              <span>Speed {{ playbackSpeed.toFixed(2) }}x</span>
              <input v-model.number="playbackSpeed" type="range" min="0.25" max="2" step="0.05">
            </label>

            <label class="light-input light-range">
              <span>{{ formatTime(currentTime) }} / {{ formatTime(motionDuration) }}</span>
              <input
                :value="currentTime"
                type="range"
                min="0"
                :max="Math.max(motionDuration, 0.01)"
                step="0.01"
                :disabled="!hasLoadedModel || motionDuration <= 0"
                @input="onSeekInput"
              >
            </label>

            <label class="path-input">
              <span>Model VMD URL</span>
              <input v-model.trim="modelMotionPathInput" type="text" placeholder="danceMotion/example.vmd">
            </label>
            <button class="side-button" @click="loadMotionFromPath" :disabled="!modelMotionPathInput || !hasLoadedModel">
              モーション読込
            </button>
          </section>

          <section class="control-section">
            <h2 class="section-title">Camera Motion</h2>
            <label class="path-input">
              <span>Camera VMD URL</span>
              <input v-model.trim="cameraMotionPathInput" type="text" placeholder="cameraMotion/example.vmd">
            </label>
            <div class="button-grid two-col">
              <button class="side-button" @click="loadCameraMotionFromPath" :disabled="!cameraMotionPathInput">
                読込
              </button>
              <button class="side-button" @click="removeCameraMotion" :disabled="!isCameraMotionActive">
                解除
              </button>
            </div>
            <p class="section-note">Current: {{ isCameraMotionActive ? fileLabel(cameraMotionUrl) : 'none' }}</p>
          </section>

          <section class="control-section">
            <h2 class="section-title">Ambient Light</h2>
            <div class="light-controls">
              <label class="light-input">
                <span>Color</span>
                <input v-model="ambientColor" type="color">
              </label>
              <label class="light-input light-range">
                <span>Intensity {{ ambientIntensity.toFixed(2) }}</span>
                <input v-model.number="ambientIntensity" type="range" min="0" max="1.4" step="0.01">
              </label>
            </div>
          </section>

          <section class="control-section">
            <h2 class="section-title">Morph</h2>
            <div v-if="morphItems.length > 0" class="morph-list">
              <label v-for="morph in morphItems" :key="`morph-${morph.index}`" class="morph-item">
                <span class="morph-name">{{ morph.name }}</span>
                <input :value="morph.value" type="range" min="0" max="1" step="0.01" @input="onMorphInput(morph, $event)">
                <span class="morph-value">{{ morph.value.toFixed(2) }}</span>
              </label>
            </div>
            <p v-else class="section-note">モーフが見つかりません。</p>
          </section>

          <section class="control-section">
            <h2 class="section-title">Drag &amp; Drop</h2>
            <label class="toggle-inline">
              <span>VMD target</span>
              <select v-model="dropVmdTarget">
                <option value="model">model</option>
                <option value="camera">camera</option>
              </select>
            </label>

            <div class="drop-zone" :class="{ active: isDragOver }">
              PMX/PMD/VMD をここにドロップ
            </div>
            <p class="section-note">
              PMX/PMD + VMD(1つ目: model, 2つ目: camera) に対応。ローカルPMXはテクスチャ参照が崩れる場合があります。
            </p>
          </section>

          <section class="control-section">
            <h2 class="section-title">Utility</h2>
            <div class="button-grid two-col">
              <button class="side-button" @click="saveScreenshot">スクショ保存</button>
              <button class="side-button" @click="resetPersistedSettings">設定リセット</button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js'
import * as ThreeScenes from './three/scenes'
import Setting from './three/Setting'
import LoadingOverlay from './components/parts/LoadingOverlay'

let defaultModel
let defaultScene
let defaultCamera
let defaultDirectionalLight
let defaultAmbientLight
let defaultFloor
let defaultFloorMirror
let defaultFloorShadow
let dragDepth = 0
const temporaryUrls = []

const MV = ref(null)
const render = ref(null)
const control = ref(null)
const isloading = ref(false)
const isPlaying = ref(true)
const hasLoadedModel = ref(false)
const isCameraMotionActive = ref(false)
const isDragOver = ref(false)

const ambientColor = ref('#ffffff')
const ambientIntensity = ref(Setting.model.light.AmbientLight.intensity)
const playbackSpeed = ref(1)
const loopEnabled = ref(true)
const currentTime = ref(0)
const motionDuration = ref(0)

const dropVmdTarget = ref('model')
const currentModelUrl = ref(Setting.model.model.MiraiAkari)
const currentMotionUrl = ref(Setting.model.motion.RucaRucaNightFever)
const cameraMotionUrl = ref('')
const modelMotionPathInput = ref('')
const cameraMotionPathInput = ref('')
const morphItems = ref([])

const currentMotionClip = ref(null)
const currentCameraClip = ref(null)

const loader = ThreeScenes.MMDloader
const helper = new MMDAnimationHelper({ afterglow: 2.0 })
const clock = new THREE.Clock()

const storageKey = Setting.model.storage?.key || 'mmd-viewer-settings-v1'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const isPersistableUrl = (url) => typeof url === 'string' && url.length > 0 && !url.startsWith('blob:')

const fileLabel = (url) => {
  if (!url) {
    return '-'
  }

  const normalized = url.split('?')[0]
  const chunks = normalized.split('/')
  const tail = chunks[chunks.length - 1]

  try {
    return decodeURIComponent(tail || normalized)
  } catch {
    return tail || normalized
  }
}

const formatTime = (seconds) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const mm = Math.floor(safe / 60)
  const ss = safe - mm * 60
  return `${String(mm).padStart(2, '0')}:${ss.toFixed(2).padStart(5, '0')}`
}

const registerTemporaryUrl = (file) => {
  const url = URL.createObjectURL(file)
  temporaryUrls.push(url)
  return url
}

const saveAppSettings = () => {
  try {
    const payload = {
      ambientColor: ambientColor.value,
      ambientIntensity: ambientIntensity.value,
      playbackSpeed: playbackSpeed.value,
      loopEnabled: loopEnabled.value,
      dropVmdTarget: dropVmdTarget.value,
      modelUrl: isPersistableUrl(currentModelUrl.value) ? currentModelUrl.value : Setting.model.model.MiraiAkari,
      motionUrl: isPersistableUrl(currentMotionUrl.value) ? currentMotionUrl.value : Setting.model.motion.RucaRucaNightFever,
      cameraMotionUrl: isPersistableUrl(cameraMotionUrl.value) ? cameraMotionUrl.value : ''
    }

    localStorage.setItem(storageKey, JSON.stringify(payload))
  } catch (error) {
    console.warn('failed to save settings')
    console.warn(error)
  }
}

const restoreAppSettings = () => {
  try {
    const raw = localStorage.getItem(storageKey)

    if (!raw) {
      return
    }

    const saved = JSON.parse(raw)

    if (typeof saved.ambientColor === 'string') {
      ambientColor.value = saved.ambientColor
    }

    if (Number.isFinite(saved.ambientIntensity)) {
      ambientIntensity.value = clamp(saved.ambientIntensity, 0, 1.4)
    }

    if (Number.isFinite(saved.playbackSpeed)) {
      playbackSpeed.value = clamp(saved.playbackSpeed, 0.25, 2)
    }

    if (typeof saved.loopEnabled === 'boolean') {
      loopEnabled.value = saved.loopEnabled
    }

    if (saved.dropVmdTarget === 'model' || saved.dropVmdTarget === 'camera') {
      dropVmdTarget.value = saved.dropVmdTarget
    }

    if (isPersistableUrl(saved.modelUrl)) {
      currentModelUrl.value = saved.modelUrl
    }

    if (isPersistableUrl(saved.motionUrl)) {
      currentMotionUrl.value = saved.motionUrl
      modelMotionPathInput.value = saved.motionUrl
    }

    if (isPersistableUrl(saved.cameraMotionUrl)) {
      cameraMotionUrl.value = saved.cameraMotionUrl
      cameraMotionPathInput.value = saved.cameraMotionUrl
    }
  } catch (error) {
    console.warn('failed to restore settings')
    console.warn(error)
  }
}

const getMixer = (object3d) => {
  if (!object3d) {
    return null
  }

  return helper.objects.get(object3d)?.mixer || null
}

const getAction = (object3d, clip) => {
  const mixer = getMixer(object3d)

  if (!mixer || !clip) {
    return null
  }

  return mixer.clipAction(clip)
}

const renderOnce = () => {
  if (!render.value || !defaultScene || !defaultCamera) {
    return
  }

  render.value.render(defaultScene, defaultCamera)
}

const updateTimelineInfo = () => {
  const modelDuration = currentMotionClip.value?.duration || 0
  const cameraDuration = isCameraMotionActive.value ? (currentCameraClip.value?.duration || 0) : 0
  const duration = Math.max(modelDuration, cameraDuration)
  motionDuration.value = duration

  if (duration <= 0) {
    currentTime.value = 0
    return
  }

  const activeAction = getAction(defaultModel, currentMotionClip.value) || getAction(defaultCamera, currentCameraClip.value)

  if (!activeAction) {
    return
  }

  const rawTime = activeAction.time || 0
  currentTime.value = loopEnabled.value ? (rawTime % duration) : Math.min(rawTime, duration)
}

const setShadowForModel = (mesh) => {
  mesh.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = false
    }
  })
}

const collectMorphs = (mesh) => {
  const dictionary = mesh?.morphTargetDictionary
  const influences = mesh?.morphTargetInfluences

  if (!dictionary || !influences) {
    morphItems.value = []
    return
  }

  const entries = Object.entries(dictionary)
    .map(([name, index]) => ({
      name,
      index,
      value: influences[index] ?? 0
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  morphItems.value = entries
}

const onMorphInput = (morph, event) => {
  if (!defaultModel?.morphTargetInfluences) {
    return
  }

  const value = clamp(Number(event.target.value), 0, 1)
  defaultModel.morphTargetInfluences[morph.index] = value
  morph.value = value
}

const applyLoopMode = () => {
  const setupAction = (action) => {
    if (!action) {
      return
    }

    if (loopEnabled.value) {
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
    } else {
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
    }

    action.play()
  }

  setupAction(getAction(defaultModel, currentMotionClip.value))
  setupAction(getAction(defaultCamera, currentCameraClip.value))
}

const applyAmbientLight = () => {
  if (!defaultAmbientLight) {
    return
  }

  defaultAmbientLight.color.set(ambientColor.value)
  defaultAmbientLight.intensity = ambientIntensity.value
}

const resizeRendererToDisplaySize = (renderer) => {
  const canvas = renderer.domElement
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const needResize = canvas.width !== width || canvas.height !== height

  if (needResize) {
    renderer.setSize(width, height, false)
  }

  return needResize
}

const seekTo = (timeInSec) => {
  const duration = motionDuration.value
  const target = clamp(Number(timeInSec) || 0, 0, duration > 0 ? duration : 0)

  const modelMixer = getMixer(defaultModel)
  if (modelMixer) {
    modelMixer.setTime(target)
  }

  const cameraMixer = getMixer(defaultCamera)
  if (cameraMixer && isCameraMotionActive.value) {
    cameraMixer.setTime(target)
  }

  updateTimelineInfo()
  renderOnce()
}

const onSeekInput = (event) => {
  seekTo(Number(event.target.value))
}

const resetCameraTransform = () => {
  if (!defaultCamera) {
    return
  }

  defaultCamera.position.set(
    Setting.model.camera.position.x,
    Setting.model.camera.position.y,
    Setting.model.camera.position.z
  )
  defaultCamera.lookAt(Setting.model.camera.lookAt)
  defaultCamera.updateProjectionMatrix()

  if (control.value) {
    control.value.target.copy(Setting.model.camera.lookAt)
    control.value.enabled = true
    control.value.update()
  }
}

const removeCurrentModel = () => {
  if (!defaultScene) {
    return
  }

  const currentModel = defaultScene.getObjectByName('nowModel')

  if (!currentModel) {
    return
  }

  try {
    helper.remove(currentModel)
  } catch (error) {
    console.warn('failed to remove model from helper')
    console.warn(error)
  }

  defaultScene.remove(currentModel)
}

const applyModelClip = (mesh, clip) => {
  try {
    helper.remove(mesh)
  } catch {
    // no-op: mesh may not be added yet
  }

  helper.add(mesh, {
    animation: clip,
    physics: false
  })

  currentMotionClip.value = clip
  collectMorphs(mesh)
  applyLoopMode()
  updateTimelineInfo()
  seekTo(0)
}

const loadMotionForCurrentModel = (motionUrl) => {
  const effectiveUrl = motionUrl || currentMotionUrl.value

  if (!defaultModel || !effectiveUrl) {
    return
  }

  isloading.value = true

  loader.loadAnimation(
    effectiveUrl,
    defaultModel,
    (clip) => {
      applyModelClip(defaultModel, clip)
      currentMotionUrl.value = effectiveUrl
      modelMotionPathInput.value = effectiveUrl
      isPlaying.value = true
      isloading.value = false
      saveAppSettings()
    },
    undefined,
    (error) => {
      console.group('motion load error')
      console.log(error)
      console.groupEnd()
      isloading.value = false
    }
  )
}

const removeCameraMotion = () => {
  if (!defaultCamera) {
    return
  }

  try {
    helper.remove(defaultCamera)
  } catch {
    // no-op: camera motion may not exist
  }

  currentCameraClip.value = null
  isCameraMotionActive.value = false
  cameraMotionUrl.value = ''
  updateTimelineInfo()
  resetCameraTransform()
  saveAppSettings()
}

const loadCameraMotion = (cameraVmdUrl) => {
  if (!defaultCamera || !cameraVmdUrl) {
    return
  }

  isloading.value = true

  loader.loadAnimation(
    cameraVmdUrl,
    defaultCamera,
    (clip) => {
      try {
        helper.remove(defaultCamera)
      } catch {
        // no-op: first attach
      }

      helper.add(defaultCamera, { animation: clip })
      currentCameraClip.value = clip
      isCameraMotionActive.value = true
      cameraMotionUrl.value = cameraVmdUrl
      cameraMotionPathInput.value = cameraVmdUrl

      if (control.value) {
        control.value.enabled = false
      }

      applyLoopMode()
      seekTo(currentTime.value)
      isloading.value = false
      saveAppSettings()
    },
    undefined,
    (error) => {
      console.group('camera motion load error')
      console.log(error)
      console.groupEnd()
      isloading.value = false
    }
  )
}

const loadCameraMotionFromPath = () => {
  if (!cameraMotionPathInput.value) {
    return
  }

  loadCameraMotion(cameraMotionPathInput.value)
}

const loadMotionFromPath = () => {
  if (!modelMotionPathInput.value) {
    return
  }

  loadMotionForCurrentModel(modelMotionPathInput.value)
}

const loadModel = (modelURL, motionURL, onLoaded) => {
  const effectiveModelUrl = modelURL || currentModelUrl.value
  const effectiveMotionUrl = motionURL || currentMotionUrl.value || Setting.model.motion.RucaRucaNightFever

  if (!effectiveModelUrl || !effectiveMotionUrl) {
    return
  }

  isloading.value = true

  loader.loadWithAnimation(
    effectiveModelUrl,
    effectiveMotionUrl,
    (mmd) => {
      const mesh = mmd.mesh
      const animation = mmd.animation

      removeCurrentModel()
      setShadowForModel(mesh)
      applyModelClip(mesh, animation)

      defaultModel = mesh
      defaultModel.name = 'nowModel'
      defaultScene.add(defaultModel)

      currentModelUrl.value = effectiveModelUrl
      currentMotionUrl.value = effectiveMotionUrl
      modelMotionPathInput.value = effectiveMotionUrl

      hasLoadedModel.value = true
      isPlaying.value = true
      isloading.value = false
      updateTimelineInfo()
      renderOnce()
      saveAppSettings()

      if (typeof onLoaded === 'function') {
        onLoaded()
      }
    },
    undefined,
    (error) => {
      console.group('model load error')
      console.log(error)
      console.groupEnd()
      hasLoadedModel.value = false
      isloading.value = false
    }
  )
}

const toggleAnimation = () => {
  if (!hasLoadedModel.value) {
    return
  }

  if (!isPlaying.value && !loopEnabled.value && motionDuration.value > 0 && currentTime.value >= motionDuration.value - 0.01) {
    seekTo(0)
  }

  isPlaying.value = !isPlaying.value
}

const handleDragEnter = () => {
  dragDepth += 1
  isDragOver.value = true
}

const handleDragOver = (event) => {
  event.dataTransfer.dropEffect = 'copy'
}

const handleDragLeave = () => {
  dragDepth -= 1

  if (dragDepth <= 0) {
    dragDepth = 0
    isDragOver.value = false
  }
}

const handleDrop = (event) => {
  dragDepth = 0
  isDragOver.value = false

  const files = Array.from(event.dataTransfer?.files || [])

  if (files.length === 0) {
    return
  }

  const getExt = (name) => {
    const chunks = name.toLowerCase().split('.')
    return chunks[chunks.length - 1] || ''
  }

  const modelFile = files.find((file) => {
    const ext = getExt(file.name)
    return ext === 'pmx' || ext === 'pmd'
  })

  const vmdFiles = files.filter((file) => getExt(file.name) === 'vmd')

  if (modelFile) {
    const modelUrl = registerTemporaryUrl(modelFile)
    const modelMotionUrl = vmdFiles[0] ? registerTemporaryUrl(vmdFiles[0]) : currentMotionUrl.value

    loadModel(modelUrl, modelMotionUrl, () => {
      if (vmdFiles.length > 1) {
        loadCameraMotion(registerTemporaryUrl(vmdFiles[1]))
      }
    })

    return
  }

  if (vmdFiles.length === 0) {
    return
  }

  if (dropVmdTarget.value === 'camera') {
    loadCameraMotion(registerTemporaryUrl(vmdFiles[0]))
    return
  }

  if (!hasLoadedModel.value) {
    loadModel(currentModelUrl.value, registerTemporaryUrl(vmdFiles[0]))
    return
  }

  loadMotionForCurrentModel(registerTemporaryUrl(vmdFiles[0]))
}

const saveScreenshot = () => {
  if (!render.value) {
    return
  }

  renderOnce()

  render.value.domElement.toBlob((blob) => {
    if (!blob) {
      return
    }

    const link = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[.:]/g, '-')
    const url = URL.createObjectURL(blob)

    link.href = url
    link.download = `mmd-viewer-${stamp}.png`
    link.click()

    URL.revokeObjectURL(url)
  }, 'image/png')
}

const resetPersistedSettings = () => {
  localStorage.removeItem(storageKey)

  ambientColor.value = '#ffffff'
  ambientIntensity.value = Setting.model.light.AmbientLight.intensity
  playbackSpeed.value = 1
  loopEnabled.value = true
  dropVmdTarget.value = 'model'

  currentModelUrl.value = Setting.model.model.MiraiAkari
  currentMotionUrl.value = Setting.model.motion.RucaRucaNightFever
  cameraMotionUrl.value = ''

  modelMotionPathInput.value = currentMotionUrl.value
  cameraMotionPathInput.value = ''

  applyAmbientLight()
  applyLoopMode()
  removeCameraMotion()

  if (hasLoadedModel.value) {
    loadModel(currentModelUrl.value, currentMotionUrl.value)
  }
}

const animate = () => {
  if (!render.value || !defaultCamera || !control.value) {
    return
  }

  if (resizeRendererToDisplaySize(render.value)) {
    const canvas = render.value.domElement
    defaultCamera.aspect = canvas.clientWidth / canvas.clientHeight
    defaultCamera.updateProjectionMatrix()
  }

  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  if (isPlaying.value) {
    helper.update(delta * playbackSpeed.value)
  }

  if (!isCameraMotionActive.value) {
    control.value.update()
  }

  updateTimelineInfo()

  if (!loopEnabled.value && motionDuration.value > 0 && currentTime.value >= motionDuration.value - 0.001) {
    isPlaying.value = false
  }

  render.value.render(defaultScene, defaultCamera)
}

watch(ambientColor, () => {
  applyAmbientLight()
})

watch(ambientIntensity, () => {
  applyAmbientLight()
})

watch(loopEnabled, () => {
  applyLoopMode()
})

watch(
  [
    ambientColor,
    ambientIntensity,
    playbackSpeed,
    loopEnabled,
    currentModelUrl,
    currentMotionUrl,
    cameraMotionUrl,
    dropVmdTarget
  ],
  () => {
    saveAppSettings()
  }
)

onMounted(() => {
  restoreAppSettings()

  defaultScene = ThreeScenes.scene
  defaultCamera = ThreeScenes.camera
  defaultDirectionalLight = ThreeScenes.light
  defaultAmbientLight = ThreeScenes.ambientLight
  defaultFloor = ThreeScenes.floor
  defaultFloorMirror = ThreeScenes.floorMirror
  defaultFloorShadow = ThreeScenes.floorShadow

  defaultScene.add(defaultDirectionalLight)
  defaultScene.add(defaultAmbientLight)
  defaultScene.add(defaultFloor)
  defaultScene.add(defaultFloorMirror)
  defaultScene.add(defaultFloorShadow)

  applyAmbientLight()

  if (!MV.value) {
    return
  }

  render.value = new THREE.WebGLRenderer({
    antialias: true,
    canvas: MV.value,
    preserveDrawingBuffer: true
  })

  render.value.setClearColor(Setting.model.space.backgroundColor)
  render.value.toneMapping = THREE.NeutralToneMapping
  render.value.toneMappingExposure = 1.35
  render.value.shadowMap.enabled = true
  render.value.shadowMap.type = THREE.PCFSoftShadowMap

  control.value = new OrbitControls(defaultCamera, render.value.domElement)
  control.value.target.copy(Setting.model.camera.lookAt)
  control.value.enableDamping = true
  control.value.dampingFactor = 0.2

  loadModel(currentModelUrl.value, currentMotionUrl.value, () => {
    if (cameraMotionUrl.value) {
      loadCameraMotion(cameraMotionUrl.value)
    }
  })

  animate()
})

onBeforeUnmount(() => {
  for (const url of temporaryUrls) {
    URL.revokeObjectURL(url)
  }
})
</script>

<style>
#app {
  --page-bg-start: #d7e5df;
  --page-bg-mid: #f2e8d9;
  --page-bg-end: #d4e0ee;
  --panel-bg: rgba(255, 255, 255, 0.78);
  --panel-border: rgba(255, 255, 255, 0.45);
  --text-main: #173042;
  --text-muted: #5f717f;
  --button-bg: #ffffff;
  --button-border: #c8d3db;
  --button-hover: #f2f8ff;
  --button-primary: #0e5678;
  --button-primary-hover: #0b435d;

  font-family: "M PLUS 1", "Yu Gothic UI", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif;
  color: var(--text-main);
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 8%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 44%),
    linear-gradient(122deg, var(--page-bg-start), var(--page-bg-mid) 56%, var(--page-bg-end));
}

.layout {
  width: 100%;
  height: 100%;
  display: flex;
}

#MV {
  width: auto;
  flex: 1;
  min-width: 0;
  height: 100%;
  animation: canvas-fade-in 0.6s ease-out;
}

.sidebar {
  width: 360px;
  padding: 20px 18px;
  border-left: 1px solid var(--panel-border);
  background: linear-gradient(160deg, var(--panel-bg), rgba(228, 237, 245, 0.7));
  backdrop-filter: blur(8px);
  box-shadow: -16px 0 30px rgba(20, 28, 41, 0.08);
  animation: sidebar-slide-in 0.45s ease-out;
}

.sidebar-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
  overflow-y: auto;
  padding-right: 4px;
}

.sidebar-eyebrow {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar-title {
  margin: -8px 0 0;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.status-badge {
  margin: 0;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(18, 110, 47, 0.15);
  color: #0f6832;
  font-size: 13px;
  font-weight: 700;
}

.status-badge.paused {
  background: rgba(119, 93, 18, 0.17);
  color: #6f4f00;
}

.status-badge.loading {
  background: rgba(11, 80, 116, 0.17);
  color: #0a4f6f;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(190, 204, 214, 0.7);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
}

.section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.section-note {
  margin: 0;
  color: #556a78;
  font-size: 12px;
  line-height: 1.35;
}

.button-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.button-grid.two-col {
  grid-template-columns: 1fr 1fr;
}

.side-button {
  appearance: none;
  border: 1px solid var(--button-border);
  background: var(--button-bg);
  color: var(--text-main);
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 180ms ease, transform 180ms ease, border-color 180ms ease;
}

.side-button:hover:not(:disabled) {
  background: var(--button-hover);
  border-color: #9eb5c4;
  transform: translateY(-1px);
}

.side-button:disabled {
  opacity: 0.5;
  cursor: default;
}

.side-button.primary {
  background: var(--button-primary);
  border-color: var(--button-primary);
  color: #f5fbff;
}

.side-button.primary:hover:not(:disabled) {
  background: var(--button-primary-hover);
  border-color: var(--button-primary-hover);
}

.light-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.light-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--button-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.74);
  font-size: 13px;
}

.light-input input[type="color"] {
  width: 40px;
  height: 26px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.light-range {
  flex-direction: column;
  align-items: stretch;
}

.light-range span {
  display: flex;
  justify-content: space-between;
}

.light-range input[type="range"] {
  width: 100%;
}

.toggle-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.toggle-inline select {
  margin-left: auto;
  border: 1px solid var(--button-border);
  border-radius: 8px;
  padding: 3px 6px;
  background: #fff;
}

.path-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.path-input input {
  border: 1px solid var(--button-border);
  border-radius: 10px;
  padding: 7px 9px;
  font-size: 13px;
  color: var(--text-main);
}

.path-input input:focus {
  outline: 2px solid rgba(14, 86, 120, 0.25);
  outline-offset: 1px;
}

.morph-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.morph-item {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.morph-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.morph-item input[type="range"] {
  width: 100%;
}

.morph-value {
  width: 34px;
  text-align: right;
  color: var(--text-muted);
}

.drop-zone {
  border: 1px dashed #8ea6b6;
  background: rgba(255, 255, 255, 0.62);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: #436070;
}

.drop-zone.active {
  border-color: #0e5678;
  background: rgba(217, 238, 246, 0.65);
}

@media (max-width: 980px) {
  #app {
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  .layout {
    flex-direction: column;
    min-height: 100vh;
  }

  #MV {
    width: 100%;
    height: 62vh;
  }

  .sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--panel-border);
    box-shadow: 0 -8px 24px rgba(20, 28, 41, 0.08);
  }

  .button-grid.two-col {
    grid-template-columns: 1fr;
  }
}

@keyframes sidebar-slide-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes canvas-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
