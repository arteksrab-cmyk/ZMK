import type { Camera, Face, Point3 } from './model-types';

type Renderer = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  positionLocation: number;
  colorLocation: number;
};

const renderers = new WeakMap<HTMLCanvasElement, Renderer>();
const unsupportedCanvases = new WeakSet<HTMLCanvasElement>();

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create the 3D model shader.');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const details = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Could not compile the 3D model shader: ${details || 'unknown error'}`);
  }

  return shader;
}

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true });
  if (!gl) return null;

  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec4 aClipPosition;
      attribute vec3 aColor;
      varying vec3 vColor;

      void main() {
        gl_Position = aClipPosition;
        vColor = aColor;
      }
    `,
  );
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      varying vec3 vColor;

      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
  );
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create the 3D model program.');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const details = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Could not link the 3D model program: ${details || 'unknown error'}`);
  }

  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Could not create the 3D model buffer.');

  const renderer: Renderer = {
    gl,
    program,
    buffer,
    positionLocation: gl.getAttribLocation(program, 'aClipPosition'),
    colorLocation: gl.getAttribLocation(program, 'aColor'),
  };

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.disable(gl.CULL_FACE);

  renderers.set(canvas, renderer);
  return renderer;
}

function rotatePoint(point: Point3, yaw: number, pitch: number) {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const x = point[0] * cosYaw + point[2] * sinYaw;
  const z = -point[0] * sinYaw + point[2] * cosYaw;

  return {
    x,
    y: point[1] * cosPitch - z * sinPitch,
    z: point[1] * sinPitch + z * cosPitch,
  };
}

function parseHexColor(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function drawPainterFallback(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  faces: Face[],
  camera: Camera,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const rotatedFaces = faces.map((face) => {
    const points = face.points.map((point) => {
      const rotated = rotatePoint(point, camera.yaw, camera.pitch);
      const factor = 18 / (18 - rotated.z);
      return { x: rotated.x * factor, y: rotated.y * factor, z: rotated.z };
    });
    return {
      ...face,
      points,
      depth: points.reduce((sum, point) => sum + point.z, 0) / points.length,
    };
  });
  const allPoints = rotatedFaces.flatMap((face) => face.points);
  const minX = Math.min(...allPoints.map((point) => point.x));
  const maxX = Math.max(...allPoints.map((point) => point.x));
  const minY = Math.min(...allPoints.map((point) => point.y));
  const maxY = Math.max(...allPoints.map((point) => point.y));
  const scale = Math.min((width * 0.76) / Math.max(maxX - minX, 1), (height * 0.72) / Math.max(maxY - minY, 1)) * camera.zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  rotatedFaces.sort((a, b) => a.depth - b.depth);
  for (const face of rotatedFaces) {
    context.beginPath();
    face.points.forEach((point, index) => {
      const x = width / 2 + (point.x - centerX) * scale;
      const y = height * 0.53 - (point.y - centerY) * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = face.fill;
    context.fill();
    context.strokeStyle = face.stroke ?? 'rgba(12, 23, 31, 0.4)';
    context.lineWidth = 0.7;
    context.stroke();
  }
}

export function drawDepthScene(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  faces: Face[],
  camera: Camera,
) {
  if (width <= 0 || height <= 0 || faces.length === 0) return;

  let renderer = renderers.get(canvas);
  if (!renderer && !unsupportedCanvases.has(canvas)) {
    renderer = createRenderer(canvas) ?? undefined;
    if (!renderer) unsupportedCanvases.add(canvas);
  }

  if (!renderer) {
    drawPainterFallback(canvas, width, height, faces, camera);
    return;
  }

  const { gl } = renderer;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== targetWidth) canvas.width = targetWidth;
  if (canvas.height !== targetHeight) canvas.height = targetHeight;

  gl.viewport(0, 0, targetWidth, targetHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const rotatedFaces = faces.map((face) => ({
    face,
    points: face.points.map((point) => rotatePoint(point, camera.yaw, camera.pitch)),
  }));
  const allPoints = rotatedFaces.flatMap((entry) => entry.points);
  const projected = allPoints.map((point) => {
    const factor = 18 / (18 - point.z);
    return { x: point.x * factor, y: point.y * factor };
  });
  const minX = Math.min(...projected.map((point) => point.x));
  const maxX = Math.max(...projected.map((point) => point.x));
  const minY = Math.min(...projected.map((point) => point.y));
  const maxY = Math.max(...projected.map((point) => point.y));
  const scale =
    Math.min((width * 0.76) / Math.max(maxX - minX, 1), (height * 0.72) / Math.max(maxY - minY, 1)) *
    camera.zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const near = 2;
  const far = 50;
  const depthScale = (far + near) / (far - near);
  const depthOffset = (-2 * far * near) / (far - near);
  const vertices: number[] = [];

  for (const { face, points } of rotatedFaces) {
    const color = parseHexColor(face.fill);
    for (let triangle = 1; triangle < points.length - 1; triangle += 1) {
      for (const point of [points[0], points[triangle], points[triangle + 1]]) {
        const distance = 18 - point.z;
        const projectedX = (point.x * 18) / distance;
        const projectedY = (point.y * 18) / distance;
        const normalizedX = ((projectedX - centerX) * scale * 2) / width;
        const normalizedY = -0.06 + ((projectedY - centerY) * scale * 2) / height;
        const clipZ = depthScale * distance + depthOffset;
        vertices.push(
          normalizedX * distance,
          normalizedY * distance,
          clipZ,
          distance,
          color[0],
          color[1],
          color[2],
        );
      }
    }
  }

  gl.useProgram(renderer.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
  gl.enableVertexAttribArray(renderer.positionLocation);
  gl.vertexAttribPointer(renderer.positionLocation, 4, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(renderer.colorLocation);
  gl.vertexAttribPointer(renderer.colorLocation, 3, gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 7);
}