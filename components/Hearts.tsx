import clsx from "clsx";

type HeartsProps = {
  lives: number;
};

export default function Hearts({ lives }: HeartsProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 3 }).map((_, index) => (
        <span
          key={index}
          className={clsx(
            "text-lg",
            index < lives ? "text-emerald-400" : "text-base-300"
          )}
        >
          H
        </span>
      ))}
    </div>
  );
}
