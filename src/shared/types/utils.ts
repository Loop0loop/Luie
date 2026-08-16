import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** clsx 결과를 병합해 뒤쪽 Tailwind class가 앞쪽 class를 덮어쓰게 한다. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
