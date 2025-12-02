interface StartGameButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function StartGameButton({ onClick, disabled }: StartGameButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full overflow-hidden rounded-full border-2 border-black bg-[#1a1f2e] py-4 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="flex items-center justify-center gap-3">
        <span className="text-xl font-bold">Start Game</span>
      </div>
    </button>
  );
}
