import {
  Minus,
  Plus,
  Info,
  Check,
  Edit2,
  ChevronDown,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { BaseCard } from "@/components/beta/cards/BaseCard";
import { useShowPlayerScores } from "@/lib/posthog";

interface SettingsCardProps {
  connectsRequired: number;
  onConnectsChange: (delta: number) => void;
  prefixMode: boolean;
  onTogglePrefixMode: () => void;
  showScoreBreakdown: boolean;
  onToggleScoreBreakdown: () => void;
  setterName: string;
  isSetter: boolean;
  onSetterChange: () => void;
  onResetScores?: () => void;
}

export function SettingsCard({
  connectsRequired,
  onConnectsChange,
  prefixMode,
  onTogglePrefixMode,
  showScoreBreakdown,
  onToggleScoreBreakdown,
  setterName,
  isSetter,
  onSetterChange,
  onResetScores,
}: SettingsCardProps) {
  const showPlayerScores = useShowPlayerScores();

  return (
    <BaseCard className="space-y-6 !p-6">
      {/* Connects Required & Signull Mode Row */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
            <span>Connects Required</span>
          </div>

          <div className="flex w-fit items-center rounded-full border-2 border-black bg-white p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              onClick={() => onConnectsChange(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-neutral-100 active:scale-95"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-lg font-bold">
              {connectsRequired}
            </span>
            <button
              onClick={() => onConnectsChange(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-neutral-100 active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
            <Info className="h-4 w-4" />
            <span>Prefix Mode</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Custom Toggle */}
            <button
              onClick={onTogglePrefixMode}
              className={`relative h-8 w-14 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none ${prefixMode ? "bg-primary" : "bg-neutral-200"}`}
            >
              <div
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${prefixMode ? "translate-x-6" : "translate-x-0"}`}
              >
                {prefixMode && <Check className="m-1 h-3 w-3 text-primary" />}
              </div>
            </button>
            <span className="min-w-[20px] font-medium">
              {prefixMode ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>

      {/* Score Breakdown Toggle */}
      <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
          <Trophy className="h-4 w-4" />
          <span>Score Counting</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleScoreBreakdown}
            className={`relative h-8 w-14 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none ${showScoreBreakdown ? "bg-primary" : "bg-neutral-200"}`}
          >
            <div
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${showScoreBreakdown ? "translate-x-6" : "translate-x-0"}`}
            >
              {showScoreBreakdown && (
                <Check className="m-1 h-3 w-3 text-primary" />
              )}
            </div>
          </button>
          <span className="min-w-[20px] font-medium">
            {showScoreBreakdown ? "On" : "Off"}
          </span>
        </div>
      </div>

      {/* Reset Scores - Only visible when feature flag is enabled */}
      {showPlayerScores && isSetter && (
        <div className="border-t border-neutral-100 pt-4">
          <button
            onClick={onResetScores}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Scores</span>
          </button>
        </div>
      )}

      {/* Setter Selection */}
      <div className="mt-4 flex flex-col items-center gap-2 border-t border-neutral-100 pt-2">
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-neutral-600">
          <span>Setter</span>
          {isSetter && <Edit2 className="h-3 w-3" />}
        </div>
        <button
          onClick={onSetterChange}
          disabled={!isSetter}
          className="flex items-center gap-2 text-xl font-bold transition-all hover:opacity-70 disabled:cursor-not-allowed"
        >
          {setterName}
          {isSetter && <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
    </BaseCard>
  );
}
