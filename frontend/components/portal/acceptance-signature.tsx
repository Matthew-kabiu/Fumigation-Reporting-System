"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "@/components/jobs/workflows.module.css";

export function AcceptanceSignature({ onChange }: { onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const context = canvasRef.current?.getContext("2d"); if (!context) return; context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = 3; context.strokeStyle = "#171a16"; }, []);
  function finish(event: React.PointerEvent<HTMLCanvasElement>) { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; event.currentTarget.releasePointerCapture(event.pointerId); onChange(event.currentTarget.toDataURL("image/png")); }
  function clear() { const canvas = canvasRef.current; if (!canvas) return; canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); onChange(""); }
  return <div className={styles.field}><div className={styles.toolbar}><span>Acceptance signature</span><button className="button button-secondary" type="button" onClick={clear}><Eraser aria-hidden="true" size={15} /> Clear</button></div><canvas ref={canvasRef} className={styles.signature} width={720} height={200} aria-label="Draw acceptance signature" onPointerDown={start} onPointerMove={draw} onPointerUp={finish} onPointerCancel={finish} /></div>;
}

// Pure helper: hoisted so it is not rebuilt on every render.
function point(event: React.PointerEvent<HTMLCanvasElement>) { const bounds = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * (event.currentTarget.width / bounds.width), y: (event.clientY - bounds.top) * (event.currentTarget.height / bounds.height) }; }

function start(event: React.PointerEvent<HTMLCanvasElement>) { event.currentTarget.setPointerCapture(event.pointerId); const next = point(event); const context = event.currentTarget.getContext("2d"); context?.beginPath(); context?.moveTo(next.x, next.y); }

function draw(event: React.PointerEvent<HTMLCanvasElement>) { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const next = point(event); const context = event.currentTarget.getContext("2d"); context?.lineTo(next.x, next.y); context?.stroke(); }
