import React, { useEffect, useRef } from 'react';
import { DeviceOrientation, WGS84Location, projectGpsPathWithElevationToCanvas } from '../utils/arProjection';

export interface ARPolylineCanvasProps {
  polyline: Array<[number, number, number?]>; // [lat, lng, elevation]
  userLocation: WGS84Location | null;
  orientation: DeviceOrientation;
  maxHorizonMeters?: number; // Horizon clipping distance (default 40m)
  isActive?: boolean; // If false (viewMode !== 'AR'), loop is stopped completely to save CPU/battery
  className?: string;
}

export const ARPolylineCanvas: React.FC<ARPolylineCanvasProps> = ({
  polyline,
  userLocation,
  orientation,
  maxHorizonMeters = 40,
  isActive = true,
  className = 'absolute inset-0 pointer-events-none z-10 w-full h-full',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dashOffsetRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // ResizeObserver to handle Zero Layout Shifts dynamically
  const dimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const displayWidth = container.clientWidth || window.innerWidth;
      const displayHeight = container.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      dimensionsRef.current = { width: displayWidth, height: displayHeight, dpr };

      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
          canvas.width = displayWidth * dpr;
          canvas.height = displayHeight * dpr;
        }
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 60 FPS Canvas Render Loop (Only active when isActive === true)
  useEffect(() => {
    if (!isActive) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      // Clear canvas when inactive
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animFrameIdRef.current = requestAnimationFrame(render);

      const { width: displayWidth, height: displayHeight, dpr } = dimensionsRef.current;
      if (displayWidth === 0 || displayHeight === 0) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Skip render if essential tracking data is missing
      if (!userLocation || orientation.alpha === null || polyline.length < 2) {
        ctx.restore();
        return;
      }

      // Smooth animated directional dash offset (flow towards destination)
      dashOffsetRef.current = (dashOffsetRef.current - 1.8) % 100;

      // 3D ENU to 2D Screen perspective path projection
      const projectedNodes = projectGpsPathWithElevationToCanvas(
        polyline,
        userLocation,
        orientation,
        displayWidth,
        displayHeight
      );

      // Draw projected path polyline segments
      for (let i = 0; i < projectedNodes.length - 1; i++) {
        const p1 = projectedNodes[i];
        const p2 = projectedNodes[i + 1];

        // Skip segments behind camera plane
        if (p1.zCam <= 0.1 && p2.zCam <= 0.1) continue;

        const avgDistance = (p1.distance + p2.distance) / 2;

        // Depth Scaling: adapt stroke thickness based on zCam distance
        const thickness = Math.max(2, Math.min(22, 22 - avgDistance * 0.38));

        // Horizon & Building Occlusion Clipping
        const isNearHorizon = avgDistance <= maxHorizonMeters;

        ctx.beginPath();
        ctx.moveTo(p1.pxX, p1.pxY);
        ctx.lineTo(p2.pxX, p2.pxY);

        if (isNearHorizon) {
          // Quadratic opacity falloff within 40m horizon
          const normDist = avgDistance / maxHorizonMeters;
          const opacity = Math.max(0.35, 1.0 - 0.55 * (normDist * normDist));

          // Ambient Glow Layer
          ctx.save();
          ctx.lineWidth = thickness + 4;
          ctx.strokeStyle = `rgba(0, 240, 255, ${opacity * 0.4})`;
          ctx.shadowColor = '#00F0FF';
          ctx.shadowBlur = 18;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();

          // Main Neon Path Gradient
          ctx.save();
          ctx.lineWidth = thickness;
          const gradient = ctx.createLinearGradient(p1.pxX, p1.pxY, p2.pxX, p2.pxY);
          gradient.addColorStop(0, `rgba(0, 240, 255, ${opacity})`);
          gradient.addColorStop(1, `rgba(59, 130, 246, ${opacity})`);
          ctx.strokeStyle = gradient;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();

          // Directional Flow Animated Dashed Line
          ctx.save();
          ctx.lineWidth = Math.max(2, thickness * 0.45);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
          ctx.setLineDash([14, 12]);
          ctx.lineDashOffset = dashOffsetRef.current;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
        } else {
          // Distant Path Segment (> 40m): Subtle Translucent Dashed Line
          const distantOffset = avgDistance - maxHorizonMeters;
          const distantOpacity = Math.max(
            0.05,
            Math.min(0.4, 0.45 * Math.pow(1 - Math.min(1, distantOffset / 120), 2))
          );

          ctx.save();
          ctx.lineWidth = Math.max(2, thickness * 0.6);
          ctx.strokeStyle = `rgba(147, 197, 253, ${distantOpacity})`;
          ctx.setLineDash([8, 8]);
          ctx.lineDashOffset = dashOffsetRef.current;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [polyline, userLocation, orientation, maxHorizonMeters, isActive]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default ARPolylineCanvas;
