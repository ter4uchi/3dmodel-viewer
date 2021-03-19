import * as THREE from "three";

export default{
    model:{
        model:{
            url:"/model/MiraiAkari_v1.0.pmx"
        },
        camera:{
            PerspectiveCamera:{
                fov:70,
                aspectX:600,
                aspectY:800,
                near:1,
                far:1000
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
                color:"0xFFFFFF",
                intensity:1.0
            },
            position:{
                x:50,
                y:0,
                z:200
            }
        }
    }
}