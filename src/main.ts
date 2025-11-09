import * as THREE from 'three';
import { loadPLY, SplatData } from './ply-loader';
import { applyDisplacement, applyColorManipulation, ManipulationParams } from './manipulations';

class SplatterApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private points: THREE.Points | null = null;
  private originalPositions: Float32Array | null = null;
  private originalColors: Float32Array | null = null;
  private animationId: number | null = null;
  private params: ManipulationParams;
  private animationTime = 0;
  private animationSpeed = 1;

  constructor(container: HTMLElement) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Initialize parameters
    this.params = {
      noiseIntensity: 0,
      noiseScale: 1,
      time: 0,
      vortexEnabled: false,
      vortexStrength: 1,
      waveEnabled: false,
      waveAmplitude: 0.5,
      hueShift: 0,
      saturation: 1,
    };

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Mouse interaction for camera rotation
    this.setupMouseControls();

    // Start animation loop
    this.animate();
  }

  private setupMouseControls(): void {
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;
    let rotationY = 0;
    let rotationX = 0;

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;

      rotationY += deltaX * 0.01;
      rotationX += deltaY * 0.01;

      // Limit vertical rotation
      rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

      const distance = 5;
      this.camera.position.x = distance * Math.sin(rotationY) * Math.cos(rotationX);
      this.camera.position.y = distance * Math.sin(rotationX) + 2;
      this.camera.position.z = distance * Math.cos(rotationY) * Math.cos(rotationX);
      this.camera.lookAt(0, 0, 0);

      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const distance = Math.sqrt(
        this.camera.position.x ** 2 +
        (this.camera.position.y - 2) ** 2 +
        this.camera.position.z ** 2
      );

      const newDistance = Math.max(1, Math.min(20, distance + e.deltaY * zoomSpeed));
      const scale = newDistance / distance;

      this.camera.position.x *= scale;
      this.camera.position.z *= scale;
      this.camera.position.y = (this.camera.position.y - 2) * scale + 2;
    });
  }

  private onWindowResize(): void {
    const container = this.renderer.domElement.parentElement!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    // Update animation time
    this.animationTime += 0.016 * this.animationSpeed;
    this.params.time = this.animationTime;

    // Apply manipulations if we have data
    if (this.points && this.originalPositions && this.originalColors) {
      const geometry = this.points.geometry;
      applyDisplacement(
        geometry.attributes.position as THREE.BufferAttribute,
        this.originalPositions,
        this.params
      );
      applyColorManipulation(
        geometry.attributes.color as THREE.BufferAttribute,
        this.originalColors,
        this.params
      );
    }

    this.renderer.render(this.scene, this.camera);
  };

  public async loadSplatFile(file: File): Promise<void> {
    try {
      console.log('Loading PLY file...');
      const splatData = await loadPLY(file);
      console.log(`Loaded ${splatData.count} splats`);

      // Remove old points if they exist
      if (this.points) {
        this.scene.remove(this.points);
        this.points.geometry.dispose();
        (this.points.material as THREE.Material).dispose();
      }

      // Store original data
      this.originalPositions = new Float32Array(splatData.positions);
      this.originalColors = new Float32Array(splatData.colors);

      // Create geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(splatData.positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(splatData.colors, 3));

      // Create material
      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        sizeAttenuation: true,
      });

      // Create points
      this.points = new THREE.Points(geometry, material);
      this.scene.add(this.points);

      // Center and scale the model
      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox!;
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      this.points.position.sub(center);

      // Scale to fit
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3 / maxDim;
      this.points.scale.setScalar(scale);

      console.log('Splat file loaded successfully');
    } catch (error) {
      console.error('Error loading PLY file:', error);
      alert('Error loading PLY file. Please ensure it is a valid PLY file.');
    }
  }

  public updateParams(newParams: Partial<ManipulationParams>): void {
    Object.assign(this.params, newParams);
  }

  public setAnimationSpeed(speed: number): void {
    this.animationSpeed = speed;
  }

  public reset(): void {
    this.animationTime = 0;
    this.params = {
      noiseIntensity: 0,
      noiseScale: 1,
      time: 0,
      vortexEnabled: false,
      vortexStrength: 1,
      waveEnabled: false,
      waveAmplitude: 0.5,
      hueShift: 0,
      saturation: 1,
    };
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}

