/**
 * Canvas-local class merger.
 *
 * 외부 `@renderer/lib/utils::cn`(clsx + tailwind-merge)을 그대로 인용.
 * 다른 feature와 공유하지 않고 캔버스 안에서만 사용한다.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
