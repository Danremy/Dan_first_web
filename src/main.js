import './style.scss'
import * as THREE from "three"
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


//#region Basic
const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color("#D9CAD1");

const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  200
);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
camera.position.set( 0.02785794073621556,  6.378834756783063, 7.824844260689259)
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));



const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 0;
controls.maxDistance = 10;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;
controls.minAzimuthAngle = -Math.PI / 6;
controls.maxAzimuthAngle = Math.PI / 6;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set( -0.051064711864105786, 1.1891443723854849, -0.8800486297851645)
//#endregion

//Model
const textureLoader = new THREE.TextureLoader();
const dracoLoader = new DRACOLoader();
//dracoLoader.setDecoderPath('/public/model/test.glb')

const loader = new GLTFLoader();
//loader.setDRACOLoader(dracoLoader);

loader.load("/public/model/test.glb",
    (gltf)=>
    {     
        const model = gltf.scene;
        model.scale.set(1.2,1.2,1.2)
        model.rotation.set(0, 2*Math.PI / 3, 0);
        scene.add(model)
    }
)
/*
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({
    color: 0xffffff
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
*/
//#region  Function
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update Camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

//#endregion

const render = () => {
    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
};

render();