"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef } from "react";

export function SignaturePad({ label, value, onChange }: { label: string; value: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = value;
    }
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#171a16";
  }, [value]);

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="signature-field">
      <div className="signature-heading"><span>{label}</span><button type="button" className="nav-action" onClick={clear}><Eraser size={15} /> Clear</button></div>
      <canvas ref={canvasRef} width={640} height={180} onPointerDown={start} onPointerMove={draw} onPointerUp={finish} onPointerCancel={finish} aria-label={`${label} drawing area`} />
    </div>
  );
}

// Pure helper: depends only on its event argument, so it lives at module scope
// instead of being rebuilt on every render.
function point(event: React.PointerEvent<HTMLCanvasElement>) {
  const canvas = event.currentTarget;
  const bounds = canvas.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
}

function start(event: React.PointerEvent<HTMLCanvasElement>) {
  event.currentTarget.setPointerCapture(event.pointerId);
  const context = event.currentTarget.getContext("2d");
  const next = point(event);
  context?.beginPath();
  context?.moveTo(next.x, next.y);
}

function draw(event: React.PointerEvent<HTMLCanvasElement>) {
  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
  const context = event.currentTarget.getContext("2d");
  const next = point(event);
  context?.lineTo(next.x, next.y);
  context?.stroke();
}
