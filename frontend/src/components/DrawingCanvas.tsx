import { useEffect, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { useAnnotationStore, AnnotationType } from '../store/annotation.store';

interface DrawingCanvasProps {
  onDrawComplete: (data: any) => void;
  pageNumber: number;
  scale: number;
}

export function DrawingCanvas({ onDrawComplete, pageNumber, scale }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedTool, selectedColor, strokeWidth, opacity } = useAnnotationStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);

  const [points, setPoints] = useState<number[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (isDrawing) {
          if (selectedTool === 'freehand' && points.length > 1) {
            drawFreehand(ctx, points);
          } else if (startPoint && endPoint) {
            drawShape(ctx, selectedTool, startPoint, endPoint);
          }
        }
      }
    }
  }, [isDrawing, startPoint, endPoint, points]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTool || selectedTool === 'select' || selectedTool === 'highlight' || selectedTool === 'comment' || selectedTool === 'sticky_note') return;
    setIsDrawing(true);
    const pos = getMousePos(e);
    if (selectedTool === 'freehand') {
      setPoints([[pos.x, pos.y]]);
    } else {
      setStartPoint(pos);
      setEndPoint(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    if (selectedTool === 'freehand') {
      setPoints(prev => [...prev, [pos.x, pos.y]]);
    } else {
      setEndPoint(pos);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (selectedTool === 'freehand') {
      const xs = points.map(p => p[0]);
      const ys = points.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);

      onDrawComplete({
        type: 'freehand',
        pageNumber,
        points: points.map(p => [p[0] / scale, p[1] / scale]),
        position: {
          x: minX / scale,
          y: minY / scale,
          width: (maxX - minX) / scale,
          height: (maxY - minY) / scale,
        },
        color: selectedColor,
        strokeWidth,
        opacity,
      });
      setPoints([]);
    } else if (startPoint && endPoint) {
      // ... (existing shape logic)
    }
  };

  function drawFreehand(ctx: CanvasRenderingContext2D, pts: number[][]) {
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = strokeWidth * scale;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
  }

  function drawShape(ctx: CanvasRenderingContext2D, tool: AnnotationType | 'select' | null, start: {x: number, y: number}, end: {x: number, y: number}) {
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = strokeWidth * scale;
    ctx.globalAlpha = opacity;

    if (tool === 'rectangle') {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    }
    // Other shapes will be added here
  }

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      cursor="crosshair"
    >
      <canvas
        ref={canvasRef}
        width={canvasRef.current?.parentElement?.clientWidth}
        height={canvasRef.current?.parentElement?.clientHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // End drawing if mouse leaves canvas
      />
    </Box>
  );
}
