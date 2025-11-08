# Phase 1 Implementation - Reference Revamp

## Completed: Schema + Types

### Summary

Phase 1 establishes the foundational type system for the new reference management architecture that supports both `round_robin` and `signull` play modes.

## Changes Made

### 1. New Type Definitions (types.ts)

#### Added Core Types:

- **`PlayMode`**: `"round_robin" | "signull"` - Defines the two supported play modes
- **`ReferenceStatus`**: `"pending" | "resolved" | "failed"` - Tracks reference lifecycle state

#### Updated Interfaces:

**`GameSettings`**

- Added `playMode: PlayMode` field to support mode selection

**`ReferenceEntry`** (NEW)

- Extends `Reference` interface
- Adds `status: ReferenceStatus` for tracking reference state
- Adds optional `resolvedAt?: Date | Timestamp | FieldValue` for resolution timestamp

**`ReferenceState`** (NEW)

- Core unified reference management structure
- `order: string[]` - Maintains insertion order of reference IDs
- `itemsById: Record<string, ReferenceEntry>` - Map of reference entries by ID
- `activeIndex: number | null` - Pointer for round_robin (null for signull)

**`GameState`**

- Kept `currentReference: Reference | null` (marked as DEPRECATED)
- Added `referenceState: ReferenceState` - New unified reference management

### 2. Firestore-Compatible Types

**`FirestoreReferenceEntry`** (NEW)

- Firestore-serializable version of `ReferenceEntry`
- Uses `Timestamp | FieldValue` for date fields
- Includes all fields from `Reference` plus `status` and `resolvedAt`

**`FirestoreReferenceState`** (NEW)

- Firestore-serializable version of `ReferenceState`
- Structure mirrors client-side `ReferenceState`
- Uses `FirestoreReferenceEntry` for `itemsById` values

**`FirestoreGameRoom`**

- Kept `currentReference` (marked as DEPRECATED)
- Added optional `referenceState?: FirestoreReferenceState` for backward compatibility
- Updated `settings` to include optional `playMode?: PlayMode`

## Design Decisions

### Backward Compatibility

- Both `currentReference` and `referenceState` exist during transition
- Old fields marked as DEPRECATED
- Firestore fields made optional to support existing rooms
- Allows gradual migration without breaking existing games

### Type Safety

- Separate client (`ReferenceState`) and Firestore (`FirestoreReferenceState`) types
- Explicit handling of Firestore timestamp types
- Strong typing for status transitions

### Play Mode Support

- `activeIndex` allows both modes: number for round_robin, null for signull
- `order` array provides deterministic ordering for both modes
- `itemsById` enables efficient lookups and updates

## Next Steps (Phase 2)

Phase 2 will implement:

1. Room creation with `referenceState` initialization
2. Reference creation and management for both modes
3. Transaction-based updates using new structure
4. Resolution logic for both play modes
5. Migration utilities for existing rooms

## Technical Notes

### Round Robin Behavior

- `activeIndex` points to current reference in `order` array
- Single active reference at a time
- Pointer advances on resolution

### Signull Behavior

- `activeIndex` remains null
- Multiple pending references possible
- Players choose which reference to connect to
- No automatic turn rotation

## Files Modified

- `/frontend/src/lib/types.ts` - Core type definitions updated
