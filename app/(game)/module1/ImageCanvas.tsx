"use client";

import { useEffect, useRef } from "react";

type Highlight = {
  bbox?: [number, number, number, number];
  color?: string;
};

type ImageCanvasProps = {
  imageUrl?: string;
  highlight?: Highlight;
};

export default function ImageCanvas({ imageUrl, highlight }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      if (highlight?.bbox) {
        const [x, y, w, h] = highlight.bbox;
        ctx.strokeStyle = highlight.color ?? "#a3e635";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);
      }
    };
  }, [imageUrl, highlight]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-black/40">
      <canvas ref={canvasRef} className="w-full" />
      {!imageUrl && (
        <div className="absolute inset-0 grid place-items-center text-white/50">No image</div>
      )}
    </div>
  );
}
