interface StartGameButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function StartGameButton({ onClick, disabled }: StartGameButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full overflow-hidden rounded-full bg-[#1a1f2e] py-4 text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex items-center justify-center gap-3">
        <span className="text-xl font-bold">Start Game</span>
      </div>
    </button>
  );
}
