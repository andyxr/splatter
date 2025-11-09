export interface SplatData {
  positions: Float32Array;
  colors: Float32Array;
  scales?: Float32Array;
  rotations?: Float32Array;
  count: number;
}

export async function loadPLY(file: File): Promise<SplatData> {
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8');

  // Read header
  let headerEndIndex = 0;
  const bytes = new Uint8Array(arrayBuffer);

  // Find end of header
  for (let i = 0; i < bytes.length - 10; i++) {
    const chunk = decoder.decode(bytes.slice(i, i + 10));
    if (chunk.includes('end_header')) {
      headerEndIndex = i + 10;
      // Skip to next newline
      while (bytes[headerEndIndex] !== 10 && headerEndIndex < bytes.length) {
        headerEndIndex++;
      }
      headerEndIndex++;
      break;
    }
  }

  const headerText = decoder.decode(bytes.slice(0, headerEndIndex));
  const lines = headerText.split('\n');

  // Parse header
  let vertexCount = 0;
  let isBinary = false;
  const properties: string[] = [];

  for (const line of lines) {
    if (line.startsWith('format binary')) {
      isBinary = true;
    }
    if (line.startsWith('element vertex')) {
      vertexCount = parseInt(line.split(' ')[2]);
    }
    if (line.startsWith('property')) {
      const parts = line.split(' ');
      properties.push(parts[parts.length - 1]);
    }
  }

  console.log(`Loading ${vertexCount} splats from PLY file`);
  console.log('Properties:', properties);

  // Determine property layout
  const hasX = properties.includes('x');
  const hasY = properties.includes('y');
  const hasZ = properties.includes('z');
  const hasRed = properties.includes('red');
  const hasGreen = properties.includes('green');
  const hasBlue = properties.includes('blue');

  if (!hasX || !hasY || !hasZ) {
    throw new Error('PLY file must contain x, y, z properties');
  }

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  if (isBinary) {
    // Binary format - read float data
    const dataView = new DataView(arrayBuffer, headerEndIndex);
    let offset = 0;

    // Calculate stride (number of properties per vertex)
    // Assuming all properties are float32 for simplicity
    const floatsPerVertex = properties.length;
    const bytesPerVertex = floatsPerVertex * 4;

    for (let i = 0; i < vertexCount; i++) {
      const vertexOffset = i * bytesPerVertex;

      // Read position (x, y, z)
      positions[i * 3 + 0] = dataView.getFloat32(vertexOffset + 0, true);
      positions[i * 3 + 1] = dataView.getFloat32(vertexOffset + 4, true);
      positions[i * 3 + 2] = dataView.getFloat32(vertexOffset + 8, true);

      // Read colors if available
      if (hasRed && hasGreen && hasBlue) {
        // Find indices of color properties
        const redIdx = properties.indexOf('red');
        const greenIdx = properties.indexOf('green');
        const blueIdx = properties.indexOf('blue');

        const r = dataView.getUint8(vertexOffset + redIdx * 4);
        const g = dataView.getUint8(vertexOffset + greenIdx * 4);
        const b = dataView.getUint8(vertexOffset + blueIdx * 4);

        colors[i * 3 + 0] = r / 255;
        colors[i * 3 + 1] = g / 255;
        colors[i * 3 + 2] = b / 255;
      } else {
        // Default white color
        colors[i * 3 + 0] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      }
    }
  } else {
    // ASCII format
    const dataLines = lines.slice(lines.indexOf('end_header') + 1).filter(l => l.trim());

    for (let i = 0; i < Math.min(vertexCount, dataLines.length); i++) {
      const values = dataLines[i].trim().split(/\s+/).map(parseFloat);

      if (values.length >= 3) {
        positions[i * 3 + 0] = values[0];
        positions[i * 3 + 1] = values[1];
        positions[i * 3 + 2] = values[2];

        // Colors (if available, typically indices 3, 4, 5)
        if (values.length >= 6) {
          colors[i * 3 + 0] = values[3] / 255;
          colors[i * 3 + 1] = values[4] / 255;
          colors[i * 3 + 2] = values[5] / 255;
        } else {
          colors[i * 3 + 0] = 1;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 1;
        }
      }
    }
  }

  return {
    positions,
    colors,
    count: vertexCount,
  };
}
