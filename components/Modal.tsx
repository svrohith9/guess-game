"use client";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70">
      <div className="card-surface w-full max-w-md p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="btn btn-circle btn-ghost" aria-label="Close modal">
            x
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
