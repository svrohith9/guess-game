import { useCallback } from "react";
import { gradeSm2, initSm2, Sm2Card } from "@/lib/sm2";

export function useSM2() {
  const initCard = useCallback((): Sm2Card => initSm2(), []);
  const gradeCard = useCallback((card: Sm2Card, quality: number) => gradeSm2(card, quality), []);
  return { initCard, gradeCard };
}
