# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Splatter is a web-based Gaussian splat manipulation and animation tool built with TypeScript, Three.js, and Vite. It loads PLY point cloud files and applies real-time visual effects like displacement, vortex, waves, and color manipulation.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Application Structure

The application follows a single-page architecture with three main modules:

1. **`src/main.ts`** - Main application class (`SplatterApp`) that:
   - Initializes Three.js scene, camera, and renderer
   - Manages the animation loop and timing
   - Handles mouse controls for camera rotation (drag) and zoom (scroll)
   - Coordinates between UI controls and manipulation functions
   - Stores original point cloud data separately from manipulated data for real-time effects

2. **`src/ply-loader.ts`** - PLY file parser that:
   - Supports both ASCII and binary PLY formats
   - Parses header to determine vertex count and property layout
   - Extracts position (x, y, z) and color (red, green, blue) data
   - Returns normalized `SplatData` interface with Float32Arrays

3. **`src/manipulations.ts`** - Effect/manipulation functions:
   - **Displacement**: Custom 3D Perlin-like noise implementation for organic movement
   - **Vortex**: Cylindrical rotation effect around Y-axis
   - **Wave**: Sinusoidal height displacement based on XZ position
   - **Color manipulation**: RGB to HSL conversion for hue shift and saturation adjustment
   - All effects work by modifying BufferAttributes while preserving original data

### Data Flow

```
User loads PLY → Parser extracts data → Store as originalPositions/originalColors
                                       ↓
Animation loop → Apply effects to copies → Update BufferAttributes → Render
```

**Critical pattern**: Original data (`originalPositions`, `originalColors`) is never modified. On each frame, manipulations are applied from the original data to the current BufferAttributes. This allows effects to be adjusted or disabled without artifacts.

### UI Integration

The UI is defined in `index.html` with inline controls. Event listeners in `src/main.ts` connect range inputs and checkboxes to the `ManipulationParams` interface. The pattern is:
- User adjusts control → Event listener updates `params` → Next animation frame applies new params

## Key Technical Details

### Point Cloud Rendering

- Uses Three.js `Points` primitive with `PointsMaterial`
- Point size: 0.05 with size attenuation enabled
- Vertex colors enabled for per-point color data
- Auto-centering and scaling to fit in 3-unit bounding box

### Noise Implementation

The 3D noise function (`noise3D` in manipulations.ts) is a simplified Perlin-like implementation using:
- Integer hashing for pseudo-random values
- Trilinear interpolation between 8 cube corners
- Smoothstep function for gradients

### Camera Controls

- Spherical coordinate system for rotation
- Fixed distance from origin (modifiable via zoom)
- Vertical rotation clamped to ±90°
- Camera always looks at world origin (0, 0, 0)

## TypeScript Configuration

- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- No unused locals/parameters allowed
- Only `src/` directory is included

## Performance Considerations

- BufferAttribute updates trigger `needsUpdate = true` flag
- All manipulations run per-frame on CPU (no GPU shaders currently)
- Large point clouds (>100k points) may impact performance
- Color manipulation is skipped if hueShift=0 and saturation=1 (optimization)

## Extending the Application

### Adding New Effects

1. Add parameters to `ManipulationParams` interface in `manipulations.ts`
2. Create manipulation function following pattern:
   ```typescript
   function applyEffect(
     attribute: THREE.BufferAttribute,
     original: Float32Array,
     params: ManipulationParams
   ): void
   ```
3. Call from animation loop in `main.ts`
4. Add UI controls in `index.html` and wire up event listeners

### Supporting Additional PLY Properties

The PLY loader currently handles position and color. To add support for scales, rotations, or other properties:
1. Update `SplatData` interface
2. Add property detection in header parsing
3. Extract data in binary/ASCII sections
4. Modify rendering approach (may need custom shader for advanced Gaussian splat rendering)
