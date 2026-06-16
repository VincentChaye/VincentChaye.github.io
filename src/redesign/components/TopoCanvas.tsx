import { useEffect, useRef, useState } from 'react';
import type { TopoPoint } from '@/types';
import { css } from '../lib/css';
import { TOPO_COLORS } from '../lib/topo';

/**
 * Photo de voie + overlay SVG du topo : deux polylines (mains / pieds) dont les
 * sommets sont des prises posées au tap. Coordonnées normalisées 0..1 relatives
 * à l'image affichée — converties en px à l'affichage (ResizeObserver) pour
 * garder des rayons de cercle constants quelle que soit la taille rendue.
 *
 * Mode `zoomable` (plein écran) : pinch à deux doigts, molette et glisser pour
 * naviguer dans l'image. Un tap (sans déplacement) pose toujours une prise en
 * édition — la distinction tap/pan se fait au seuil TAP_SLOP. Le transform CSS
 * s'applique à l'ensemble image+SVG, donc les coordonnées normalisées restent
 * valides ; rayons et épaisseurs sont divisés par le scale pour garder une
 * taille apparente constante à l'écran.
 */

const POINT_RADIUS = 7;
const HIT_RADIUS = 14;
const MIN_SCALE = 1;
const MAX_SCALE = 6;
const TAP_SLOP = 8;

interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

export interface TopoCanvasProps {
  imageUrl: string;
  points: TopoPoint[];
  editable: boolean;
  onAddPoint?: (x: number, y: number) => void;
  onRemovePoint?: (point: TopoPoint) => void;
  /** Active pinch/molette/pan (utilisé en plein écran). */
  zoomable?: boolean;
  /** Contraint la hauteur de l'image (plein écran) ; sinon width:100%. */
  imgMaxHeight?: string;
}

function clampView(scale: number, tx: number, ty: number, w: number, h: number): ViewState {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  return {
    scale: s,
    tx: Math.min(0, Math.max(w * (1 - s), tx)),
    ty: Math.min(0, Math.max(h * (1 - s), ty)),
  };
}

export function TopoCanvas({ imageUrl, points, editable, onAddPoint, onRemovePoint, zoomable = false, imgMaxHeight }: TopoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const [view, setView] = useState<ViewState>({ scale: 1, tx: 0, ty: 0 });

  /* Pointeurs actifs + état du geste en cours (pan ou pinch) */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{
    moved: boolean;
    start: { x: number; y: number };
    view: ViewState;
    pinch?: { dist: number; mid: { x: number; y: number } };
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Molette = zoom centré sur le curseur. Listener natif non-passif pour pouvoir preventDefault. */
  useEffect(() => {
    if (!zoomable) return;
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0022);
      setView((v) => {
        const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        const r = s / v.scale;
        return clampView(s, px - (px - v.tx) * r, py - (py - v.ty) * r, sizeRef.current.w, sizeRef.current.h);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomable]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable && !zoomable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      gestureRef.current = { moved: false, start: { x: e.clientX, y: e.clientY }, view };
    } else if (pointersRef.current.size === 2 && zoomable) {
      const [a, b] = [...pointersRef.current.values()];
      gestureRef.current = {
        moved: true,
        start: { x: e.clientX, y: e.clientY },
        view,
        pinch: { dist: Math.hypot(b.x - a.x, b.y - a.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } },
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    const el = containerRef.current;
    if (!g || !el) return;

    if (pointersRef.current.size === 2 && g.pinch) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (g.pinch.dist === 0) return;
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.view.scale * (dist / g.pinch.dist)));
      const r = s / g.view.scale;
      const rect = el.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - rect.left;
      const my = (a.y + b.y) / 2 - rect.top;
      const bmx = g.pinch.mid.x - rect.left;
      const bmy = g.pinch.mid.y - rect.top;
      setView(clampView(s, mx - (bmx - g.view.tx) * r, my - (bmy - g.view.ty) * r, sizeRef.current.w, sizeRef.current.h));
    } else if (pointersRef.current.size === 1) {
      const dx = e.clientX - g.start.x;
      const dy = e.clientY - g.start.y;
      if (!g.moved && Math.hypot(dx, dy) > TAP_SLOP) g.moved = true;
      if (g.moved && zoomable) {
        setView(clampView(g.view.scale, g.view.tx + dx, g.view.ty + dy, sizeRef.current.w, sizeRef.current.h));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.delete(e.pointerId)) return;
    const g = gestureRef.current;
    if (pointersRef.current.size === 0) {
      if (g && !g.moved && !g.pinch && e.type !== 'pointercancel' && editable && onAddPoint) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
          onAddPoint(x, y);
        }
      }
      gestureRef.current = null;
    } else if (pointersRef.current.size === 1) {
      // Fin de pinch : repart sur un pan à un doigt depuis la position restante
      const [p] = [...pointersRef.current.values()];
      gestureRef.current = { moved: true, start: { x: p.x, y: p.y }, view };
    }
  };

  const chain = (color: TopoPoint['color']) =>
    points.filter((p) => p.color === color).sort((a, b) => a.order - b.order);

  const k = view.scale; // facteur de compensation : taille apparente constante des tracés

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={css(
        `position:relative;line-height:0;overflow:hidden;` +
        `${imgMaxHeight ? 'max-width:100%' : 'width:100%'};` +
        `${editable || zoomable ? 'touch-action:none;' : ''}`
      )}
    >
      <div style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`, transformOrigin: '0 0' }}>
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          style={css(`${imgMaxHeight ? `max-width:100%;max-height:${imgMaxHeight};width:auto;height:auto` : 'width:100%'};display:block;user-select:none;-webkit-user-drag:none`)}
        />
        <svg
          ref={svgRef}
          style={css(`position:absolute;inset:0;width:100%;height:100%;${editable ? 'cursor:crosshair' : ''}`)}
        >
          {(['foot', 'hand'] as const).map((color) => {
            const pts = chain(color);
            const { stroke, fill } = TOPO_COLORS[color];
            return (
              <g key={color}>
                {pts.length >= 2 && (
                  <polyline
                    points={pts.map((p) => `${p.x * size.w},${p.y * size.h}`).join(' ')}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={3 / k}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                )}
                {pts.map((p) => (
                  <g key={`${color}-${p.order}`}>
                    {/* Zone de tap élargie pour la suppression en édition */}
                    {editable && (
                      <circle
                        cx={p.x * size.w}
                        cy={p.y * size.h}
                        r={HIT_RADIUS / k}
                        fill="transparent"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onRemovePoint?.(p);
                        }}
                      />
                    )}
                    <circle
                      cx={p.x * size.w}
                      cy={p.y * size.h}
                      r={POINT_RADIUS / k}
                      fill={fill}
                      stroke="rgba(10,8,4,.75)"
                      strokeWidth={2 / k}
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
