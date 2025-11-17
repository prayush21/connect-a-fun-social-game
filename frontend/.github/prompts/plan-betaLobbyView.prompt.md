# Plan: Beta Lobby View with Room Code, QR Code, Game Settings & Player List

A simplified, responsive lobby interface featuring a prominent room code display with QR code, streamlined game settings in a single row (connects required stepper + Signull mode toggle), horizontal player cards with unique colors, and a floating start button for the setter.

## Steps

1. **Install QR code library** — Add `qrcode.react` to dependencies via `pnpm add qrcode.react @types/qrcode.react` for QR code generation

2. **Create `page.tsx` structure** — Build client component in `src/app/beta/lobby/page.tsx` that subscribes to game state via `useGameStore`, redirects if no room or game started, and renders the four main sections

3. **Implement room code section** — Create responsive header showing `roomId` text (large, centered), QR code component displaying join URL, and copy button with "Copied!" feedback, styled with Tailwind cards

4. **Build game settings row** — Create single responsive row containing: left side with "Connects Required" label + info icon (using existing `ConnectsRequiredControl` or adapted version) with +/- stepper, right side with Signull mode toggle switch (reusing `PlayModeToggle` or simplified version)

5. **Design player cards list** — Map through `players` to render horizontal cards showing left-aligned player name, right-aligned role badge, with unique color assignment (define 8-10 color palette, assign deterministically by player ID or index), include current player highlighting

6. **Add floating start button** — Position fixed bottom button visible only when `currentPlayerId === setterUid`, with enabled/disabled states (green vs gray styling), no click logic yet, using `Button` component from `src/components/ui/button.tsx`

## Further Considerations

1. **QR code destination URL** — Should the QR code link to `https://yourapp.com/join?room=ROOMID` or directly to `https://yourapp.com/beta/lobby?room=ROOMID`? Consider creating a join flow page.

2. **Player color assignment strategy** — Option A: Hash player ID for deterministic colors / Option B: Sequential assignment by join order / Option C: Random assignment stored in Firestore. Recommend Option A for consistency across sessions.

3. **Info icon content** — What tooltip/popover text should appear when hovering over the "Connects Required" info icon? Should match existing `ConnectsRequiredControl` explanation or be simplified?

4. **Mobile breakpoints** — At what screen width should the game settings row stack vertically (connects required on top, toggle below)? Suggest `md:` breakpoint (768px) for horizontal layout.
