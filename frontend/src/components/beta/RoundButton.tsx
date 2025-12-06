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
        // Shadow and lift effect
        "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
        // Interactions
        "transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
        "active:translate-y-[2px] active:shadow-none",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:active:translate-y-0",
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
