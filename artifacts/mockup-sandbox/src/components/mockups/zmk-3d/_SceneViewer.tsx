import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { RotateCcw } from "lucide-react";

type Point3 = [number, number, number];
type Face = { points: Point3[]; fill: string; stroke?: string };
type Palette = [string, string, string, string, string, string];
type ModelKind = "panel" | "warehouse";

type Camera = {
  yaw: number;
  pitch: number;
  zoom: number;
};

const steelPalette: Palette = [
  "#AEBCC6",
  "#50616D",
  "#8FA1AD",
  "#687985",
  "#72838E",
  "#D0D9DF",
];

const brightSteelPalette: Palette = [
  "#D4DEE4",
  "#5F707B",
  "#B5C2CA",
  "#657681",
  "#8696A0",
  "#E5EAED",
];

const woolPalette: Palette = [
  "#D9C17A",
  "#987C42",
  "#C8A957",
  "#B28E45",
  "#E7D495",
  "#B9954B",
];

const concretePalette: Palette = [
  "#AEB1AD",
  "#686D6E",
  "#929896",
  "#777D7D",
  "#818785",
  "#C0C3BF",
];

const fiberPalette: Palette = [
  "#F1DFA6",
  "#A8894C",
  "#E8D18B",
  "#C0A15B",
  "#F4E7BF",
  "#D5BB78",
];

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

