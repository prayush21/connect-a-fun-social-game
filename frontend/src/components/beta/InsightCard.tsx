"use client";

import type {
  GameInsight,
  InsightType,
  Player,
  PlayerId,
} from "@/lib/beta/types";
import { Sparkles, Zap, Users, Target, Music } from "lucide-react";

interface InsightCardProps {
  insight: GameInsight;
}

// Color themes for different insight types
const INSIGHT_THEMES: Record<
  InsightType,
  { bg: string; border: string; iconBg: string; accent: string }
> = {
  dynamic_duo: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    iconBg: "bg-purple-200",
    accent: "text-purple-700",
  },
  og_interceptor: {
    bg: "bg-red-50",
    border: "border-red-300",
    iconBg: "bg-red-200",
    accent: "text-red-700",
  },
  signull_machine: {
    bg: "bg-green-50",
    border: "border-green-300",
    iconBg: "bg-green-200",
    accent: "text-green-700",
  },
  knows_it_all: {
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    iconBg: "bg-yellow-200",
    accent: "text-yellow-700",
  },
  longest_word_vibe: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    iconBg: "bg-blue-200",
    accent: "text-blue-700",
  },
};

// Icons for different insight types
const INSIGHT_ICONS: Record<InsightType, React.ReactNode> = {
  dynamic_duo: <Users className="h-5 w-5" />,
  og_interceptor: <Target className="h-5 w-5" />,
  signull_machine: <Zap fill="yellow" className="h-5 w-5" />,
  knows_it_all: <Sparkles className="h-5 w-5" />,
  longest_word_vibe: <Music className="h-5 w-5" />,
};

export function InsightCard({ insight }: InsightCardProps) {
  const theme = INSIGHT_THEMES[insight.type];
  const icon = INSIGHT_ICONS[insight.type];

  return (
    <div
      className={`flex flex-1 items-center gap-4 rounded-2xl border-2 border-black ${theme.bg} p-5 shadow-neobrutalist transition-transform hover:scale-[1.02]`}
    >
      {/* Icon */}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black ${theme.iconBg}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex flex-col">
        <h3 className={`text-lg font-bold leading-tight ${theme.accent}`}>
          {insight.title}
        </h3>
        <p className="mt-1 text-sm text-neutral-600">{insight.subtitle}</p>
      </div>
    </div>
  );
}
