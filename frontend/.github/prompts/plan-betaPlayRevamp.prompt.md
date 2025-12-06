# Plan: Complete UI Revamp with Card-Based Design System

Rebuild the beta play page from scratch with a modern, mobile-first card-based design system. This involves establishing design tokens, creating a new component architecture with swipeable cards inspired by the stacked-card UI pattern, and reimplementing all game screens with consistent visual language.

## Steps

### 1. Extend design system tokens in `tailwind.config.ts` and `globals.css`

Add card-specific spacing scales (card-sm: 320px, card-md: 400px), elevation system (shadow-card-1 through shadow-card-4 for stack depth), border radius tokens (rounded-card: 24px), transition timings for swipe gestures, dynamic letter block sizing utilities, and color palette for card states (active, inactive, disabled)

**Implementation details:**

- Add custom spacing values for card widths and heights
- Create shadow utilities for layered card appearance
- Define smooth timing functions for drag/swipe animations
- Extend color palette with card-specific semantic colors
- Add custom keyframes for card enter/exit animations
- **Add keyframes for letter block slide-up animation from behind card**
- **Define utility classes for dynamic letter block sizing (clamp-based responsive sizing)**

### 2. Install Framer Motion and create base card system

Run `pnpm add framer-motion`, then build `src/components/beta/cards/BaseCard.tsx` with drag/swipe detection, `CardContainer.tsx` for stack management with z-index + scale transforms, and `CardTransition.tsx` wrapper for AnimatePresence transitions

**Components to create:**

- `BaseCard.tsx` - Foundational card component with:
  - Drag gesture handlers
  - Swipe threshold detection (50px minimum)
  - Spring animation configs
  - Card state props (active, stacked, exiting)
  - Consistent padding and rounded corners
- `CardContainer.tsx` - Stack manager with:
  - Perspective transform for 3D depth
  - Z-index layering for visible cards
  - Scale reduction for stacked cards (0.95, 0.9, etc.)
  - Y-offset for depth perception
  - Viewport constraints
  - **Positioned to allow letter blocks to slide from behind**
- `CardTransition.tsx` - Animation wrapper with:
  - AnimatePresence for mount/unmount
  - Entrance animations (slide + fade)
  - Exit animations
  - Layout shift prevention

### 3. Structure beta play page layout in `src/app/beta/play/page.tsx`

Create mobile-first viewport (100dvh fixed), structured into 5 distinct sections with proper spacing and visual hierarchy, ensuring keyboard-safe bottom spacing for input interactions

**Layout structure:**

```
┌─────────────────────────────────────┐
│  SECTION 1: Top Header Bar          │  <- Wide rounded button (room code + dropdown) + arrow button
│  [Room: ABCD ▼]           [→]      │     Sticky header, safe area padding
├─────────────────────────────────────┤
│  SECTION 2: Notification Area       │  <- Reserved white space
│  (Plain white / Toast when active)  │     Fixed height, prevents layout shift
├─────────────────────────────────────┤
│  SECTION 3: Letter Blocks Display   │  <- Word progress visualization
│  [O] [X] [F] [ ] [ ] [ ]            │     Always visible, animates on  reveals
├─────────────────────────────────────┤
│                                     │
│  SECTION 4: Card Container          │  <- Main game state card
│  ┌───────────────────────────────┐  │     Swipeable, rounded edges
│  │                               │  │     Takes remaining flex space
│  │     [Card Content]            │  │     min-height to prevent collapse
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│  SECTION 5: Bottom Action Bar       │  <- Input + navigation buttons
│  [⌄⌄]  [___Input Field___]  [»]   │     Sticky bottom, above keyboard
│                                     │
├─────────────────────────────────────┤
│  Keyboard Safe Area (dynamic)       │  <- Padding for on-screen keyboard
└─────────────────────────────────────┘
```

**Detailed section specifications:**

**SECTION 1: Top Header Bar** (`h-14` fixed height)

- Left side: Wide rounded-full button showing room code with dropdown icon
  - Expands to dropdown menu on click (copy link, leave room, settings)
  - Gradient background or colored pill design
  - Truncate room code if needed with ellipsis
