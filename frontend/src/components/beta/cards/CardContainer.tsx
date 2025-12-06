"use client";

import { ReactNode } from "react";

/**
 * CardContainer Props
 */
export interface CardContainerProps {
  children: ReactNode;
  className?: string;
  enablePerspective?: boolean;
}

/**
 * CardContainer Component
 *
 * Stack manager that provides:
 * - Perspective transform for 3D depth effect
 * - Z-index layering for visible cards
 * - Scale reduction for stacked cards
 * - Y-offset for depth perception
 * - Viewport constraints
 * - Positioned to allow letter blocks to slide from behind
 *
 * This container should wrap all card components in the play page.
 */
export function CardContainer({
  children,
  className = "",
  enablePerspective = true,
}: CardContainerProps) {
  return (
    <div
      className={`
        relative
        flex
        h-full
        w-full
        items-start
        justify-center
        py-4
        ${enablePerspective ? "perspective-1000" : ""}
        ${className}
      `}
      style={{
        perspective: enablePerspective ? "1000px" : undefined,
        transformStyle: enablePerspective ? "preserve-3d" : undefined,
      }}
    >
      {/* Inner container for cards with max-width constraint */}
      <div className="relative mx-auto min-h-[320px] w-full max-w-md">
        {/* Card stack wrapper - provides stacking context */}
        <div className="relative h-full w-full">{children}</div>
      </div>
    </div>
  );
}

/**
 * CardStack Component
 *
 * Helper component for managing multiple stacked cards.
 * Handles z-index ordering, scale transforms, and y-offsets.
 */
export interface CardStackProps {
  cards: ReactNode[];
  maxVisibleCards?: number;
  className?: string;
}

export function CardStack({
  cards,
  maxVisibleCards = 3,
  className = "",
}: CardStackProps) {
  // Only show the top N cards
  const visibleCards = cards.slice(0, maxVisibleCards);
  const totalCards = visibleCards.length;

  return (
    <div className={`relative h-full w-full ${className}`}>
      {visibleCards.map((card, index) => {
        const stackIndex = index;
        const zIndex = totalCards - index;
        const scale = 1 - stackIndex * 0.05;
        const yOffset = stackIndex * 8;
        const opacity = 1 - stackIndex * 0.2;

        return (
          <div
            key={index}
            className="absolute inset-0 w-full transition-transform duration-300"
            style={{
              zIndex,
              transform: `
                translateY(${yOffset}px) 
                scale(${scale}) 
                rotateX(-${stackIndex * 2}deg)
              `,
              opacity,
              transformOrigin: "center top",
            }}
          >
            {card}
          </div>
        );
      })}
    </div>
  );
}
