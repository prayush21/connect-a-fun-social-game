import { useState, useEffect } from "react";

/**
 * Hook to detect if the current device is a mobile phone.
 * Returns true for phones, false for tablets (iPad) and desktops.
 * Uses 768px as the breakpoint (tablets and above are considered non-mobile).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // Check screen width - phones are typically < 768px
      const isSmallScreen = window.innerWidth < 768;

      // Also check for touch capability and user agent for better detection
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA =
        /iphone|android.*mobile|windows phone|blackberry/i.test(userAgent);

      // Consider it mobile only if it's a small screen AND either has touch or mobile UA
      // This ensures tablets (iPad) with touch are NOT considered mobile
      setIsMobile(
        isSmallScreen && (isMobileUA || (isTouchDevice && isSmallScreen))
      );
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
}