- Right side: Circular arrow button (for quick actions/history access)
- Padding: `px-4 py-2`
- Position: `sticky top-0` with backdrop blur
- Safe area: `pt-safe` for iOS notch

**SECTION 2: Notification Area** (`h-10` fixed height, reserved space)

- **Reserved white space**: Always renders with fixed height to prevent layout shift
- Background: Plain white (matches page background)
- Acts as notification slot/placeholder
- When notifications appear:
  - Toast-style messages display in this space
  - AnimatePresence for smooth enter/exit animations
  - Contextual game events shown:
    - "Player X joined the game"
    - "Round 3 of 5"
    - "Waiting for setter..."
    - "New clue received!"
  - Auto-dismiss after 3s (configurable)
  - Fade in/out transitions (no slide, stays in reserved space)
- When no notifications:
  - Empty white space (maintains layout consistency)
  - No collapse, no height changes
- Multiple notifications queue and replace each other in the same space
- Prevents content jumping since space is always allocated

**SECTION 3: Letter Blocks Display** (`h-16` fixed height)

- Horizontal row of letter blocks showing word progress
- **Dynamic sizing**: Block size and letter size scale based on word length
  - Calculates available width divided by word length
  - Ensures all blocks fit in one row without wrapping
  - Font size adjusts proportionally (smaller for longer words)
  - Maintains square aspect ratio for blocks
  - Min/max size constraints to ensure readability
- **Visibility states**:
  - **During "setting_word" phase**: Blocks are invisible/hidden
  - **After word is set**: Blocks animate in with slide-up effect
  - Animation: Slides up from behind the card in Section 4
  - Staggered animation (each block appears sequentially with slight delay)
  - Duration: ~400ms total animation
- Each block: Square with border, reveals letter on progress
- Styling: Consistent with LetterReveal component logic
- Always centered horizontally in available space
- Gap between blocks: Responsive to word length (smaller gap for longer words)
- Example scaling:
  - 4-letter word: Larger blocks (~48px), bigger font (~24px)
  - 8-letter word: Medium blocks (~32px), medium font (~16px)
  - 12-letter word: Smaller blocks (~24px), smaller font (~12px)

**SECTION 4: Card Container** (`flex-1` takes remaining space)

- Main interactive area with game state card
- Card properties:
  - `rounded-3xl` (24px border radius)
  - Elevated shadow for depth
  - White background
  - Padding: `p-6` or `p-8`
  - Max width: `max-w-md mx-auto` on larger screens
- Container properties:
  - Minimum height to prevent collapse: `min-h-[320px]`
  - Centered horizontally: `flex justify-center items-start`
  - Vertical padding: `py-4`
  - Perspective transform for 3D card stacking effect
- Card content shows ellipsis if lengthy
- Swipe gestures enabled (left/right only)
- Stacked card effect during the gameplay for multiple references/signulls.

**SECTION 5: Bottom Action Bar** (`h-16` fixed height)

- Three-column layout with consistent spacing
- Left: Chevron down button (`rounded-full border-2`)
  - Icon: Double down arrows (⌄⌄)
  - Function: Show Card/Reference history activity (such as previous guesses, clues)
  - Size: `h-12 w-12`
- Center: Text input field (`flex-1`)
  - Rounded pill design: `rounded-full`
  - Border with focus state
  - Placeholder: Context-aware ("Enter guess", "Type clue", etc.)
  - Auto-focus when appropriate for game state
- Right: Double chevron next button (`rounded-full border-2`)
  - Icon: Double forward arrows (»)
  - Function: go to next card or submit input
  - Size: `h-12 w-12`
  - Disabled state when no input/action available
- Padding: `px-4 py-2`
- Position: `sticky bottom-0` with backdrop blur
- Gap between elements: `gap-2` or `gap-3`

**Keyboard Safe Area** (Dynamic height)