function buildPanelScene(): Face[] {
  const faces: Face[] = [];

  // Mineral-wool core with a partly removed upper facing to expose the cutaway.
  addBox(faces, [0, 0, 0], [6.4, 0.34, 2.7], woolPalette);
  addBox(
    faces,
    [0, -0.215, 0],
    [6.45, 0.08, 2.76],
    ["#778995", "#33424D", "#657681", "#4C5D68", "#52636E", "#A7B5BE"],
  );
  addBox(faces, [1.58, 0.215, 0], [3.25, 0.075, 2.76], steelPalette);

  // Longitudinal ribs on the profiled metal facing.
  for (let index = 0; index < 9; index += 1) {
    const z = -1.2 + index * 0.3;
    addBox(faces, [1.58, 0.285, z], [3.22, 0.075, 0.105], brightSteelPalette);
  }

  // Fibrous marks across the exposed cut end and the uncovered core surface.
  for (let index = 0; index < 18; index += 1) {
    const z = -1.18 + ((index * 7) % 17) * 0.14;
    const y = -0.125 + (index % 5) * 0.052;
    addBeam(
      faces,
      [-3.205, y, z],
      [-3.205, y + 0.038, z + 0.095],
      0.018,
      0.012,
      fiberPalette,
    );
  }
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
        ["#E17A3D", "#88431E", "#C75E2D", "#9D4B22", "#A95023", "#EF975A"],
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

  // Roof purlins: the frame stays open, with no roof sheets or sandwich panels.
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

  // Side girts and eave rails.
  for (const z of [-halfWidth, halfWidth]) {
    for (const y of [1.25, 2.55, 3.65]) {
      addBeam(faces, [-5.08, y, z], [5.08, y, z], 0.12, 0.16, steelPalette);
    }
  }

  // Longitudinal X-bracing in the end bays.
  for (const z of [-halfWidth, halfWidth]) {
    for (const [x1, x2] of [
      [framePositions[0], framePositions[1]],
      [framePositions[4], framePositions[5]],
    ]) {
      addBeam(faces, [x1, 0.82, z], [x2, 3.82, z], 0.075, 0.085, brightSteelPalette);
      addBeam(faces, [x1, 3.82, z], [x2, 0.82, z], 0.075, 0.085, brightSteelPalette);
    }
  }

  // Roof-plane bracing in the first and last bays.
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

function drawScene(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  faces: Face[],
  camera: Camera,
) {
  const context = canvas.getContext("2d");
  if (!context || width <= 0 || height <= 0) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#172631");
  background.addColorStop(0.56, "#101c25");
  background.addColorStop(1, "#0b141c");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(179, 196, 207, 0.055)";
  context.lineWidth = 1;
  const gridStep = 42;
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
      stroke: face.stroke ?? "rgba(12, 23, 31, 0.48)",
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
  const scale = Math.min((width * 0.78) / spanX, (height * 0.68) / spanY) * camera.zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const screenY = height * 0.53;

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.23)";
  context.beginPath();
  context.ellipse(width / 2, height * 0.78, width * 0.27, 25, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  rotatedFaces.sort((a, b) => a.depth - b.depth);
  for (const face of rotatedFaces) {
    context.beginPath();
    face.points.forEach((point, index) => {
      const x = width / 2 + (point.x - centerX) * scale;
      const y = screenY - (point.y - centerY) * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = face.fill;
    context.fill();
    context.strokeStyle = face.stroke;
    context.lineWidth = 0.9;
    context.stroke();
  }
}

const modelSettings: Record<
  ModelKind,
  {
    title: string;
    subtitle: string;
    instruction: string;
    legend: { label: string; color: string }[];
    disclaimer: string;
    initialCamera: Camera;
    build: () => Face[];
  }
> = {
  panel: {
    title: "Сэндвич-панель в разрезе",
    subtitle: "Стальные облицовки и минераловатный сердечник",
    instruction: "Потяните модель, чтобы вращать. Колесо мыши — масштаб.",
    legend: [
      { label: "Стальная облицовка", color: "#AEBCC6" },
      { label: "Минеральная вата", color: "#D9C17A" },
    ],
    disclaimer: "Схематический образец, не рабочий чертёж.",
    initialCamera: { yaw: -0.52, pitch: 0.56, zoom: 1 },
    build: buildPanelScene,
  },
  warehouse: {
    title: "Каркас склада на фундаменте",
    subtitle: "Открытый стальной каркас — без стеновых и кровельных панелей",
    instruction: "Потяните модель, чтобы вращать. Колесо мыши — масштаб.",
    legend: [
      { label: "Металлокаркас", color: "#AEBCC6" },
      { label: "Фундамент", color: "#929896" },
    ],
    disclaimer: "Демонстрационная схема, не проект КМ/КМД.",
    initialCamera: { yaw: 0.68, pitch: 0.38, zoom: 1 },
    build: buildWarehouseScene,
  },
};

export function SceneViewer({ kind }: { kind: ModelKind }) {
  const settings = modelSettings[kind];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [camera, setCamera] = useState<Camera>(settings.initialCamera);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
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
    if (!canvas || stageSize.width === 0) return;
    drawScene(canvas, stageSize.width, stageSize.height, settings.build(), camera);
  }, [camera, settings, stageSize]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
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
    setCamera((current) => ({
      ...current,
      zoom: Math.max(0.68, Math.min(1.8, current.zoom * (event.deltaY < 0 ? 1.08 : 0.92))),
    }));
  };

  const resetCamera = () => setCamera(settings.initialCamera);

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "20px 22px 16px",
        background: "#111c26",
        color: "#f7f4ef",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <header
        style={{
          minHeight: 74,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              color: "#ef8a53",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            ЗМК · 3D-образец
          </div>
          <h1 style={{ margin: 0, fontSize: 21, lineHeight: 1.2, fontWeight: 700 }}>
            {settings.title}
          </h1>
          <p style={{ margin: "5px 0 0", color: "#aeb9c0", fontSize: 12 }}>
            {settings.subtitle}
          </p>
        </div>
        <button
          onClick={resetCamera}
          type="button"
          style={{
            flexShrink: 0,
            border: "1px solid rgba(247,244,239,.18)",
            borderRadius: 10,
            padding: "10px 12px",
            color: "#f7f4ef",
            background: "rgba(255,255,255,.05)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            font: "600 12px Inter, Arial, sans-serif",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={14} />
          Сбросить ракурс
        </button>
      </header>

      <section
        style={{
          position: "relative",
          height: 500,
          overflow: "hidden",
          borderRadius: 16,
          border: "1px solid rgba(213,224,231,.12)",
          background: "#101a22",
        }}
        aria-label={settings.title}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          onWheel={handleWheel}
          aria-label={`${settings.title}. Перетаскивайте для вращения, используйте колесо для изменения масштаба.`}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor: dragRef.current ? "grabbing" : "grab",
            touchAction: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            padding: "8px 10px",
            borderRadius: 999,
            background: "rgba(8,16,23,.76)",
            color: "#dce3e7",
            fontSize: 10,
            letterSpacing: ".04em",
            pointerEvents: "none",
          }}
        >
          ПОТЯНИТЕ ДЛЯ ВРАЩЕНИЯ
        </div>
      </section>

      <footer style={{ paddingTop: 13 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9 }}>
          {settings.legend.map((item) => (
            <span
              key={item.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 10px",
                border: "1px solid rgba(247,244,239,.12)",
                borderRadius: 999,
                color: "#d4dce1",
                fontSize: 11,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: item.color,
                  boxShadow: "0 0 0 1px rgba(255,255,255,.24) inset",
                }}
              />
              {item.label}
            </span>
          ))}
          <span style={{ color: "#aeb9c0", fontSize: 11, marginLeft: "auto" }}>
            {settings.instruction}
          </span>
        </div>
        <p style={{ margin: "10px 0 0", color: "#77858e", fontSize: 10 }}>
          {settings.disclaimer}
        </p>
      </footer>
    </main>
  );
}