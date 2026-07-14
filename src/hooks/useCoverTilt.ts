import { useState, useRef } from "react";

export interface CoverTiltState {
  tilt: { x: number; y: number };
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
  };
}

/** 3D parallax tilt hook for cover images. */
export function useCoverTilt(intensity: number = 15): CoverTiltState {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const rafRef = useRef(0);

  const onMouseMove = (e: React.MouseEvent) => {
    if (rafRef.current) return;
    const target = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;
    rafRef.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: y * -intensity, y: x * intensity });
      rafRef.current = 0;
    });
  };

  const onMouseLeave = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setTilt({ x: 0, y: 0 });
  };

  return { tilt, handlers: { onMouseMove, onMouseLeave } };
}
