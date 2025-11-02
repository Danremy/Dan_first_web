import './style.scss'
import * as THREE from "three"
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import gsap from 'gsap'


/* 放在 main.js 任意位置（甚至头部）都能生效 */
document.addEventListener('click', e => {
  if (!e.target.matches('.modal-exit-button')) return;   // 不是 ✕ 按钮就忽略
  const modal = e.target.closest('.modal');
  if (modal) hideModal(modal);
});


window.modals = {
  about:  document.querySelector('.modal.about'),
  work:   document.querySelector('.modal.work'),
  contact:document.querySelector('.modal.contact'),
  next:   document.querySelector('.modal.next')
};



window.showModal = (modal) => {
  modal.style.display = 'block';  
  requestAnimationFrame(() => modal.classList.add('show')); // 再淡入
};
window.hideModal = (modal) => {
  modal.classList.remove('show');     // 先淡出
  modal.addEventListener('transitionend', () => {
    modal.style.display = 'none';
  }, { once: true });
};

let hoverTimer = null;          // 防抖定时器
let lastHoverGroup = null;      // 缓存上一帧悬停组，减少连续设置 scaleTarget

//#region Basic
const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color("#D9CAD1");

// Raycaster 与鼠标向量（标准拾取）
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
// 可拾取的 Mesh 集合（Raycaster 对象）
window.__pickableMeshes = [];
// 可缩放的组节点集合（白名单命中的对象）
window.__scalableGroups = new Set();
// 当前悬停的组节点
window.__hoveredGroup = null;

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

// 仅允许缩放的“组节点”名称集合（白名单），以组为交互单元
// 例如：['FanGroup1','PanelA']，命中任意子 Mesh 时，缩放整组
const scalableGroupNames = new Set(['bilibili','x','youtube','github','Aboutme','Donework','Contact','Nextstep']);


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

        // 保存需要旋转的多个子节点（fan1 ~ fan6）
        const fanNames = ['fan1','fan2','fan3','fan4','fan5','fan6'];
        const spinTargets = [];
        fanNames.forEach(name => {
          const node = model.getObjectByName(name);
          if (node) spinTargets.push(node);
        });
        // 暴露到全局，渲染循环里统一旋转
        window.__spinTargets = spinTargets;

        



        // 收集：所有 Mesh 作为可拾取对象；白名单命中的“组”作为缩放目标
        model.traverse((child)=>{
          if (child.isMesh) {
             window.__pickableMeshes.push(child);
             child.userData._group = child.parent;
          }
          if (child.name && scalableGroupNames.has(child.name)) {
             window.__scalableGroups.add(child);
             child.userData.scaleTarget = child.userData.scaleTarget ?? 1; // 目标缩放比例（默认 1）
          }
        });

        
        
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

// 鼠标移动事件：更新 NDC，并进行射线检测
renderer.domElement.addEventListener('mousemove', (e) => {
  // 1. 先存坐标，供 click 复用，但不做射线
  const x = (e.offsetX / renderer.domElement.clientWidth)  * 2 - 1;
  const y = -(e.offsetY / renderer.domElement.clientHeight) * 2 + 1;
  mouse.set(x, y);

  // 2. 清掉上一次的定时器
  clearTimeout(hoverTimer);

  // 3. 200 ms 内没再动鼠标才真正检测
  hoverTimer = setTimeout(() => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(window.__pickableMeshes, true);

    const findScalableAncestor = (n) => {
      let p = n; while (p) { if (__scalableGroups.has(p)) return p; p = p.parent; } return null;
    };

    const group = intersects.length ? findScalableAncestor(intersects[0].object) : null;

    // 和上一帧相同就啥也不干
    if (group === lastHoverGroup) return;

    // 恢复旧组
    if (lastHoverGroup) lastHoverGroup.userData.scaleTarget = 1;

    // 应用新组
    if (group) group.userData.scaleTarget = 1.2;
    lastHoverGroup = group;
  }, 1);   // 1 ms 可调
});

/* --------------- 点击事件（修正版）--------------- */
window.addEventListener('click', () => {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(window.__pickableMeshes, true);
  if (!intersects.length) return;

  const find = (n) => { let p = n; while (p) { if (window.__scalableGroups.has(p)) return p; p = p.parent; } return null; };
  const group = find(intersects[0].object);
  if (!group) return;

  /* 1. 弹窗组优先 */
  const modalMap = {
    Aboutme : modals.about,
    Donework: modals.work,
    Contact : modals.contact,
    Nextstep: modals.next
  };
  let hasModal = false;
  for (const [key, modal] of Object.entries(modalMap)) {
    if (group.name.includes(key)) {
      showModal(modal);
      hasModal = true;
      break;               // 命中弹窗就停
    }
  }

  /* 2. 只有「没弹窗」才试外链 */
  if (!hasModal) {
    const linkMap = {
      bilibili: 'https://space.bilibili.com/334895131?spm_id_from=333.1007.0.0',
      x:        'https://x.com/Danremy123',
      youtube:  'https://www.youtube.com/@Danremy',
      github:   'https://github.com/Danremy'
    };
    for (const [key, url] of Object.entries(linkMap)) {
      if (group.name.includes(key)) {
        window.open(url, '_blank', 'noopener');
        break;
      }
    }
  }
});




// 渲染循环
const render = () => {

    controls.update();

    if (window.__spinTargets && window.__spinTargets.length) {
      for (const node of window.__spinTargets) {
        node.rotation.z += 0.03; // 调整速度
      }
    }
    
    if (window.__scalableGroups && window.__scalableGroups.size) {
      for (const group of window.__scalableGroups) {
        const target = group.userData.scaleTarget ?? 1;
        const current = group.scale.x; // 假设各轴相同
        const lerped = THREE.MathUtils.lerp(current, target, 0.15); // 0.0~1.0 越大越快
        group.scale.setScalar(lerped);
      }
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
};

render();