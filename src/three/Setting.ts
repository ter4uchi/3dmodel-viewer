import * as THREE from "three";

export default{
    model:{
        model:{
            MiraiAkari:"model/MiraiAkari/MiraiAkari_v1.0.pmx",
            TokinoSora:"model/TokinoSora/ときのそら.pmx"
        },
        camera:{
            PerspectiveCamera:{
                fov:70,
                aspectX:document.body.clientWidth,
                aspectY:document.body.clientHeight,
                near:1,
                far:500
            },
            position:{
                x:0,
                y:20,
                z:20
            },
            lookAt:new THREE.Vector3(0, 10, 0)
        },
        light:{
            DirectionLight:{
                color:"0xFF0000",
                intensity:1.0
            },
            position:{
                x:20,
                y:0,
                z:20
            }
        }
    }
}