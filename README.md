# Splatter

A web-based Gaussian splat manipulation and animation tool for creating weird and wonderful effects with PLY point cloud files.

## Features

- **PLY File Import**: Load Gaussian splat PLY files with position and color data
- **Real-time Manipulation**:
  - Noise-based displacement with adjustable intensity and scale
  - Vortex effect for swirling animations
  - Wave effect for oscillating patterns
  - Color manipulation (hue shift and saturation)
- **Interactive Camera**: Click and drag to rotate, scroll to zoom
- **Live Animation**: Animate effects in real-time with adjustable speed

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Load a PLY File**: Click "Load PLY File" and select a PLY file containing Gaussian splat data
2. **Adjust Parameters**: Use the control panel on the left to manipulate the point cloud:
   - **Displacement**: Add noise-based movement to splats
   - **Vortex**: Create swirling motion around the center
   - **Wave**: Add sinusoidal oscillations
   - **Color**: Shift hues and adjust saturation
3. **Animate**: Increase animation speed to see effects evolve over time
4. **Interact**: Click and drag to rotate the camera, scroll to zoom

## PLY File Format

The app supports PLY files with the following properties:
- `x`, `y`, `z` (required): Position data
- `red`, `green`, `blue` (optional): Color data (0-255)

Both ASCII and binary PLY formats are supported.

## Technical Details

Built with:
- **Three.js**: 3D rendering and scene management
- **TypeScript**: Type-safe code
- **Vite**: Fast development and optimized builds

## Ideas for Experimentation

- Apply multiple effects simultaneously for complex animations
- Try different noise scales to affect different frequency details
- Combine vortex and wave effects for chaotic motion
- Use hue shifting with animation for color cycling effects
- Load different PLY files to see how effects work on various geometries

## Future Enhancements

Potential additions:
- Audio reactivity
- Export animations as video/GIF
- Custom shader effects
- Particle physics simulation
- Multiple manipulation layers
- Keyframe animation timeline

## License

MIT
