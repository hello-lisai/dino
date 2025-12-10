import { Entity, Rect } from './types';

export const checkCollision = (rect1: Rect, rect2: Rect): boolean => {
  // Add a small padding to make hitboxes more forgiving
  const padding = 4;
  return (
    rect1.x + padding < rect2.x + rect2.w - padding &&
    rect1.x + rect1.w - padding > rect2.x + padding &&
    rect1.y + padding < rect2.y + rect2.h - padding &&
    rect1.y + rect1.h - padding > rect2.y + padding
  );
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
};
