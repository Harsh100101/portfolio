/* ── 3D INTERACTIVE SHAPE ──
   - Rotation is driven entirely by cursor position (no idle auto-spin).
   - On scroll into a new section, the shape performs a flip-rotate +
     cross-fade transition into the next geometry (no scale/zoom pulsing).
*/
(function(){
  const canvasEl = document.getElementById('shape-canvas');
  if(!canvasEl || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvasEl.clientWidth/canvasEl.clientHeight || 1, 0.1, 100);
  camera.position.z = 6;

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  function sizeCanvas(){
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  // Color palette matching site theme
  const colorA = new THREE.Color(0x5b7fff); // accent
  const colorB = new THREE.Color(0xa78bfa); // a2
  const colorC = new THREE.Color(0x34d399); // a3
  const colorD = new THREE.Color(0xfb923c); // a4
  const palette = [colorA, colorB, colorC, colorD];

  // Geometries representing different "sections" of the site narrative
  const geometries = [
    new THREE.IcosahedronGeometry(1.7, 0),           // hero — complex/ambitious
    new THREE.TorusKnotGeometry(1.05, 0.32, 100, 16), // projects — intricate work
    new THREE.OctahedronGeometry(1.8, 0),             // skills — sharp/precise
    new THREE.DodecahedronGeometry(1.7, 0),           // cta — polished/complete
  ];

  // Two meshes are used for a true cross-fade transition between geometries
  // (incoming mesh fades in / rotates in while outgoing fades out / rotates out)
  function makeMaterial(opacity){
    return new THREE.MeshBasicMaterial({
      color: colorA, wireframe: true, transparent: true, opacity
    });
  }

  let currentGeoIndex = parseInt(canvasEl.dataset.startIndex || '0', 10) % geometries.length;

  const matA = makeMaterial(0.55);
  matA.color.copy(palette[currentGeoIndex % palette.length]);
  const meshA = new THREE.Mesh(geometries[currentGeoIndex], matA);
  scene.add(meshA);

  const matB = makeMaterial(0);
  const meshB = new THREE.Mesh(new THREE.BufferGeometry(), matB);
  meshB.visible = false;
  scene.add(meshB);

  // Group wrapper lets us apply cursor-rotation to both meshes uniformly
  // while each mesh keeps its own transition-rotation offset
  const group = new THREE.Group();
  group.add(meshA, meshB);
  scene.add(group);

  // ── ambient point halo ──
  const particlesGeo = new THREE.BufferGeometry();
  const particleCount = 60;
  const positions = new Float32Array(particleCount * 3);
  for(let i=0;i<particleCount;i++){
    const r = 2.2 + Math.random()*0.6;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.acos((Math.random()*2)-1);
    positions[i*3]   = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
    positions[i*3+2] = r*Math.cos(phi);
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particlesMat = new THREE.PointsMaterial({ color: colorB, size: 0.035, transparent:true, opacity:0.45 });
  const particlePoints = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particlePoints);

  /* ── CURSOR-DRIVEN ROTATION (no idle auto-spin) ──
     The shape's rotation is a direct, smoothed function of mouse position.
     If the mouse never moves, the shape stays still. */
  let mouseX = 0, mouseY = 0;          // normalized -1..1
  let curRotX = 0, curRotY = 0;        // smoothed current rotation
  const ROT_RANGE_X = 0.6;             // max tilt up/down
  const ROT_RANGE_Y = 0.9;             // max turn left/right
  const SMOOTHING = 0.06;              // lower = lazier follow, higher = snappier

  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / innerWidth) * 2 - 1;
    mouseY = (e.clientY / innerHeight) * 2 - 1;
  });
  // touch support: drag to orbit on mobile/tablet
  let touching = false;
  document.addEventListener('touchstart', () => { touching = true; }, { passive: true });
  document.addEventListener('touchend', () => { touching = false; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if(!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    mouseX = (t.clientX / innerWidth) * 2 - 1;
    mouseY = (t.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── SCROLL-DRIVEN SECTION DETECTION ── */
  const sectionEls = Array.from(document.querySelectorAll('[data-shape-section]'));

  function getActiveSectionIndex(){
    if(sectionEls.length === 0){
      const scrollFraction = scrollY / (document.body.scrollHeight - innerHeight || 1);
      return Math.min(geometries.length-1, Math.floor(scrollFraction * geometries.length));
    }
    let idx = 0;
    const mid = scrollY + innerHeight*0.4;
    sectionEls.forEach((el, i) => { if(el.offsetTop <= mid) idx = i; });
    return Math.min(idx, geometries.length-1);
  }

  /* ── TRANSITION: flip-rotate + cross-fade (no scale/zoom) ──
     Outgoing mesh rotates away on its Y axis while fading out.
     Incoming mesh rotates in from the opposite direction while fading in. */
  let isTransitioning = false;

  function transitionTo(newIndex){
    if(newIndex === currentGeoIndex || isTransitioning) return;
    isTransitioning = true;

    const outMesh = meshA.visible !== false ? meshA : meshB;
    const inMesh  = outMesh === meshA ? meshB : meshA;
    const outMat  = outMesh.material;
    const inMat   = inMesh.material;

    inMesh.geometry.dispose?.();
    inMesh.geometry = geometries[newIndex];
    inMat.color.copy(palette[newIndex % palette.length]);
    particlesMat.color.copy(palette[(newIndex+1) % palette.length]);

    // start incoming mesh rotated 100deg away, opposite direction to outgoing spin
    const dir = (newIndex > currentGeoIndex) ? 1 : -1;
    inMesh.rotation.set(0, dir * -1.8, 0);
    inMat.opacity = 0;
    inMesh.visible = true;

    const duration = 850; // ms
    const start = performance.now();

    function step(now){
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2; // easeInOutCubic

      outMesh.rotation.y = dir * ease * 1.8;
      outMat.opacity = 0.55 * (1 - ease);

      inMesh.rotation.y = dir * -1.8 * (1 - ease);
      inMat.opacity = 0.55 * ease;

      if(t < 1){
        requestAnimationFrame(step);
      } else {
        outMesh.visible = false;
        outMat.opacity = 0;
        outMesh.rotation.set(0,0,0);
        inMat.opacity = 0.55;
        inMesh.rotation.set(0,0,0);
        currentGeoIndex = newIndex;
        isTransitioning = false;
      }
    }
    requestAnimationFrame(step);
  }

  window.addEventListener('scroll', () => {
    transitionTo(getActiveSectionIndex());
  }, { passive: true });

  /* ── RENDER LOOP — purely cursor-reactive, zero idle motion ── */
  function animate(){
    requestAnimationFrame(animate);

    // smoothly approach the cursor-derived target rotation
    const targetY = mouseX * ROT_RANGE_Y;
    const targetX = -mouseY * ROT_RANGE_X;
    curRotX += (targetX - curRotX) * SMOOTHING;
    curRotY += (targetY - curRotY) * SMOOTHING;

    group.rotation.x = curRotX;
    group.rotation.y = curRotY;

    // very slow ambient halo drift only — not the main shape
    particlePoints.rotation.y -= 0.0006;
    particlePoints.rotation.x += 0.0003;

    renderer.render(scene, camera);
  }
  animate();
})();
