import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Firebase (will be replaced with actual Firebase setup later)
vi.mock("firebase/app", () => ({}));
vi.mock("firebase/auth", () => ({}));
vi.mock("firebase/firestore", () => ({}));
