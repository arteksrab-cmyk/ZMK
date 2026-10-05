import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { Box, Minus, Plus, RotateCcw } from 'lucide-react';
import fireproofingPhoto from '@assets/i_(1)_1791117335242.jpeg';
import { defaultRalColor, insulationOptions, panelTypeOptions, type InsulationType, type PanelType } from '@/data/panel-catalog';
import { drawDepthScene } from './webgl-model-renderer';
import type { Camera, Face, Point3 } from './model-types';

type Palette = [string, string, string, string, string, string];
type ModelKind = 'panel' | 'warehouse' | 'fireproofing';
type ModelContext = 'hero' | 'panel' | 'fire';

const steelPalette: Palette = [
  '#AEBCC6',
  '#50616D',
  '#8FA1AD',
  '#687985',
  '#72838E',
  '#D0D9DF',
];

const brightSteelPalette: Palette = [
  '#D4DEE4',
  '#5F707B',
  '#B5C2CA',
  '#657681',
  '#8696A0',
  '#E5EAED',
];

const woolPalette: Palette = [
  '#D9C17A',
  '#987C42',
  '#C8A957',
  '#B28E45',
  '#E7D495',
  '#B9954B',
];

const concretePalette: Palette = [
  '#AEB1AD',
  '#686D6E',
  '#929896',
  '#777D7D',
  '#818785',
  '#C0C3BF',
];

const fiberPalette: Palette = [
  '#F1DFA6',
  '#A8894C',
  '#E8D18B',
  '#C0A15B',
  '#F4E7BF',
  '#D5BB78',
];

const fireproofingPalette: Palette = [
  '#F1F0EA',
  '#D2D1C9',
  '#E9E8E1',
  '#DAD9D1',
  '#E0DFD7',
  '#FAF9F4',
];

const coatingGrainPalette = [
  '#F7F6F1',
  '#EEECE5',
  '#E4E2DA',
  '#D7D5CC',
  '#EDEBE4',
  '#DFDDD5',
] as const;

const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subtract = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const multiply = (a: Point3, value: number): Point3 => [a[0] * value, a[1] * value, a[2] * value];
const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function normalize(point: Point3): Point3 {
  const length = Math.hypot(point[0], point[1], point[2]) || 1;
  return [point[0] / length, point[1] / length, point[2] / length];
}

function addBox(faces: Face[], center: Point3, size: Point3, colors: Palette) {
  const [x, y, z] = center;
  const [sx, sy, sz] = size;
  const x0 = x - sx / 2;
  const x1 = x + sx / 2;
  const y0 = y - sy / 2;
  const y1 = y + sy / 2;
  const z0 = z - sz / 2;
  const z1 = z + sz / 2;
  const a: Point3 = [x0, y0, z0];
  const b: Point3 = [x1, y0, z0];
  const c: Point3 = [x1, y1, z0];
  const d: Point3 = [x0, y1, z0];
  const e: Point3 = [x0, y0, z1];
  const f: Point3 = [x1, y0, z1];
  const g: Point3 = [x1, y1, z1];
  const h: Point3 = [x0, y1, z1];
  const polygons: Point3[][] = [
    [d, c, g, h],
    [a, b, f, e],
    [e, f, g, h],
    [a, b, c, d],
    [a, d, h, e],
    [b, c, g, f],
  ];
  polygons.forEach((points, index) => faces.push({ points, fill: colors[index] }));
}

