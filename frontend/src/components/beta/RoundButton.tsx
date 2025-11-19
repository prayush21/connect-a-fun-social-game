import * as React from "react";
import { cn } from "@/lib/utils";

type RoundButtonSize = "sm" | "md" | "lg";

interface RoundButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: RoundButtonSize;
  children?: React.ReactNode;
}

const sizeClasses: Record<RoundButtonSize, string> = {
  sm: "h-10 w-10", // 40px
  md: "h-12 w-12", // 48px (default for header)
  lg: "h-14 w-14", // 56px (for footer/prominent actions)
};

const iconSizeClasses: Record<RoundButtonSize, string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
};

/**
 * RoundButton - Standardized circular button for beta interface
 *
 * Design: White background, 2px black border, rounded-full
 * Interaction: Hover lightens, active scales down
 * States: Normal, hover, active, disabled
 */
export const RoundButton = React.forwardRef<
  HTMLButtonElement,
  RoundButtonProps
>(({ size = "md", className, disabled, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        // Base styles
        "flex flex-shrink-0 items-center justify-center rounded-full",
        // Border and background
        "border-2 border-black bg-white",
        // Interactions
        "transition-all hover:bg-neutral-50 active:scale-95",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:active:scale-100",
        // Size
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

RoundButton.displayName = "RoundButton";

// Helper component for consistent icon sizing within round buttons
export const RoundButtonIcon: React.FC<{
  size?: RoundButtonSize;
  className?: string;
  children: React.ReactNode;
}> = ({ size = "md", className, children }) => {
  return (
    <span className={cn(iconSizeClasses[size], "text-black", className)}>
      {children}
    </span>
  );
};
