/**
 * A fabricated channel letter, shown as a material study rather than a project.
 * The scene renders on demand. The continuously moving element on the page is
 * the project marquee; this object only leans in response to a pointer.
 */
export async function initSignScene() {
  const host = document.querySelector('#sign-scene');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!host || motion.matches) return () => {};

  const fallback = host.querySelector('.scene-fallback');
  const disposables = new Set();
  const removers = [];
  let renderer;
  let canvas;
  let observer;
  let resizeObserver;
  let environmentTarget;
  let frame = 0;
  let disposed = false;
  let visible = true;
  let rendered = false;
  let key;
  const previousFallbackHidden = fallback?.hidden;
  const previousFallbackOpacity = fallback?.style.opacity;

  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    resizeObserver?.disconnect();
    removers.forEach((remove) => remove());
    key?.shadow?.map?.dispose();
    environmentTarget?.dispose();
    disposables.forEach((item) => item.dispose?.());
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas?.remove();
    if (fallback) {
      fallback.hidden = previousFallbackHidden;
      fallback.style.opacity = previousFallbackOpacity || '';
    }
    host.classList.remove('scene-ready');
  }

  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    removers.push(() => target.removeEventListener(event, handler, options));
  }

  try {
    const [THREE, { FontLoader }, { TextGeometry }, fontData] = await Promise.all([
      import('./assets/vendor/three.module.js'),
      import('./assets/vendor/FontLoader.js'),
      import('./assets/vendor/TextGeometry.js'),
      fetch('./assets/vendor/helvetiker_bold.typeface.json').then((response) => {
        if (!response.ok) throw new Error('Font unavailable');
        return response.json();
      }),
    ]);
    if (motion.matches) return cleanup;

    const track = (item) => {
      disposables.add(item);
      return item;
    };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0.45, 0.34, 7.8);
    camera.lookAt(0, -0.02, 0);

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x101010, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      display: 'block',
      width: '100%',
      height: '100%',
    });
    host.appendChild(canvas);

    // Dark studio with discrete HDR cards gives the metal real reflections.
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x08090b);
    function card(width, height, position, intensity, tint) {
      const material = track(new THREE.MeshBasicMaterial({
        color: new THREE.Color(tint).multiplyScalar(intensity),
        side: THREE.DoubleSide,
        toneMapped: false,
      }));
      const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(width, height)), material);
      plane.position.set(...position);
      plane.lookAt(0, 0, 0);
      studio.add(plane);
    }
    card(1.7, 4.8, [-4, 2.4, 3], 4.2, 0xfff3e8);
    card(0.65, 4.8, [-2, 2.4, 3.8], 3.3, 0xfff3e8);
    card(2.1, 4.5, [4, 1.0, 1.2], 2.0, 0xb8d4ff);
    card(5.0, 1.1, [0, 5, -1], 3.0, 0xffffff);
    card(1.8, 3.6, [1.6, 1.0, -4], 1.5, 0xff3226);
    const pmrem = new THREE.PMREMGenerator(renderer);
    environmentTarget = pmrem.fromScene(studio, 0.006, 0.1, 30);
    pmrem.dispose();
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = 0.8;

    const metal = track(new THREE.MeshPhysicalMaterial({
      color: 0xa9aeb5,
      metalness: 1,
      roughness: 0.28,
      anisotropy: 0.7,
      anisotropyRotation: Math.PI / 2,
      envMap: environmentTarget.texture,
      envMapIntensity: 0.8,
      clearcoat: 0.12,
      clearcoatRoughness: 0.32,
    }));
    const acrylic = track(new THREE.MeshPhysicalMaterial({
      color: 0xf3261a,
      emissive: 0xf31308,
      emissiveIntensity: 0.9,
      metalness: 0,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.13,
      envMap: environmentTarget.texture,
      envMapIntensity: 0.5,
    }));
    const font = new FontLoader().parse(fontData);
    const geometry = track(new TextGeometry('R', {
      font,
      size: 3,
      depth: 0.6,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.045,
      bevelSegments: 3,
    }));
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    // TextGeometry assigns its end caps to index 0 and metal returns to 1.
    const letter = new THREE.Mesh(geometry, [acrylic, metal]);
    letter.castShadow = true;
    letter.receiveShadow = true;
    const piece = new THREE.Group();
    piece.add(letter);
    const rest = { x: 0.055, y: -0.43, z: -0.035 };
    const target = { x: rest.x, y: rest.y };
    piece.rotation.set(rest.x, rest.y, rest.z);
    scene.add(piece);

    const floorMaterial = track(new THREE.MeshStandardMaterial({
      color: 0x101010,
      roughness: 0.48,
      metalness: 0.55,
      transparent: true,
      opacity: 0.9,
    }));
    const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(18, 18)), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.58;
    floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new THREE.AmbientLight(0xdbe2ef, 0.18));
    key = new THREE.DirectionalLight(0xfff1e6, 3.3);
    key.position.set(-3, 5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa6c8ff, 2.7);
    rim.position.set(4, 2, -2);
    scene.add(rim);
    const glow = new THREE.PointLight(0xff2114, 7, 5, 2);
    glow.position.set(0, -0.7, 1.0);
    scene.add(glow);

    function draw() {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      piece.rotation.x += (target.x - piece.rotation.x) * 0.08;
      piece.rotation.y += (target.y - piece.rotation.y) * 0.08;
      try {
        renderer.render(scene, camera);
      } catch {
        cleanup();
        return;
      }
      if (!rendered) {
        rendered = true;
        host.classList.add('scene-ready');
        if (fallback) fallback.hidden = true;
      }
      if (Math.abs(target.x - piece.rotation.x) + Math.abs(target.y - piece.rotation.y) > 0.0002) {
        frame = requestAnimationFrame(draw);
      }
    }

    function invalidate() {
      if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function resize() {
      if (disposed) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = Math.max(7.8, 6.1 / camera.aspect);
      camera.updateProjectionMatrix();
      invalidate();
    }
    function pointer(event) {
      if (event.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      target.y = rest.y + x * 0.23;
      target.x = rest.x + y * 0.11;
      invalidate();
    }
    function resetPointer() {
      target.x = rest.x;
      target.y = rest.y;
      invalidate();
    }
    listen(host, 'pointermove', pointer, { passive: true });
    listen(host, 'pointerleave', resetPointer, { passive: true });
    listen(window, 'blur', resetPointer);
    listen(document, 'visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else invalidate();
    });
    listen(canvas, 'webglcontextlost', cleanup);
    listen(motion, 'change', () => { if (motion.matches) cleanup(); });

    const buttons = [...document.querySelectorAll('[data-sign-color]')];
    buttons.forEach((button) => {
      listen(button, 'click', () => {
        const isWhite = button.dataset.signColor === 'white';
        acrylic.color.set(isWhite ? 0xf6f0e7 : 0xf3261a);
        acrylic.emissive.set(isWhite ? 0xffeee4 : 0xf31308);
        acrylic.emissiveIntensity = isWhite ? 0.72 : 0.9;
        glow.color.set(isWhite ? 0xffe9de : 0xff2114);
        glow.intensity = isWhite ? 4 : 7;
        buttons.forEach((candidate) => {
          candidate.setAttribute('aria-pressed', String(candidate === button));
        });
        invalidate();
      });
    });

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else invalidate();
    }, { rootMargin: '80px' });
    observer.observe(host);
    resize();
    return cleanup;
  } catch {
    // A complete static product image remains usable without fonts or WebGL.
    cleanup();
    return () => {};
  }
}
