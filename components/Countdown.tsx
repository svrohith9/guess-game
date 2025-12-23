"use client";

type CountdownProps = {
  count: number;
  visible: boolean;
};

export default function Countdown({ count, visible }: CountdownProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/70 text-white text-6xl font-bold">
      {count}
    </div>
  );
}
