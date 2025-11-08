export type ReferenceStatus = "pending" | "resolved" | "failed";

export interface ReferenceEntry extends Reference {
status: ReferenceStatus;
resolvedAt?: Date | Timestamp | FieldValue;
}

export interface ReferenceState {
order: string[]; // insertion order
itemsById: Record<string, ReferenceEntry>;
activeIndex: number | null; // deterministic pointer for round_robin
}
// ...existing code...
export interface GameState {
// ...existing code...
referenceState: ReferenceState;
// ...existing code...
}
// ...existing code...
export interface FirestoreGameRoom {
// ...existing code...
referenceState?: {
order: string[];
activeIndex: number | null;
itemsById: Record<string, ReferenceEntryFirestore>;
};
// ...existing code...
}

Mode behaviors
Round robin

On reference creation: generate refId, push to referenceState.order via arrayUnion, set itemsById[refId], advance activeIndex to order.length-1.
Resolution sets itemsById[refId].status, keeps history; next round picks (activeIndex+1) % guesserCount, writes new reference with that clue giver.
activeIndex is single source for “current”; UI derives active record by order[activeIndex].
Signull

Keep activeIndex = null.
Any guesser may create reference: append id, mark status "pending". No turn rotation needed.
Connect submissions target itemsById[refId] directly (chosen from UI).
Resolution flips status per id; optional cleanup moves resolved ids to archive array or leaves in place for history.
Persistence pattern
Use transactions to:
arrayUnion(refId) on referenceState.order.
updateDoc paths like referenceState.itemsById.${refId} for idempotent writes.
Update referenceState.activeIndex in same transaction (round robin only).
Resolution transaction updates itemsById.${refId}.status, stamps resolvedAt, queues history entries, adjusts revealedCount/gamePhase.
Client logic
Selector selectActiveReference:
If playMode==="round_robin" → read referenceState.order[activeIndex].
If signull → surface itemsById filtered by status==="pending".
Submission flows receive refId parameter (UI passes active one for round robin, chosen one for signull).
Rendering past references uses referenceState.order for deterministic ordering in both modes.
Benefits
Unified structure keeps deterministic order, easy archival, stable ids for transactions, works for both play modes without special cases besides pointer logic.

Phase 1 – Schema + Types
Extend GameSettings with playMode: "round_robin" | "signull".
Introduce ReferenceStatus, ReferenceEntry, ReferenceState (order/itemsById/activeIndex) replacing currentReference in GameState and Firestore types.
Define Firestore-serializable variants (timestamps allowed) for new reference entry structure.
Phase 2 – Backend behaviors
Update room creation/defaults: initialize referenceState (empty order/itemsById, activeIndex depending on mode).
Round robin flow:
On reference creation: append id, insert entry, advance activeIndex via transaction.
Resolution logic: read via activeIndex, update status, rotate pointer, leave history intact.
Signull flow:
Allow any guesser to create reference (transactional append + entry insert).
Connect/resolve ops target specific refId, set status per id, no turn rotation.
Adjust persistence to use arrayUnion for order and deep updates for itemsById.<refId> inside transactions.
Phase 3 – Client selectors + UI hooks
Replace currentReference usages with selectors reading referenceState.
Round robin UI: derive active ref via order[activeIndex], block creation to active clue giver only.
Signull UI: surface pending refs list, allow choose target on connect submit.
Ensure history views use order for deterministic ordering and show status badges.
