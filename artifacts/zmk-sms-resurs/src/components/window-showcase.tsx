import { useEffect, useRef, useState, type PointerEvent, type WheelEvent, type KeyboardEvent } from 'react';
import { Box, Minus, Plus, RotateCcw } from 'lucide-react';
import sokolLogo from '../sokol-logo.svg';
import { drawDepthScene } from './webgl-model-renderer';
import type { Camera } from './model-types';
import { buildWindowScene, type WindowScene } from './window-models';

const scenes: Array<{ id: WindowScene; eyebrow: string; title: string; description: string; camera: Camera }> = [
  { id: 'facade', eyebrow: '01 / Фасад', title: 'Окно в доме', description: 'Правая створка открывается внутрь, левая остаётся закрытой.', camera: { yaw: 0.15, pitch: 0.18, zoom: 1 } },
  { id: 'arched', eyebrow: '02 / Архитектура', title: 'Арочные окна', description: 'Нестандартная форма для входных групп, витрин и частных домов.', camera: { yaw: 0.2, pitch: 0.22, zoom: 0.96 } },
];

const clampZoom = (zoom: number) => Math.max(0.68, Math.min(1.8, zoom));

export function WindowShowcase() {
  const [activeScene, setActiveScene] = useState<WindowScene>('facade');
  const [isOpen, setIsOpen] = useState(false);
  const [camera, setCamera] = useState<Camera>(scenes[0].camera);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const selected = scenes.find((scene) => scene.id === activeScene) ?? scenes[0];

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
    drawDepthScene(canvas, stageSize.width, stageSize.height, buildWindowScene(activeScene, isOpen), camera);
  }, [activeScene, camera, isOpen, stageSize]);

  const selectScene = (scene: WindowScene) => {
    setActiveScene(scene);
    const next = scenes.find((item) => item.id === scene);
    if (next) setCamera(next.camera);
  };
  const zoomBy = (factor: number) => setCamera((current) => ({ ...current, zoom: clampZoom(current.zoom * factor) }));
  const resetCamera = () => setCamera(selected.camera);

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
    setCamera((current) => ({ ...current, yaw: current.yaw + deltaX * 0.009, pitch: Math.max(-1.15, Math.min(1.15, current.pitch + deltaY * 0.008)) }));
  };
  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.08 : 0.92);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      setCamera((current) => ({
        ...current,
        yaw: current.yaw + (event.key === 'ArrowLeft' ? -0.14 : event.key === 'ArrowRight' ? 0.14 : 0),
        pitch: Math.max(-1.15, Math.min(1.15, current.pitch + (event.key === 'ArrowUp' ? 0.12 : event.key === 'ArrowDown' ? -0.12 : 0))),
      }));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(1.08);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomBy(0.92);
    } else if (event.key === '0') {
      event.preventDefault();
      resetCamera();
    } else if (event.key === ' ' && activeScene === 'facade') {
      event.preventDefault();
      setIsOpen((open) => !open);
    }
  };

  return (
    <div className="window-showcase" data-testid="window-showcase">
      <div className="window-showcase__header">
        <div>
          <span className="eyebrow">Интерактивная витрина</span>
          <p className="window-showcase__instruction">Потяните модель для вращения · колёсико — масштаб</p>
        </div>
        <span className="window-showcase__counter" data-testid="text-window-scene-counter">{String(scenes.findIndex((scene) => scene.id === activeScene) + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
      </div>
      <div className={`window-showcase__stage${isDragging ? ' is-dragging' : ''}`} data-testid={`window-model-${activeScene}`}>
        <canvas
          ref={canvasRef}
          className="window-showcase__canvas"
          role="application"
          tabIndex={0}
          aria-label={`${selected.title}. ${selected.description}. Стрелки вращают модель, плюс и минус меняют масштаб, пробел ${activeScene === 'facade' ? 'открывает или закрывает створку' : 'не используется'}.`}
          data-testid="canvas-window-model"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { dragRef.current = null; setIsDragging(false); }}
          onPointerCancel={() => { dragRef.current = null; setIsDragging(false); }}
          onLostPointerCapture={() => { dragRef.current = null; setIsDragging(false); }}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        />
        <img className="window-showcase__watermark" src={sokolLogo} alt="" aria-hidden="true" />
        <div className="window-showcase__badge" aria-hidden="true"><Box size={13} /><strong>3D</strong><span>ДЕТАЛЬНЫЙ УЗЕЛ</span></div>
        <div className="window-showcase__model-label">
          <strong>{selected.eyebrow}</strong>
          <span>{selected.title}</span>
        </div>
        <div className="window-showcase__controls" role="group" aria-label="Управление моделью">
          <button type="button" onClick={() => zoomBy(0.9)} aria-label="Уменьшить масштаб" data-testid="button-window-zoom-out"><Minus size={14} /></button>
          <button type="button" onClick={resetCamera} aria-label="Сбросить ракурс" data-testid="button-window-reset"><RotateCcw size={13} /></button>
          <button type="button" onClick={() => zoomBy(1.1)} aria-label="Увеличить масштаб" data-testid="button-window-zoom-in"><Plus size={14} /></button>
        </div>
      </div>
      <div className="window-showcase__footer">
        <div className="window-showcase__tabs" role="tablist" aria-label="Варианты окон">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              className={`window-showcase__tab${activeScene === scene.id ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeScene === scene.id}
              data-testid={`button-window-scene-${scene.id}`}
              onClick={() => selectScene(scene.id)}
            >
              <span>{scene.eyebrow}</span>
              <strong>{scene.title}</strong>
            </button>
          ))}
        </div>
        <div className="window-showcase__action">
          {activeScene === 'facade' ? (
            <button className={`window-showcase__toggle${isOpen ? ' is-open' : ''}`} type="button" aria-pressed={isOpen} onClick={() => setIsOpen((open) => !open)} data-testid="button-window-toggle">
              <span className="window-showcase__toggle-dot" aria-hidden="true" />
              {isOpen ? 'Закрыть правую створку' : 'Открыть правую створку'}
            </button>
          ) : (
            <span className="window-showcase__hint">Вращайте модель, чтобы рассмотреть узел</span>
          )}
        </div>
      </div>
      <p className="window-showcase__description" data-testid="text-window-scene-description">{selected.description}</p>
    </div>
  );
}