- Use `env(safe-area-inset-bottom)` for iOS
- JavaScript-based keyboard detection for Android
- When keyboard visible:
  - Adjust bottom action bar position
  - Shrink card container to fit
  - Prevent scroll behind keyboard
- Smooth transition when keyboard shows/hides
- Use `KeyboardAvoidingView` pattern or CSS viewport units

**Key considerations:**

- Use `h-dvh` (dynamic viewport height) instead of `h-screen` for better mobile support
- Overflow: Hidden on main container, scrollable within card only
- Safe area insets for iOS notches/home indicator: `pt-safe pb-safe`
- Backdrop blur on sticky sections: `backdrop-blur-lg bg-white/80`
- Gradient background similar to beta lobby: `bg-gradient-to-br from-slate-50 to-slate-100`
- Pull-to-refresh disabled via CSS: `overscroll-behavior: contain`
- Touch-action restricted: `touch-action: pan-y pinch-zoom` for better gesture control
- Smooth scrolling within card: `scroll-smooth`
- Prevent zoom on input focus: Add viewport meta tag with maximum-scale=1

### 4. Build card-specific game components in `src/components/beta/cards/`

Create card components for all game states following the comprehensive design specifications in **`betaCardDesign.prompt.md`**.

**Card Categories:**

1. **Setup Cards** - WordSettingCard, WaitingWordCard
2. **Clue Phase Cards** - ClueInputCard, ViewReferenceCard
3. **Guessing Phase Cards** - ConnectCard, SabotageCard
4. **Waiting Cards** - WaitingClueCard, WaitingConnectsCard, VolunteerCard
5. **Meta Cards** - FinalRoundCard, GameEndedCard, HistoryCard, ActionsCard

**Total:** 13 card components, each implementing the BaseCard interface with consistent padding, typography, and action button placement.

**See detailed specifications:** `.github/prompts/betaCardDesign.prompt.md`

**Implementation Priority:**

- **Phase 1 (MVP):** Core game flow cards (6 cards)
- **Phase 2:** Setter mechanics cards (3 cards)
- **Phase 3:** Meta & polish cards (4 cards)

**Key Points:**

- Each card coordinates with Section 5 bottom input bar
- Cards determine input state (enabled/disabled, placeholder, validation)
- Reuses logic from existing `src/components/game/` components
- Follows consistent component structure pattern
- Letter blocks (Section 3) hidden until word is set

### 5. Implement card selection logic with `useCardNavigation` hook

Create `src/lib/hooks/useCardNavigation.ts` that maps game state (phase, reference, role, clueGiver) to active card component, manages card history stack for back navigation, and triggers card transitions only on meaningful state changes (not every Firebase update)

**Hook responsibilities:**

- Maintain card stack state (current, previous, next)
- Map game state to card type using decision tree
- Expose navigation methods (next, previous, goto)
- Track card history for back navigation
- Debounce rapid state changes to prevent janky animations
- Provide card metadata (title, canGoBack, canGoForward)
- Coordinate bottom input state with active card
- Manage notification queue for Section 2
- Handle keyboard visibility state for layout adjustments

**Hook interface:**

```typescript
interface UseCardNavigationReturn {
  // Current card info
  currentCard: CardType;
  cardHistory: CardType[];

  // Navigation state
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  currentIndex: number;
  totalCards: number;

  // Navigation methods
  goToCard: (cardType: CardType) => void;
  goBack: () => void;
  goForward: () => void;
  handleSwipe: (direction: "left" | "right") => void;

  // Card metadata
  cardTitle: string;
  cardDescription: string;

  // Bottom input coordination
  inputConfig: {
    isEnabled: boolean;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => Promise<void>;
    validation?: (value: string) => string | null; // Returns error message or null
  };

  // Action button states
  leftButtonState: {
    isVisible: boolean;
    isEnabled: boolean;
    onClick: () => void;
    label: string;
    badge?: number; // For new history items count
  };

  rightButtonState: {
    isVisible: boolean;
    isEnabled: boolean;
    onClick: () => void;
    label: string;
    isLoading?: boolean;
  };

  // Notification system
  notification: {
    message: string;
    type: "info" | "success" | "warning" | "error";
    isVisible: boolean;
  } | null;

  // Layout adjustments
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}
```

