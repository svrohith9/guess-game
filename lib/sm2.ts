export type Sm2Card = {
  interval: number;
  repetition: number;
  easeFactor: number;
  due: number;
};

export function initSm2(): Sm2Card {
  return { interval: 1, repetition: 0, easeFactor: 2.5, due: Date.now() };
}

export function gradeSm2(card: Sm2Card, quality: number): Sm2Card {
  const q = Math.max(0, Math.min(5, quality));
  let { repetition, interval, easeFactor } = card;
  if (q < 3) {
    repetition = 0;
    interval = 1;
  } else {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetition += 1;
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const due = Date.now() + interval * 24 * 60 * 60 * 1000;
  return { interval, repetition, easeFactor, due };
}