function shadeHex(hex: string, amount: number) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const target = amount > 0 ? 255 : 0;
  const strength = Math.abs(amount);
  const shaded = channels.map((channel) => Math.round(channel + (target - channel) * strength));
  return `#${shaded.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function createSteelPalette(color: string): Palette {
  return [
    shadeHex(color, 0.2),
    shadeHex(color, -0.38),
    shadeHex(color, -0.14),
    shadeHex(color, -0.47),
    shadeHex(color, -0.28),
    shadeHex(color, 0.32),
  ];
}

function addBeam(
  faces: Face[],
  start: Point3,
  end: Point3,
  width: number,
  depth: number,
  colors: Palette,
) {
  const axis = normalize(subtract(end, start));
  const reference: Point3 = Math.abs(axis[1]) > 0.93 ? [0, 0, 1] : [0, 1, 0];
  const u = normalize(cross(axis, reference));
  const v = normalize(cross(axis, u));
  const corner = (origin: Point3, uSign: number, vSign: number) =>
    add(add(origin, multiply(u, (width * uSign) / 2)), multiply(v, (depth * vSign) / 2));
  const points = [
    corner(start, -1, -1),
    corner(start, 1, -1),
    corner(start, 1, 1),
    corner(start, -1, 1),
    corner(end, -1, -1),
    corner(end, 1, -1),
    corner(end, 1, 1),
    corner(end, -1, 1),
  ];
  const polygons: Point3[][] = [
    [points[0], points[1], points[2], points[3]],
    [points[4], points[5], points[6], points[7]],
    [points[0], points[4], points[5], points[1]],
    [points[1], points[5], points[6], points[2]],
    [points[2], points[6], points[7], points[3]],
    [points[3], points[7], points[4], points[0]],
  ];
  polygons.forEach((polygon, index) => faces.push({ points: polygon, fill: colors[index] }));
}

function addLongitudinalRib(
  faces: Face[],
  xStart: number,
  xEnd: number,
  centerZ: number,
  bottomY: number,
  height: number,
  bottomWidth: number,
  topWidth: number,
  colors: Palette,
) {
  const z0 = centerZ - bottomWidth / 2;
  const z1 = centerZ - topWidth / 2;
  const z2 = centerZ + topWidth / 2;
  const z3 = centerZ + bottomWidth / 2;
  const a: Point3 = [xStart, bottomY, z0];
  const b: Point3 = [xStart, bottomY + height, z1];
  const c: Point3 = [xStart, bottomY + height, z2];
  const d: Point3 = [xStart, bottomY, z3];
  const e: Point3 = [xEnd, bottomY, z0];
  const f: Point3 = [xEnd, bottomY + height, z1];
  const g: Point3 = [xEnd, bottomY + height, z2];
  const h: Point3 = [xEnd, bottomY, z3];

  const facesToAdd: Point3[][] = [
    [a, b, c, d],
    [e, h, g, f],
    [a, e, f, b],
    [b, f, g, c],
    [c, g, h, d],
    [d, h, e, a],
  ];
  facesToAdd.forEach((points, index) => faces.push({ points, fill: colors[index] }));
}

const insulationPalettes: Record<InsulationType, Palette> = {
  'mineral-wool': woolPalette,
  polystyrene: ['#F3F1EA', '#B9B7AF', '#E6E4DC', '#C9C7BE', '#DAD8D0', '#FCFBF7'],
  'pur-pir': ['#F0E9D5', '#B6AD95', '#E5DCC4', '#C8BEA7', '#D7CEBA', '#FBF7EB'],
  xps: ['#E7EBD8', '#9EA78A', '#D8E0C5', '#B5BEA0', '#C9D1B6', '#F6F8EC'],
};

function buildPanelScene(panelType: PanelType, insulation: InsulationType, steelColor: string): Face[] {
  const faces: Face[] = [];
  const steel = createSteelPalette(steelColor);
  const brightSteel = steel.map((color) => shadeHex(color, 0.22)) as Palette;
  const filler = insulationPalettes[insulation];

  addBox(faces, [0, 0, 0], [6.4, 0.34, 2.7], filler);
  addBox(faces, [0, -0.215, 0], [6.45, 0.08, 2.76], steel);
  addBox(faces, [1.58, 0.215, 0], [3.25, 0.075, 2.76], steel);

  if (insulation === 'mineral-wool') {
    for (let index = 0; index < 11; index += 1) {
      const z = -1.12 + index * 0.22;
      addBeam(
        faces,
        [-2.85, 0.174, z],
        [-0.28, 0.174, z + 0.22],
        0.012,
        0.01,
        fiberPalette,
      );
    }
  } else if (insulation === 'polystyrene') {
    const beadPalette: Palette = ['#FAF9F4', '#D5D3CB', '#EFEEE8', '#DAD8D0', '#E8E6DE', '#FFFFFF'];
    for (let xIndex = 0; xIndex < 9; xIndex += 1) {
      for (let zIndex = 0; zIndex < 6; zIndex += 1) {
        addBox(
          faces,
          [-3.02 + xIndex * 0.31, 0.178, -1.12 + zIndex * 0.43],
          [0.075, 0.014, 0.075],
          beadPalette,
        );
      }
    }
  } else if (insulation === 'xps') {
    const groovePalette: Palette = ['#EFF2E4', '#C2C9AF', '#E1E6D4', '#C6CCB7', '#D7DDC7', '#F7F9EF'];
    for (let index = 0; index < 8; index += 1) {
      const z = -1.12 + index * 0.31;
      addBeam(faces, [-3.05, 0.174, z], [-0.12, 0.174, z + 0.08], 0.012, 0.01, groovePalette);
    }
  }

  const ribCount = panelType === 'roof' ? 5 : 9;
  const ribSpacing = panelType === 'roof' ? 0.52 : 0.31;
  const ribBottomWidth = panelType === 'roof' ? 0.23 : 0.16;
  const ribTopWidth = panelType === 'roof' ? 0.105 : 0.065;
  const ribHeight = panelType === 'roof' ? 0.13 : 0.065;
  const ribStart = -((ribCount - 1) * ribSpacing) / 2;

  for (let index = 0; index < ribCount; index += 1) {
    addLongitudinalRib(
      faces,
      -0.02,
      3.18,
      ribStart + index * ribSpacing,
      0.252,
      ribHeight,
      ribBottomWidth,
      ribTopWidth,
      brightSteel,
    );
  }

  return faces;
}

function buildWarehouseScene(): Face[] {
  const faces: Face[] = [];
  const framePositions = [-5, -3, -1, 1, 3, 5];
  const halfWidth = 3.25;
  const eavesHeight = 4.2;
  const ridgeHeight = 5.2;
  const roofHeightAt = (z: number) =>
    eavesHeight + ((halfWidth - Math.abs(z)) / halfWidth) * (ridgeHeight - eavesHeight);

  for (const x of framePositions) {
    for (const z of [-halfWidth, halfWidth]) {
      addBox(faces, [x, -0.18, z], [0.92, 0.36, 0.92], concretePalette);
      addBox(faces, [x, 0.24, z], [0.56, 0.48, 0.56], concretePalette);
      addBox(
        faces,
        [x, 0.51, z],
        [0.68, 0.08, 0.68],
        ['#E17A3D', '#88431E', '#C75E2D', '#9D4B22', '#A95023', '#EF975A'],
      );
      addBeam(faces, [x, 0.55, z], [x, eavesHeight, z], 0.24, 0.34, steelPalette);
    }

    addBeam(faces, [x, eavesHeight, -halfWidth], [x, ridgeHeight, 0], 0.2, 0.32, steelPalette);
    addBeam(faces, [x, ridgeHeight, 0], [x, eavesHeight, halfWidth], 0.2, 0.32, steelPalette);
    addBeam(
      faces,
      [x, eavesHeight - 0.14, -halfWidth],
      [x, eavesHeight - 0.14, halfWidth],
      0.14,
      0.18,
      steelPalette,
    );
  }

  const roofLines = [-3.25, -2.2, -1.1, 0, 1.1, 2.2, 3.25];
  for (const z of roofLines) {
    addBeam(
      faces,
      [-5.16, roofHeightAt(z), z],
      [5.16, roofHeightAt(z), z],
      0.12,
      0.16,
      brightSteelPalette,
    );
  }

  for (const z of [-halfWidth, halfWidth]) {
    for (const y of [1.25, 2.55, 3.65]) {
      addBeam(faces, [-5.08, y, z], [5.08, y, z], 0.12, 0.16, steelPalette);
    }
  }

  for (const z of [-halfWidth, halfWidth]) {
    for (const [x1, x2] of [
      [framePositions[0], framePositions[1]],
      [framePositions[4], framePositions[5]],
    ]) {
      addBeam(faces, [x1, 0.82, z], [x2, 3.82, z], 0.075, 0.085, brightSteelPalette);
      addBeam(faces, [x1, 3.82, z], [x2, 0.82, z], 0.075, 0.085, brightSteelPalette);
    }
  }

  for (const [x1, x2] of [
    [framePositions[0], framePositions[1]],
    [framePositions[4], framePositions[5]],
  ]) {
    for (const [z1, z2] of [
      [-halfWidth, 0],
      [0, halfWidth],
    ]) {
      addBeam(
        faces,
        [x1, roofHeightAt(z1), z1],
        [x2, roofHeightAt(z2), z2],
        0.07,
        0.075,
        brightSteelPalette,
      );
      addBeam(
        faces,
        [x1, roofHeightAt(z2), z2],
        [x2, roofHeightAt(z1), z1],
        0.07,
        0.075,
        brightSteelPalette,
      );
    }
  }

  return faces;
}

function addCoatedBeam(
  faces: Face[],
  start: Point3,
  end: Point3,
  width: number,
  depth: number,
  seed: number,
) {
  const delta = subtract(end, start);
  const length = Math.hypot(delta[0], delta[1], delta[2]);
  const axis = normalize(delta);
  const reference: Point3 = Math.abs(axis[1]) > 0.93 ? [0, 0, 1] : [0, 1, 0];
  const across = normalize(cross(axis, reference));
  const thickness = normalize(cross(axis, across));
  const outerWidth = width + 0.15;
  const outerDepth = depth + 0.15;
  const halfWidth = outerWidth / 2;
  const halfDepth = outerDepth / 2;
  const corner = Math.min(halfWidth, halfDepth) * 0.42;
  const random = (index: number) => {
    const value = Math.sin((seed + index * 17.31) * 127.1) * 43758.5453;
    return value - Math.floor(value);
  };
  const profile: Array<[number, number]> = [];
  const roundedCorners: Array<[number, number, number]> = [
    [halfWidth - corner, -halfDepth + corner, -Math.PI / 2],
    [halfWidth - corner, halfDepth - corner, 0],
    [-halfWidth + corner, halfDepth - corner, Math.PI / 2],
    [-halfWidth + corner, -halfDepth + corner, Math.PI],
  ];
  roundedCorners.forEach(([centerU, centerV, startAngle]) => {
    for (let step = 0; step < 3; step += 1) {
      const angle = startAngle + (step / 2) * (Math.PI / 2);
      profile.push([
        centerU + Math.cos(angle) * corner,
        centerV + Math.sin(angle) * corner,
      ]);
    }
  });
  const segments = Math.max(12, Math.ceil(length * 5));
  const sections = Array.from({ length: segments + 1 }, (_, segment) => {
    const t = segment / segments;
    const center = add(start, multiply(delta, t));
    const endSoftening = segment === 0 || segment === segments ? 0.97 : 1;
    return profile.map(([u, v], pointIndex) => {
      const unevenness = (random(segment * 31 + pointIndex * 7) - 0.5) * 0.05;
      const scale = endSoftening + unevenness;
      return add(add(center, multiply(across, u * scale)), multiply(thickness, v * scale));
    });
  });

  const faceColors = profile.map((_, pointIndex) => {
    const paletteIndex = Math.floor((pointIndex / profile.length) * fireproofingPalette.length);
    return fireproofingPalette[paletteIndex];
  });
  sections.slice(0, -1).forEach((section, sectionIndex) => {
    const nextSection = sections[sectionIndex + 1];
    section.forEach((point, pointIndex) => {
      const nextPoint = (pointIndex + 1) % section.length;
      faces.push({
        points: [
          point,
          section[nextPoint],
          nextSection[nextPoint],
          nextSection[pointIndex],
        ],
        fill: faceColors[pointIndex],
        texture: 'sprayed',
      });
    });
  });
  faces.push({ points: sections[0].slice().reverse(), fill: fireproofingPalette[1], texture: 'sprayed' });
  faces.push({ points: sections[segments], fill: fireproofingPalette[5], texture: 'sprayed' });

  const grainsPerSide = Math.max(24, Math.ceil(length * 12));
  for (let sideIndex = 0; sideIndex < 4; sideIndex += 1) {
    const side = sideIndex % 2 === 0 ? -1 : 1;
    const acrossAxis = sideIndex < 2 ? thickness : across;
    const outward = sideIndex < 2 ? multiply(across, side) : multiply(thickness, side);
    const surfaceCenter =
      sideIndex < 2
        ? multiply(across, side * halfWidth)
        : multiply(thickness, side * halfDepth);
    const acrossLimit =
      sideIndex < 2
        ? halfDepth - corner * 1.25
        : halfWidth - corner * 1.25;

    for (let grainIndex = 0; grainIndex < grainsPerSide; grainIndex += 1) {
      const randomBase = 1000 + sideIndex * 10000 + grainIndex * 13;
      const t = 0.025 + random(randomBase) * 0.95;
      const center = add(
        add(start, multiply(delta, t)),
        add(surfaceCenter, multiply(acrossAxis, (random(randomBase + 1) * 2 - 1) * acrossLimit)),
      );
      const lengthRadius = 0.04 + random(randomBase + 2) * 0.04;
      const acrossRadius = 0.035 + random(randomBase + 3) * 0.035;
      const peak = add(
        add(center, multiply(outward, 0.025 + random(randomBase + 4) * 0.024)),
        add(
          multiply(axis, (random(randomBase + 5) - 0.5) * lengthRadius * 0.3),
          multiply(acrossAxis, (random(randomBase + 6) - 0.5) * acrossRadius * 0.3),
        ),
      );
      const grainSides = 6;
      const ring = Array.from({ length: grainSides }, (_, pointIndex) => {
        const angle = (pointIndex / grainSides) * Math.PI * 2;
        const unevenness = 0.72 + random(randomBase + 20 + pointIndex) * 0.52;
        const basePoint = add(
          add(
            center,
            multiply(axis, Math.cos(angle) * lengthRadius * unevenness),
          ),
          add(
            multiply(acrossAxis, Math.sin(angle) * acrossRadius * unevenness),
            multiply(outward, 0.002),
          ),
        );
        return basePoint;
      });
      const fill = coatingGrainPalette[
        Math.floor(random(randomBase + 12) * coatingGrainPalette.length)
      ];
      ring.forEach((point, pointIndex) => {
        faces.push({
          points: [point, ring[(pointIndex + 1) % ring.length], peak],
          fill,
          texture: 'sprayed',
        });
      });
    }
  }
}

function buildFireproofingScene(): Face[] {
  const faces: Face[] = [];

  addCoatedBeam(faces, [0, -2.55, 0], [0, 2.85, 0], 0.86, 0.8, 7);
  addCoatedBeam(faces, [-3.1, 1.22, 0], [3.1, 1.22, 0], 0.82, 0.78, 19);
  addCoatedBeam(faces, [0, 1.22, -2.75], [0, 1.22, 2.75], 0.8, 0.78, 31);
  addCoatedBeam(faces, [0, 0.68, 0], [0, 1.76, 0], 0.95, 0.92, 43);

  return faces;
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

function drawScene(canvas: HTMLCanvasElement, width: number, height: number, faces: Face[], camera: Camera) {
  const context = canvas.getContext('2d');
  if (!context || width <= 0 || height <= 0) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  context.strokeStyle = 'rgba(190, 204, 211, 0.09)';
  context.lineWidth = 1;
  const gridStep = 38;
  for (let x = 0; x < width; x += gridStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += gridStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  const rotatedFaces = faces.map((face) => {
    const rotated = face.points.map((point) => rotatePoint(point, camera.yaw, camera.pitch));
    const perspective = rotated.map((point) => {
      const factor = 18 / (18 - point.z);
      return { x: point.x * factor, y: point.y * factor, z: point.z };
    });
    return {
      fill: face.fill,
      stroke: face.stroke ?? 'rgba(12, 23, 31, 0.48)',
      depth: perspective.reduce((sum, point) => sum + point.z, 0) / perspective.length,
      points: perspective,
    };
  });

  const allPoints = rotatedFaces.flatMap((face) => face.points);
  const minX = Math.min(...allPoints.map((point) => point.x));
  const maxX = Math.max(...allPoints.map((point) => point.x));
  const minY = Math.min(...allPoints.map((point) => point.y));
  const maxY = Math.max(...allPoints.map((point) => point.y));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((width * 0.76) / spanX, (height * 0.72) / spanY) * camera.zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  context.fillStyle = 'rgba(0, 0, 0, 0.2)';
  context.beginPath();
  context.ellipse(width / 2, height * 0.78, width * 0.28, Math.max(9, height * 0.045), 0, 0, Math.PI * 2);
  context.fill();

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
    context.strokeStyle = face.stroke;
    context.lineWidth = 0.8;
    context.stroke();
  }
}

const modelSettings: Record<
  ModelKind,
  { title: string; instruction: string; initialCamera: Camera; build: () => Face[] }
> = {
  panel: {
    title: 'Сэндвич-панель в разрезе',
    instruction: 'Стальная облицовка · минеральная вата · стальная облицовка',
    initialCamera: { yaw: -0.52, pitch: 0.56, zoom: 1 },
    build: () => buildPanelScene('wall', 'mineral-wool', defaultRalColor.hex),
  },
  warehouse: {
    title: 'Открытый каркас склада на фундаменте',
    instruction: 'Каркас и связи · фундамент · без панелей',
    initialCamera: { yaw: 0.68, pitch: 0.38, zoom: 1 },
    build: buildWarehouseScene,
  },
  fireproofing: {
    title: 'Стальной узел с огнезащитным покрытием',
    instruction: 'Напыляемое огнезащитное покрытие · вращайте и увеличивайте модель',
    initialCamera: { yaw: 0.62, pitch: 0.24, zoom: 1 },
    build: buildFireproofingScene,
  },
};

const clampZoom = (zoom: number) => Math.max(0.68, Math.min(1.8, zoom));

export function Interactive3DModel({
  kind,
  context,
  panelType = 'wall',
  insulation = 'mineral-wool',
  steelColor = defaultRalColor.hex,
  ralCode = defaultRalColor.code,
}: {
  kind: ModelKind;
  context: ModelContext;
  panelType?: PanelType;
  insulation?: InsulationType;
  steelColor?: string;
  ralCode?: string;
}) {
  const settings = modelSettings[kind];
  const panelTypeTitle = panelTypeOptions.find((option) => option.id === panelType)!.label;
  const insulationTitle = insulationOptions.find((option) => option.id === insulation)!.label;
  const title = kind === 'panel' ? panelTypeTitle : settings.title;
  const instruction =
    kind === 'panel'
      ? `${insulationTitle} · наружный металл ${ralCode}`
      : settings.instruction;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [camera, setCamera] = useState<Camera>(settings.initialCamera);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const stage = canvasRef.current?.parentElement;
    if (!stage) return;

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stageSize.width === 0 || stageSize.height === 0) return;
    const faces =
      kind === 'panel'
        ? buildPanelScene(panelType, insulation, steelColor)
        : settings.build();
    drawDepthScene(canvas, stageSize.width, stageSize.height, faces, camera);
  }, [camera, insulation, kind, panelType, settings, stageSize, steelColor]);

  const resetCamera = () => setCamera(settings.initialCamera);
  const zoomBy = (factor: number) =>
    setCamera((current) => ({ ...current, zoom: clampZoom(current.zoom * factor) }));

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setCamera((current) => ({
      ...current,
      yaw: current.yaw + deltaX * 0.009,
      pitch: Math.max(-1.15, Math.min(1.15, current.pitch + deltaY * 0.008)),
    }));
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.08 : 0.92);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const increments: Record<string, Partial<Camera>> = {
      ArrowLeft: { yaw: camera.yaw - 0.14 },
      ArrowRight: { yaw: camera.yaw + 0.14 },
      ArrowUp: { pitch: Math.min(1.15, camera.pitch + 0.12) },
      ArrowDown: { pitch: Math.max(-1.15, camera.pitch - 0.12) },
    };
    const update = increments[event.key];
    if (update) {
      event.preventDefault();
      setCamera((current) => ({ ...current, ...update }));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(1.08);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomBy(0.92);
    } else if (event.key === '0') {
      event.preventDefault();
      resetCamera();
    }
  };

  const releasePointer = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div
      className={`interactive-3d-model interactive-3d-model--${context}${isDragging ? ' is-dragging' : ''}`}
      role="group"
      aria-label={`${title}. ${instruction}`}
    >
      {context === 'fire' && (
        <div className="interactive-3d-model__fire" aria-hidden="true">
          <img className="interactive-3d-model__fire-photo" src={fireproofingPhoto} alt="" />
          <span className="interactive-3d-model__fire-glow" />
          <span className="interactive-3d-model__flame-bed">
            {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
          </span>
          <span className="interactive-3d-model__embers">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="interactive-3d-model__canvas"
        role="application"
        tabIndex={0}
        aria-label={`${title}. ${instruction}. Перетаскивайте для вращения; колесо мыши, плюс и минус меняют масштаб; стрелки клавиатуры поворачивают модель; 0 сбрасывает ракурс.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onLostPointerCapture={releasePointer}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      />

      <div className="interactive-3d-model__badge" aria-hidden="true">
        <Box size={13} strokeWidth={2.2} />
        <strong>3D</strong>
        <span>ПОТЯНИТЕ ДЛЯ ВРАЩЕНИЯ</span>
      </div>

      {(context === 'panel' || context === 'fire') && (
        <div className="interactive-3d-model__note" aria-hidden="true">
          {context === 'fire' ? 'НАПЫЛЯЕМОЕ ОГНЕЗАЩИТНОЕ ПОКРЫТИЕ' : settings.instruction}
        </div>
      )}

      <div className="interactive-3d-model__controls" role="group" aria-label="Управление моделью">
        <button type="button" onClick={() => zoomBy(0.9)} aria-label="Уменьшить масштаб" title="Уменьшить">
          <Minus size={14} />
        </button>
        <button type="button" onClick={resetCamera} aria-label="Сбросить ракурс" title="Сбросить ракурс">
          <RotateCcw size={13} />
        </button>
        <button type="button" onClick={() => zoomBy(1.1)} aria-label="Увеличить масштаб" title="Увеличить">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}