**Card type decision tree:**

```typescript
function selectCardType(gameState: GameState, sessionId: string): CardType {
  const { gamePhase, currentReference, setterUid, currentClueGiver } =
    gameState;
  const currentPlayer = gameState.players[sessionId];
  const isSetter = sessionId === setterUid;
  const isClueGiver = sessionId === currentClueGiver?.uid;

  if (gamePhase === "lobby") return "redirect-to-lobby";
  if (gamePhase === "ended") return "game-ended";

  if (gamePhase === "setting_word") {
    return isSetter ? "word-setting" : "waiting-word";
  }

  if (gamePhase === "guessing") {
    if (!currentReference) {
      if (isClueGiver) return "clue-input";
      if (!currentClueGiver) return "volunteer-prompt";
      return "waiting-clue";
    }

    // Has reference
    if (isSetter) {
      return currentReference.isFinal ? "final-round" : "sabotage";
    }

    // Is guesser
    return isClueGiver ? "waiting-connects" : "connect";
  }

  return "waiting"; // Fallback
}
```

### 6. Add gesture controls and accessibility

Configure Framer Motion drag constraints (horizontal only, 50px threshold), map bottom action buttons to card navigation (⌄⌄ for history, » for submit/next), add haptic feedback via Vibration API for mobile, and ensure ARIA labels and focus management for screen readers

**Gesture configuration:**

```typescript
// Drag constraints
const dragConstraints = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

// Swipe detection
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

// Haptic feedback
const triggerHaptic = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate(10);
  }
};
```

**Bottom action bar button behaviors:**

**Left button (⌄⌄ Chevron Down):**

- Primary: Show card history / game log
- Slides the card up into the section 2 blank space, and displays history below blurring out the background blocks letters and other card stack
- Disabled when no history available
- Badge indicator for new events

**Right button (» Double Forward):**

- Context-aware based on current card state:
  - **With input text**: Submit current input (same as pressing Enter)
  - **Without input**: Navigate to next available card/action
  - **Waiting states**: Disabled, shows as inactive
  - **Action cards**: Trigger primary action
- Visual states: Active (colored), Disabled (gray), Loading (spinner)
- Success feedback: Brief haptic + visual confirmation

**Center input field:**

- Enter key triggers submit (same as » button)
- Escape key clears input
- Auto-focus when card requires input
- Blur when switching to non-input cards

**Keyboard shortcuts:**

- `ArrowLeft` - Navigate to previous card (if history exists)
- `ArrowRight` - Navigate to next card (if available)
- `Enter` - Submit input / primary action (same as » button)
- `Escape` - Clear input field / dismiss modals
- `Cmd/Ctrl + K` - Focus input field
- `?` - Show help/shortcuts modal

**Touch gestures:**

- Swipe left on card: Go to previous card (if history exists)
- Swipe right on card: Next action (same as » button when no input)
- Long press on room code: Copy to clipboard
- Pull down on card: Refresh game state (optional)

**Accessibility features:**

- ARIA live regions for game state changes
- ARIA labels on all action buttons:
  - Top right arrow: "Quick actions"
  - Left ⌄⌄: "View history"
  - Right »: "Submit" or "Next action"
- Focus management:
  - Auto-focus input when card changes and input needed
  - Focus trap in dropdown menus
  - Visible focus indicators with 2px outline
- Screen reader announcements:
  - Card transitions: "Now showing [Card Name]"
  - Notifications: Announced immediately
  - Submit success: "Action completed"
- High contrast mode support:
  - Border widths increase
  - Color contrast meets WCAG AAA
- Reduced motion support:
  - Disable card swipe animations
  - Use fade instead of slide
  - Remove perspective transforms
  - Keep essential state transitions

## Additional Components Required

### Room Code Dropdown Component

**Location:** `src/components/beta/ui/RoomCodeDropdown.tsx`

Clicking the wide room code button in Section 1 opens a dropdown menu with:

- Copy room link (with copy confirmation)
- Leave game (with confirmation dialog)
- Game settings (if user is setter)
- Help/Rules

**Behavior:**

- Dropdown positioned below button
- Click outside to close
- Smooth slide-down animation
- Backdrop overlay (semi-transparent)

### Notification Banner Component

**Location:** `src/components/beta/ui/NotificationBanner.tsx`

Handles Section 2 notification display within reserved white space:

- Fixed height container (always `h-10`) that doesn't collapse
- Toast messages fade in/out within the reserved space
- Queue management for multiple notifications (replaces current with next)
- Auto-dismiss timer (3s default, configurable)
- Fade-only animations (no slide, maintains position)
- Color coding by notification type (subtle background tints)
- Content-aware text truncation with ellipsis

**Notification types:**

- `info`: Player joined/left, round number (blue tint)
- `success`: Correct guess, word completed (green tint)
- `warning`: Time running low, last round (amber tint)
- `error`: Connection issues, invalid input (red tint)

**Key difference from traditional toasts:**

- Does NOT overlay content or appear from edges
- Lives in dedicated Section 2 reserved space
- Space always allocated, preventing layout shift
- Simple fade transitions only

### Bottom Input Component

**Location:** `src/components/beta/ui/BottomInput.tsx`

Unified input component for Section 5 that:

- Receives configuration from active card via `useCardNavigation` hook
- Shows/hides based on card requirements
- Handles validation and error display
- Manages focus state
- Coordinates with keyboard visibility
- Provides real-time character count when needed
- Shows loading state during submission

### Keyboard Manager Hook

**Location:** `src/lib/hooks/useKeyboardManager.ts`

Detects keyboard visibility and adjusts layout:

- Listens to resize events and visualViewport API
- Calculates keyboard height
- Triggers layout adjustments (shrink card area)
- Handles iOS vs Android differences
- Provides keyboard dismiss function

## Further Considerations

### 1. Design tokens source

**Question:** Should we extract all design tokens into a separate `src/styles/tokens.ts` file for programmatic access, or keep them purely in Tailwind config? TypeScript access to spacing/colors would help with Framer Motion animations.

Answer:

- Dual source (Tailwind + tokens.ts)

### 2. Card history behavior

**Question:** When swiping left what to do?

Answer:

- Go to the previous card in history stack if available and if the mode is round robin, don't allow going back to previous rounds or next rounds.

**Recommendation:** Option B (bottom sheet) for mobile, Option C (modal) for desktop.

### 3. Transition performance

**Question:** Should we use `transform: translateZ(0)` and `will-change` for GPU acceleration on card animations? This improves smoothness but increases memory usage on older mobile devices.

**Considerations:**

- **GPU acceleration benefits:**
  - Smoother 60fps animations
  - Better swipe responsiveness
  - Reduced jank during transitions
- **Memory tradeoffs:**
  - Each accelerated layer uses GPU memory
  - Older devices (< 2GB RAM) may struggle
  - Multiple simultaneous animations compound the issue

**Recommendation:**

- Use GPU acceleration for main card only
- Apply `will-change` only during active gestures
- Remove `will-change` after transition completes
- Feature detect and disable on low-memory devices

**Implementation:**

```typescript
// Only accelerate the active card
const cardStyle = {
  transform: isActive ? "translateZ(0)" : "none",
  willChange: isDragging ? "transform" : "auto",
};
```

## Implementation Order

1. **Foundation** (Step 1) - Design tokens and system setup
2. **Infrastructure** (Step 2) - Base card components and animation system
3. **Layout** (Step 3) - Page structure and viewport management
4. **Navigation** (Step 5) - Card selection logic and routing
5. **Components** (Step 4) - Individual card implementations
6. **Polish** (Step 6) - Gestures, accessibility, and refinements

## Success Criteria

### Layout & Structure

