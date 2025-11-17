# Beta Card Design System

Comprehensive design specification for all card layouts and states in the beta play page. Each card represents a specific game state and provides the appropriate UI for player interactions.

## Card Architecture

### Base Card System

All cards inherit from `BaseCard.tsx` which provides:

- Drag/swipe gesture detection
- Consistent rounded-3xl corners (24px)
- Elevation shadow for depth
- White background
- Standard padding (p-6 or p-8)
- Animation support via Framer Motion

### Card Categories

Cards are organized into functional categories:

1. **Setup Cards** - Word setting phase
2. **Clue Phase Cards** - Reference word and clue submission
3. **Guessing Phase Cards** - Connection attempts
4. **Waiting Cards** - Passive states while others act
5. **Meta Cards** - History, actions, game end

## Card Components Specifications

### 1. Setup Cards

#### WordSettingCard.tsx

**Phase:** `setting_word` | **Role:** Setter | **Active:** Yes

**Purpose:** Setter enters the secret word to start the round

**Layout:**

```
┌─────────────────────────────────┐
│  Enter the Secret Word          │ <- Title
│                                  │
│  ┌──────────────────────────┐  │
│  │ [Large Input Field]      │  │ <- Auto-focused
│  │ OXFORD_____              │  │
│  └──────────────────────────┘  │
│                                  │
│  ✓ Must be 4-15 letters         │ <- Validation rules
│  ✓ Only letters allowed          │
│                                  │
│  [Submit Word Button]           │ <- Bottom aligned
└─────────────────────────────────┘
```

**Features:**

- Large input field for word entry
- Real-time validation feedback
- Letter count display
- Submit button (enabled when valid)
- Reuses logic from `src/components/game/WordSetting.tsx`

**Bottom Input:** Disabled (uses in-card input)

**State Management:**

- Input value stored in local state
- Validates on change
- Submits to Firebase on button click
- Letter blocks (Section 3) hidden until submission

---

#### WaitingWordCard.tsx

**Phase:** `setting_word` | **Role:** Guesser | **Active:** No

**Purpose:** Guessers wait while setter chooses word

**Layout:**

```
┌─────────────────────────────────┐
│                                  │
│     [Animated Spinner]          │
│                                  │
│  Setter is choosing a word...   │ <- Main message
│                                  │
│  ┌─┐ ┌─┐ ┌─┐                    │
│  │A│ │B│ │C│  Online players   │ <- Avatar indicators
│  └─┘ └─┘ └─┘                    │
│                                  │
└─────────────────────────────────┘
```

**Features:**

- Waiting indicator animation
- List of online players with colored avatars
- No interaction required
- Reuses logic from `src/components/game/WaitingState.tsx`

**Bottom Input:** Disabled

**Trigger:** When word is set, letter blocks animate in from behind this card

---

### 2. Clue Phase Cards

#### ClueInputCard.tsx

**Phase:** `guessing` | **Role:** Guesser (Clue Giver) | **Reference:** None | **Active:** Yes

**Purpose:** Clue giver submits reference word and clue text

**Layout:**

```
┌─────────────────────────────────┐
│  Provide a Reference & Clue     │
│                                  │
│  Revealed Prefix: OXF           │ <- Large, prominent
│                                  │
│ Step 1: Reference Word          │
│  ┌──────────────────────────┐  │
│  │ OXFORD                   │  │ <- Must start with prefix
│  └──────────────────────────┘  │
│  ✓ Starts with OXF              │
│                                  │
│ Step 2: Your Clue               │
│  ┌──────────────────────────┐  │
│  │ Famous university city   │  │ <- Textarea
│  └──────────────────────────┘  │
│  38/100 characters              │ <- Character count
│                                  │
│  [Submit Clue Button]           │
└─────────────────────────────────┘
```

**Features:**

- Two-step form (reference word, then clue)
- Prefix validation for reference word
- Character counter for clue (max 100)
- Submit button enables when both valid
- Reuses logic from `src/components/game/ClueInput.tsx`

**Bottom Input:** Can integrate with bottom bar or use in-card inputs

**Special Notes:**

- Reference word must start with revealed prefix
- Clue cannot contain the reference word
- Real-time validation feedback

---

#### ViewReferenceCard.tsx

**Phase:** `guessing` | **Reference:** Present | **Active:** Display Only

**Purpose:** Shows current reference word and clue to all players

**Layout:**

```
┌─────────────────────────────────┐
│  Current Reference              │
│                                  │
│      OXFORD                     │ <- Large, bold
│                                  │
│  "Famous university city"       │ <- Clue in quotes
│                                  │
│  — by Alex                      │ <- Clue giver name
│                                  │
│  [View in full] (optional)      │
└─────────────────────────────────┘
```

