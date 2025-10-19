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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (isDrawing && startPoint && endPoint) {
          drawShape(ctx, selectedTool, startPoint, endPoint);
        }
      }
    }
  }, [isDrawing, startPoint, endPoint]);

  const getMousePos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTool || selectedTool === 'select' || selectedTool === 'highlight' || selectedTool === 'comment' || selectedTool === 'sticky_note') return;
    setIsDrawing(true);
    setStartPoint(getMousePos(e));
    setEndPoint(getMousePos(e));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setEndPoint(getMousePos(e));
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPoint || !endPoint) return;
    setIsDrawing(false);

    const position = {
      x: Math.min(startPoint.x, endPoint.x) / scale,
      y: Math.min(startPoint.y, endPoint.y) / scale,
      width: Math.abs(startPoint.x - endPoint.x) / scale,
      height: Math.abs(startPoint.y - endPoint.y) / scale,
    };

    onDrawComplete({
      type: selectedTool,
      pageNumber,
      position,
      color: selectedColor,
      strokeWidth,
      opacity,
    });

    setStartPoint(null);
    setEndPoint(null);
  };

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