// Initialize app
const container = document.getElementById('canvas-container')!;
const app = new SplatterApp(container);

// Setup UI controls
const fileInput = document.getElementById('file-input') as HTMLInputElement;
fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    app.loadSplatFile(file);
  }
});

// Noise controls
const noiseIntensity = document.getElementById('noise-intensity') as HTMLInputElement;
const noiseIntensityValue = document.getElementById('noise-intensity-value')!;
noiseIntensity.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  noiseIntensityValue.textContent = value.toFixed(1);
  app.updateParams({ noiseIntensity: value });
});

const noiseScale = document.getElementById('noise-scale') as HTMLInputElement;
const noiseScaleValue = document.getElementById('noise-scale-value')!;
noiseScale.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  noiseScaleValue.textContent = value.toFixed(1);
  app.updateParams({ noiseScale: value });
});

const animationSpeed = document.getElementById('animation-speed') as HTMLInputElement;
const animationSpeedValue = document.getElementById('animation-speed-value')!;
animationSpeed.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  animationSpeedValue.textContent = value.toFixed(1);
  app.setAnimationSpeed(value);
});

// Vortex effect
const vortexEffect = document.getElementById('vortex-effect') as HTMLInputElement;
const vortexStrength = document.getElementById('vortex-strength') as HTMLInputElement;
const vortexStrengthValue = document.getElementById('vortex-strength-value')!;

vortexEffect.addEventListener('change', (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  vortexStrength.disabled = !enabled;
  app.updateParams({ vortexEnabled: enabled });
});

vortexStrength.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  vortexStrengthValue.textContent = value.toFixed(1);
  app.updateParams({ vortexStrength: value });
});

// Wave effect
const waveEffect = document.getElementById('wave-effect') as HTMLInputElement;
const waveAmplitude = document.getElementById('wave-amplitude') as HTMLInputElement;
const waveAmplitudeValue = document.getElementById('wave-amplitude-value')!;

waveEffect.addEventListener('change', (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  waveAmplitude.disabled = !enabled;
  app.updateParams({ waveEnabled: enabled });
});

waveAmplitude.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  waveAmplitudeValue.textContent = value.toFixed(1);
  app.updateParams({ waveAmplitude: value });
});

// Color controls
const hueShift = document.getElementById('hue-shift') as HTMLInputElement;
const hueShiftValue = document.getElementById('hue-shift-value')!;
hueShift.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  hueShiftValue.textContent = `${value}°`;
  app.updateParams({ hueShift: value });
});

const saturation = document.getElementById('saturation') as HTMLInputElement;
const saturationValue = document.getElementById('saturation-value')!;
saturation.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value);
  saturationValue.textContent = value.toFixed(1);
  app.updateParams({ saturation: value });
});

// Reset button
const resetBtn = document.getElementById('reset-btn')!;
resetBtn.addEventListener('click', () => {
  app.reset();

  // Reset UI controls
  noiseIntensity.value = '0';
  noiseIntensityValue.textContent = '0';
  noiseScale.value = '1';
  noiseScaleValue.textContent = '1';
  animationSpeed.value = '1';
  animationSpeedValue.textContent = '1';
  vortexEffect.checked = false;
  vortexStrength.disabled = true;
  vortexStrength.value = '1';
  vortexStrengthValue.textContent = '1';
  waveEffect.checked = false;
  waveAmplitude.disabled = true;
  waveAmplitude.value = '0.5';
  waveAmplitudeValue.textContent = '0.5';
  hueShift.value = '0';
  hueShiftValue.textContent = '0°';
  saturation.value = '1';
  saturationValue.textContent = '1';
});

console.log('Splatter app initialized. Load a PLY file to get started!');