**Features:**

- Large typography for readability
- Clue displayed prominently with quotation marks
- Attribution to clue giver
- Optional expand for long clues
- Reuses logic from `src/components/game/ViewReference.tsx`

**Bottom Input:** Disabled (info only)

**Display Context:** Often shown alongside action cards (Connect/Sabotage)

---

### 3. Guessing Phase Cards

#### ConnectCard.tsx

**Phase:** `guessing` | **Role:** Guesser (not clue giver) | **Reference:** Present | **Active:** Yes

**Purpose:** Guessers submit connection attempts to link reference to secret word

**Layout:**

```
┌─────────────────────────────────┐
│  Make Your Connection           │
│                                  │
│  Reference: OXFORD              │ <- Reminder
│  Clue: "Famous university..."   │
│                                  │
│  Your Guess:                    │
│  (Uses bottom input bar)        │
│                                  │
│  Previous attempts:             │
│  • CAMBRIDGE (you)              │
│  • HARVARD (Alex)               │
│                                  │
│  [Submit via » button]          │
└─────────────────────────────────┘
```

**Features:**

- Shows reference and clue for context
- Lists previous guesses from all players
- Uses bottom input bar for guess entry
- Real-time validation (no duplicates)
- Submit via » button or Enter key
- Reuses logic from `src/components/game/Connect.tsx`

**Bottom Input:** Enabled

- Placeholder: "Your connection word"
- Validates against revealed prefix
- Shows error if duplicate or invalid

**Success Feedback:** Brief animation on successful submission

---

#### SabotageCard.tsx

**Phase:** `guessing` | **Role:** Setter | **Reference:** Present (not final) | **Active:** Yes

**Purpose:** Setter attempts to sabotage by matching guesser connections

**Layout:**

```
┌─────────────────────────────────┐
│  Sabotage Attempt               │
│                                  │
│  Reference: OXFORD              │
│  Clue: "Famous university..."   │
│                                  │
│  Guesser connections:           │
│  • CAMBRIDGE                    │
│  • HARVARD                      │
│  • SCHOLAR                      │
│                                  │
│  Match one to sabotage:         │
│  (Uses bottom input bar)        │
│                                  │
│  Attempts remaining: 2          │ <- Counter
└─────────────────────────────────┘
```

**Features:**

- Shows reference and all guesser connections
- Uses bottom input bar for sabotage attempt
- Counter shows remaining attempts
- Validates against guesser connection list
- Reuses logic from `src/components/game/Sabotage.tsx`

**Bottom Input:** Enabled

- Placeholder: "Sabotage attempt"
- Must match exactly one guesser connection
- Case-insensitive validation

**Special Notes:**

- Limited attempts per round (typically 2-3)
- Successful sabotage ends round immediately

---

### 4. Waiting Cards

#### WaitingClueCard.tsx

**Phase:** `guessing` | **Reference:** None | **Clue Giver:** Assigned (not self) | **Active:** No

**Purpose:** Players wait for clue giver to submit reference

**Layout:**

```
┌─────────────────────────────────┐
│                                  │
│     [Animated Spinner]          │
│                                  │
│  Waiting for Alex to provide    │
│  a clue...                      │
│                                  │
│  [Progress Indicator]           │ <- Optional timeout
│                                  │
└─────────────────────────────────┘
```

**Features:**

- Shows clue giver name
- Animated waiting indicator
- Optional timeout countdown
- Reuses logic from `src/components/game/WaitingForClue.tsx`

**Bottom Input:** Disabled

---

#### WaitingConnectsCard.tsx

**Phase:** `guessing` | **Role:** Clue Giver | **Reference:** Present | **Active:** No

**Purpose:** Clue giver waits for guessers to submit connections

**Layout:**

```
┌─────────────────────────────────┐
│  Waiting for Connections        │
│                                  │
│  Your reference: OXFORD         │
│                                  │
│  ┌─────────────────────────┐    │
│  │ Progress: 2/3           │    │ <- Progress bar
│  │ ████████░░░░            │    │
│  └─────────────────────────┘    │
│                                  │
│  Submitted:                     │
│  ✓ Alex                         │
│  ✓ Beth                         │
│  ⏳ Chris                        │
│                                  │
└─────────────────────────────────┘
```

**Features:**

- Shows your reference word
- Progress bar for guess collection
- List of who has/hasn't submitted
- Real-time updates as guesses come in
- Reuses logic from `src/components/game/WaitingForConnects.tsx`

**Bottom Input:** Disabled

---

#### VolunteerCard.tsx

**Phase:** `guessing` | **Reference:** None | **Clue Giver:** None | **Active:** Yes

