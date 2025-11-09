import * as THREE from 'three';

// Simple 3D noise function (simplified Perlin-like noise)
function noise3D(x: number, y: number, z: number): number {
  // Simple hash-based noise
  const hash = (x: number, y: number, z: number) => {
    let h = 0;
    h = ((h + x) * 374761393) & 0x7fffffff;
    h = ((h + y) * 668265263) & 0x7fffffff;
    h = ((h + z) * 1274126177) & 0x7fffffff;
    return h / 0x7fffffff;
  };

  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  // Smooth interpolation
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);

  // Interpolate
  const a = hash(ix, iy, iz);
  const b = hash(ix + 1, iy, iz);
  const c = hash(ix, iy + 1, iz);
  const d = hash(ix + 1, iy + 1, iz);
  const e = hash(ix, iy, iz + 1);
  const f = hash(ix + 1, iy, iz + 1);
  const g = hash(ix, iy + 1, iz + 1);
  const h = hash(ix + 1, iy + 1, iz + 1);

  const k0 = a;
  const k1 = b - a;
  const k2 = c - a;
  const k3 = e - a;
  const k4 = a - b - c + d;
  const k5 = a - c - e + g;
  const k6 = a - b - e + f;
  const k7 = -a + b + c - d + e - f - g + h;

  return k0 + k1 * u + k2 * v + k3 * w + k4 * u * v + k5 * v * w + k6 * w * u + k7 * u * v * w;
}

export interface ManipulationParams {
  noiseIntensity: number;
  noiseScale: number;
  time: number;
  vortexEnabled: boolean;
  vortexStrength: number;
  waveEnabled: boolean;
  waveAmplitude: number;
  hueShift: number;
  saturation: number;
}

export function applyDisplacement(
  positions: THREE.BufferAttribute,
  originalPositions: Float32Array,
  params: ManipulationParams
): void {
  const { noiseIntensity, noiseScale, time } = params;

  for (let i = 0; i < originalPositions.length / 3; i++) {
    const ox = originalPositions[i * 3 + 0];
    const oy = originalPositions[i * 3 + 1];
    const oz = originalPositions[i * 3 + 2];

    // Apply noise displacement
    const nx = noise3D(ox * noiseScale, oy * noiseScale, oz * noiseScale + time);
    const ny = noise3D(ox * noiseScale + 100, oy * noiseScale, oz * noiseScale + time);
    const nz = noise3D(ox * noiseScale, oy * noiseScale + 100, oz * noiseScale + time);

    let x = ox + nx * noiseIntensity;
    let y = oy + ny * noiseIntensity;
    let z = oz + nz * noiseIntensity;

    // Apply vortex effect
    if (params.vortexEnabled) {
      const dist = Math.sqrt(x * x + z * z);
      const angle = Math.atan2(z, x) + (params.vortexStrength * time * 0.5) / (dist + 1);
      const newX = Math.cos(angle) * dist;
      const newZ = Math.sin(angle) * dist;
      x = newX;
      z = newZ;
    }

    // Apply wave effect
    if (params.waveEnabled) {
      y += Math.sin(x * 2 + time * 2) * params.waveAmplitude;
      y += Math.cos(z * 2 + time * 1.5) * params.waveAmplitude * 0.5;
    }

    positions.setXYZ(i, x, y, z);
  }

  positions.needsUpdate = true;
}

export function applyColorManipulation(
  colors: THREE.BufferAttribute,
  originalColors: Float32Array,
  params: ManipulationParams
): void {
  const { hueShift, saturation } = params;

  if (hueShift === 0 && saturation === 1) {
    // No color manipulation needed
    for (let i = 0; i < originalColors.length; i++) {
      colors.setX(i, originalColors[i]);
    }
    colors.needsUpdate = true;
    return;
  }

  for (let i = 0; i < originalColors.length / 3; i++) {
    const r = originalColors[i * 3 + 0];
    const g = originalColors[i * 3 + 1];
    const b = originalColors[i * 3 + 2];

    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    // Apply hue shift
    h = (h + hueShift / 360) % 1;
    if (h < 0) h += 1;

    // Apply saturation
    s = Math.min(1, Math.max(0, s * saturation));

    // Convert HSL back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let newR, newG, newB;

    if (s === 0) {
      newR = newG = newB = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      newR = hue2rgb(p, q, h + 1 / 3);
      newG = hue2rgb(p, q, h);
      newB = hue2rgb(p, q, h - 1 / 3);
    }

    colors.setXYZ(i, newR, newG, newB);
  }

  colors.needsUpdate = true;
}