- [ ] All 5 sections render correctly with proper spacing
- [ ] Section heights adapt correctly on different screen sizes
- [ ] Keyboard appearance doesn't break layout
- [ ] Safe area insets handled on iOS devices (notch, home indicator)
- [ ] Works in portrait orientation on mobile (320px - 430px width)
- [ ] No layout shift or content jump during transitions

### Section 1: Top Header

- [ ] Room code button displays correctly with dropdown icon
- [ ] Dropdown menu opens/closes smoothly
- [ ] Copy link functionality works
- [ ] Right arrow button accessible and functional

### Section 2: Notifications

- [ ] Fixed white space always rendered (h-10)
- [ ] Notifications fade in/out within reserved space
- [ ] Multiple notifications queue and replace correctly
- [ ] Auto-dismiss works after 3 seconds
- [ ] Notification types styled correctly with subtle tints (info/success/warning/error)
- [ ] No layout shift when notifications appear/disappear

### Section 3: Letter Blocks

- [ ] Letter blocks always render correctly with proper spacing
- [ ] **Blocks hidden during "setting_word" phase**
- [ ] **Blocks animate in (slide up from behind card) when word is set**
- [ ] **Staggered animation works** (sequential block appearance)
- [ ] **Dynamic sizing**: Block and font size scale based on word length
- [ ] **All blocks fit in one row** regardless of word length (4-15 letters)
- [ ] Blocks animate on reveal correctly during gameplay
- [ ] Responsive sizing maintains readability on narrow screens (320px+)
- [ ] Square aspect ratio maintained for all block sizes
- [ ] Matches existing LetterReveal component behavior for letter reveals

### Section 4: Card Container

- [ ] All 13 game states have dedicated card components
- [ ] Card has proper rounded edges (24px) and elevation
- [ ] Card content scrollable when exceeds available height
- [ ] Smooth 60fps swipe animations on target devices (iPhone 12+, Android 10+)
- [ ] Card transitions trigger only on meaningful state changes
- [ ] Perspective transform creates proper 3D stacking effect

### Section 5: Bottom Action Bar

- [ ] Three-button layout renders correctly
- [ ] Left button (⌄⌄) sends a signull.
- [ ] Center input field enabled/disabled based on card state
- [ ] Right button (») behavior changes based on context
- [ ] Input placeholder updates per card requirements
- [ ] Submit action works via button click or Enter key
- [ ] Buttons disabled when no action available

### Interactions & Gestures

- [ ] Swipe left on card shows history
- [ ] Swipe right on card triggers next action (when applicable)
- [ ] Button clicks provide haptic feedback
- [ ] Long press on room code copies to clipboard
- [ ] Keyboard shortcuts work (ArrowLeft, ArrowRight, Enter, Escape)

### Input Coordination

- [ ] Input auto-focuses when card requires input
- [ ] Input validation shows real-time feedback in card
- [ ] Character count displays when needed (clue input)
- [ ] Input clears appropriately between card transitions
- [ ] Submit works via » button or Enter key

### Keyboard Management

- [ ] Keyboard appearance detected correctly
- [ ] Card area shrinks to accommodate keyboard
- [ ] Bottom bar stays above keyboard
- [ ] Smooth transition when keyboard shows/hides
- [ ] Works on both iOS and Android

### Accessibility

- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces card changes correctly
- [ ] ARIA labels present on all buttons
- [ ] Focus indicators visible (2px outline)
- [ ] High contrast mode supported
- [ ] Reduced motion preference respected
- [ ] Pass WCAG 2.1 AA accessibility standards

### Performance

- [ ] Smooth 60fps animations maintained
- [ ] No janky transitions during rapid state changes
- [ ] Debouncing prevents excessive re-renders
- [ ] GPU acceleration used judiciously
- [ ] Graceful degradation on older devices (reduced animations)
- [ ] Bundle size impact assessed and optimized

### Game State Integration

- [ ] All game phases render correct card
- [ ] Real-time Firebase updates reflected immediately (with debouncing)
- [ ] Optimistic updates show in UI before server confirmation
- [ ] History accessible without disrupting main flow
- [ ] Notification system shows relevant game events
- [ ] Room code dropdown actions work correctly