**Purpose:** Prompts players to volunteer as clue giver when none assigned

**Layout:**

```
┌─────────────────────────────────┐
│  No Clue Giver!                 │
│                                  │
│  Someone needs to provide a     │
│  reference and clue.            │
│                                  │
│  As clue giver, you will:       │
│  • Choose a reference word      │
│  • Write a connecting clue      │
│  • Wait for others to guess     │
│                                  │
│  [Volunteer as Clue Giver]      │ <- Primary CTA
│                                  │
│  Auto-assign in: 10s            │ <- Timer
└─────────────────────────────────┘
```

**Features:**

- Explains clue giver role
- Volunteer button
- Countdown timer for auto-assignment
- Reuses logic from `src/components/game/VolunteerClueGiver.tsx`

**Bottom Input:** Disabled

**Behavior:** First to volunteer or random after timeout

---

### 5. Meta Cards

#### FinalRoundCard.tsx

**Phase:** `guessing` | **Reference:** Present (isFinal: true) | **Role:** Setter | **Active:** Info

**Purpose:** Notifies setter this is the final round before word reveal

**Layout:**

```
┌─────────────────────────────────┐
│                                  │
│     ⚠️ FINAL ROUND              │
│                                  │
│  This is your last chance to    │
│  sabotage before the secret     │
│  word is revealed!              │
│                                  │
│  Reference: OXFORD              │
│                                  │
│  [Proceed to Sabotage]          │
└─────────────────────────────────┘
```

**Features:**

- Tension-building message
- Shows current reference
- Transitions to sabotage card
- Optional dramatic animation

**Bottom Input:** Disabled

---

#### GameEndedCard.tsx

**Phase:** `ended` | **Active:** Display + Action

**Purpose:** Shows game results and winner announcement

**Layout:**

```
┌─────────────────────────────────┐
│   🎉 GAME OVER! 🎉             │
│                                  │
│  Secret Word: OXFORD            │ <- Revealed
│                                  │
│  Winner: Guessers! 🏆          │ <- Winner team
│                                  │
│  Stats:                         │
│  • Rounds: 5                    │
│  • Total guesses: 23            │
│  • Sabotages: 2                 │
│                                  │
│  [Play Again] [Leave Game]      │
└─────────────────────────────────┘
```

**Features:**

- Confetti animation on mount
- Secret word reveal
- Winner announcement (guessers/setter)
- Game statistics summary
- Play again and leave buttons

**Bottom Input:** Disabled

---

#### HistoryCard.tsx

**Accessed via:** Left swipe or ⌄⌄ button | **Active:** Display

**Purpose:** Shows terminal-style game log of all actions

**Layout:**

```
┌─────────────────────────────────┐
│  Game History                   │
│  ─────────────────────────────  │
│                                  │
│  [Scrollable Content]           │
│                                  │
│  > Round 3                      │
│  > Alex set reference: OXFORD   │
│  > Beth guessed: CAMBRIDGE      │
│  > Chris guessed: HARVARD       │
│  > Setter sabotaged: CAMBRIDGE  │
│  > Round ended (sabotage)       │
│                                  │
│  [Close History]                │
└─────────────────────────────────┘
```

**Features:**

- Terminal-style log view
- Scrollable past actions
- Timestamp per action (optional)
- Color-coded by action type
- Reuses logic from `src/components/game/History.tsx`

**Bottom Input:** Disabled

**Access:** Swipe left on main card or tap ⌄⌄ button

---

#### ActionsCard.tsx

**Accessed via:** Top right arrow button | **Active:** Menu

**Purpose:** Quick access menu for game actions

**Layout:**

```
┌─────────────────────────────────┐
│  Quick Actions                  │
│                                  │
│  ┌──────────────────────────┐  │
│  │ 💡 Direct Guess          │  │ <- Open modal
│  └──────────────────────────┘  │
│                                  │
│  ┌──────────────────────────┐  │
│  │ ⚙️  Game Settings        │  │
│  └──────────────────────────┘  │
│                                  │
│  ┌──────────────────────────┐  │
│  │ 📖 Rules & Help          │  │
│  └──────────────────────────┘  │
│                                  │
│  ┌──────────────────────────┐  │
│  │ 🚪 Leave Game            │  │ <- Confirmation
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

**Features:**

- Direct guess modal trigger
- Settings access (if setter)
- Rules/help modal
- Leave game with confirmation

**Bottom Input:** Disabled

---

## Card State Coordination

### Input Integration

Cards coordinate with Section 5 bottom input bar:

| Card                      | Input Enabled | Placeholder                    | Validation                    | Submit Action            |
| ------------------------- | ------------- | ------------------------------ | ----------------------------- | ------------------------ |
| WordSettingCard           | No (in-card)  | -                              | Letters only, 4-15 chars      | Sets secret word         |
| ClueInputCard             | Optional      | "Reference word" / "Clue text" | Prefix match, no word in clue | Submits reference + clue |
| ConnectCard               | Yes           | "Your connection word"         | No duplicates, valid word     | Submits guess            |
| SabotageCard              | Yes           | "Sabotage attempt"             | Must match guesser connection | Attempts sabotage        |
| WaitingWord/Clue/Connects | No            | -                              | -                             | -                        |
| VolunteerCard             | No            | -                              | -                             | Volunteers as clue giver |
| FinalRoundCard            | No            | -                              | -                             | Transitions to sabotage  |
| GameEndedCard             | No            | -                              | -                             | Play again / leave       |
| HistoryCard               | No            | -                              | -                             | Close history            |
| ActionsCard               | No            | -                              | -                             | Menu actions             |

### Card Navigation Flow

```
Lobby → Game Start
  ↓
