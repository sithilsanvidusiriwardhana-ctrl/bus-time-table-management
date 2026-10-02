import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const mount = document.getElementById('heroScene');

if (mount) {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(5.8, 3.5, 8.3);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xb9f8f1, 0x15201d, 2.2));
    const keyLight = new THREE.DirectionalLight(0xfff2c8, 3.2);
    keyLight.position.set(-3, 7, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x00dfd3, 24, 18);
    rimLight.position.set(2, 2, -3);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 20),
      new THREE.MeshStandardMaterial({ color: 0x111b1c, roughness: 0.9, metalness: 0.15 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.018, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x1b6865 })
    );
    lane.position.set(0, 0.005, -1.8);
    scene.add(lane);

    const bus = new THREE.Group();
    const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0xc8e36b, metalness: 0.22, roughness: 0.32, clearcoat: 0.8 });
    const lowerMaterial = new THREE.MeshStandardMaterial({ color: 0x91ad3e, metalness: 0.3, roughness: 0.4 });
    const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x10292d, metalness: 0.55, roughness: 0.16, clearcoat: 1 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x142022, metalness: 0.55, roughness: 0.38 });
    const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xc4fff0, emissive: 0x48fff0, emissiveIntensity: 2.3 });

    function addBox(parent, size, position, material, rotation = [0, 0, 0]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    }

    addBox(bus, [4.5, 1.45, 1.55], [0, 1.16, 0], bodyMaterial);
    addBox(bus, [4.22, 0.3, 1.57], [0, 0.48, 0], lowerMaterial);
    addBox(bus, [3.42, 0.82, 1.49], [-0.34, 2.26, 0], bodyMaterial);
    addBox(bus, [1.06, 0.78, 0.045], [1.72, 1.9, 0.79], glassMaterial, [0, -0.12, 0]);
    addBox(bus, [0.04, 0.8, 1.3], [-2.24, 1.88, 0], trimMaterial);

    [-1.35, -0.45, 0.45, 1.25].forEach((x) => {
      addBox(bus, [0.68, 0.69, 0.035], [x, 2.27, 0.78], glassMaterial);
      addBox(bus, [0.025, 0.76, 0.045], [x + 0.37, 2.27, 0.79], trimMaterial);
    });
    [-1.35, -0.45, 0.45, 1.25].forEach((x) => {
      addBox(bus, [0.68, 0.69, 0.035], [x, 2.27, -0.78], glassMaterial);
    });

    addBox(bus, [0.18, 0.055, 0.06], [1.78, 1.1, 0.81], lightMaterial);
    addBox(bus, [0.18, 0.055, 0.06], [1.78, 1.1, -0.81], lightMaterial);
    addBox(bus, [0.025, 0.06, 0.08], [-1.85, 1.1, 0.81], trimMaterial);
    addBox(bus, [1.05, 0.035, 0.025], [-0.7, 0.87, 0.8], new THREE.MeshStandardMaterial({ color: 0xf5bd45, emissive: 0x6c3900, emissiveIntensity: 0.7 }));

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x101617, roughness: 0.76, metalness: 0.15 });
    const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x7fa346, metalness: 0.65, roughness: 0.26 });
    const wheels = [];
    [-1.42, 1.42].forEach((x) => [-0.79, 0.79].forEach((z) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, 0.52, z);

      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.2, 32), wheelMaterial);
      wheel.rotation.x = Math.PI / 2;
      wheelGroup.add(wheel);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 24), hubMaterial);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = z > 0 ? 0.015 : -0.015;
      wheelGroup.add(hub);

      bus.add(wheelGroup);
      wheels.push(wheelGroup);
    }));

    const frontGrille = addBox(bus, [0.42, 0.36, 0.05], [2.28, 0.82, 0.79], trimMaterial);
    frontGrille.material = trimMaterial;

    const startX = -12;
    const endX = 12;
    let currentX = startX;
    const baseSpeed = 3.6; // units per second (~6.7s per screen cross)
    bus.position.set(startX, 0, 0);
    scene.add(bus);

    let isHovered = false;
    mount.addEventListener('pointerenter', () => { isHovered = true; });
    mount.addEventListener('pointerleave', () => { isHovered = false; });

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lastTime = performance.now();

    function resizeScene() {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.position.z = width < 560 ? 10 : 8.3;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    const resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(mount);
    window.addEventListener('resize', resizeScene, { passive: true });
    resizeScene();

    function animate(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!reducedMotion) {
        const speed = isHovered ? baseSpeed * 0.45 : baseSpeed;
        currentX += speed * dt;
        if (currentX > endX) {
          currentX = startX;
        }

        bus.position.x = currentX;
        bus.position.y = 0.016 * Math.sin(now * 0.011);
        bus.rotation.z = 0.003 * Math.sin(now * 0.007);
        bus.rotation.y = 0.004 * Math.sin(now * 0.004);

        wheels.forEach((wheelGroup) => {
          wheelGroup.rotation.z = -bus.position.x / 0.43;
        });
      } else {
        bus.position.set(0, 0, 0);
        bus.rotation.set(0, 0, 0);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  } catch (error) {
    console.error('Unable to start the 3D bus scene.', error);
    mount.querySelector('.scene-fallback')?.removeAttribute('hidden');
  }
}