WordSettingCard (Setter) / WaitingWordCard (Guessers)
  ↓ (Word set, blocks animate in)
ClueInputCard (Clue Giver) / WaitingClueCard (Others) / VolunteerCard (No CG)
  ↓ (Reference submitted)
ConnectCard (Guessers) / WaitingConnectsCard (Clue Giver) / SabotageCard (Setter)
  ↓ (Guesses collected)
[Evaluate guesses]
  ↓
If not final: Return to ClueInputCard for next round
If final: FinalRoundCard (Setter) → SabotageCard → GameEndedCard
```

### Swipe Navigation

- **Swipe Left:** Access HistoryCard
- **Swipe Right:** Quick actions (if no input required)
- **No Swipe:** When input is active/required

## Component Structure Pattern

All cards follow this interface:

```tsx
interface CardProps {
  // Data from game state
  gameState: GameState;
  currentPlayer: Player;

  // Action callbacks
  onSubmit?: (data: any) => Promise<void>;
  onSecondaryAction?: () => void;

  // Card system props
  isActive: boolean;
  onSwipe?: (direction: "left" | "right") => void;

  // Bottom input integration
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputPlaceholder?: string;
  isInputDisabled?: boolean;

  // Optional metadata
  className?: string;
}
```

## Design Tokens

Cards use consistent design tokens:

### Spacing

- Card padding: `p-6` (24px) or `p-8` (32px) for more spacious cards
- Section gaps: `gap-4` (16px) between major sections
- Element gaps: `gap-2` (8px) between related elements

### Typography

- Title: `text-2xl font-bold` (24px)
- Body: `text-base` (16px)
- Small text: `text-sm` (14px)
- Hint text: `text-xs text-gray-500` (12px)

### Colors

- Primary action: `bg-indigo-600 hover:bg-indigo-700`
- Secondary action: `bg-gray-200 hover:bg-gray-300`
- Success: `bg-green-100 text-green-800`
- Warning: `bg-amber-100 text-amber-800`
- Error: `bg-red-100 text-red-800`

### Shadows

- Card elevation: `shadow-lg` for active, `shadow-md` for stacked
- Hover lift: `hover:shadow-xl transition-shadow`

### Borders

- Card radius: `rounded-3xl` (24px)
- Button radius: `rounded-full` for pills, `rounded-lg` for boxes
- Border color: `border-gray-200`

## Implementation Priority

### Phase 1: Core Game Flow (MVP)

1. WordSettingCard
2. WaitingWordCard
3. ClueInputCard
4. ConnectCard
5. WaitingClueCard
6. WaitingConnectsCard

### Phase 2: Setter Mechanics

7. SabotageCard
8. FinalRoundCard
9. VolunteerCard

### Phase 3: Meta & Polish

10. GameEndedCard
11. HistoryCard
12. ActionsCard
13. ViewReferenceCard (if needed as standalone)

## Testing Scenarios

Each card should be tested for:

1. **Visual regression** - Matches design specs
2. **Responsive behavior** - Adapts to mobile screens (320px-430px)
3. **Input validation** - Proper error states and feedback
4. **Loading states** - Submission in progress
5. **Empty states** - No data scenarios
6. **Accessibility** - Keyboard navigation, ARIA labels, focus management
7. **Animation performance** - 60fps on target devices
8. **State transitions** - Smooth card changes when game state updates

## Accessibility Requirements

All cards must:

- Use semantic HTML (`<header>`, `<main>`, `<form>`, etc.)
- Provide ARIA labels for interactive elements
- Support keyboard navigation (Tab, Enter, Escape)
- Announce state changes to screen readers
- Maintain 4.5:1 contrast ratio for text (WCAG AA)
- Include skip links for lengthy content
- Focus management when card becomes active
