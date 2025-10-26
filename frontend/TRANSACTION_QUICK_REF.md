# Transaction Safety Quick Reference

## When to Use Transactions

Use Firestore transactions when:
- ✅ Reading then writing based on that read
- ✅ Multiple clients might modify the same data simultaneously
- ✅ You need atomic updates across multiple fields
- ✅ Correctness is more important than latency

Don't use transactions when:
- ❌ Simple writes with no read dependency
- ❌ Read-only operations
- ❌ Operations that take >500ms
- ❌ Calling external APIs within the transaction

## Basic Transaction Pattern

```typescript
import { runTransaction } from "firebase/firestore";

await runTransaction(getDb(), async (transaction) => {
  // 1. READ: Get current state
  const docSnap = await transaction.get(docRef);
  if (!docSnap.exists()) throw new Error("Document not found");
  
  const data = docSnap.data();
  
  // 2. VALIDATE: Check conditions
  if (!data.isValid) {
    throw new Error("CUSTOM_ERROR:Invalid state");
  }
  
  // 3. COMPUTE: Calculate new state
  const newValue = data.value + 1;
  
  // 4. WRITE: Update atomically
  transaction.update(docRef, {
    value: newValue,
    updatedAt: serverTimestamp(),
  });
});
```

## Error Handling Pattern

```typescript
try {
  await transactionalFunction();
} catch (err) {
  if (err instanceof Error && err.message.includes("CUSTOM_ERROR")) {
    // Handle gracefully
    console.log("Operation not needed, continuing...");
    return;
  }
  // Re-throw unexpected errors
  throw err;
}
```

## Common Pitfalls

### ❌ DON'T: Read outside transaction

```typescript
// BAD - Race condition possible
const docSnap = await getDoc(docRef);
await runTransaction(db, async (transaction) => {
  // Using stale data!
  transaction.update(docRef, { value: docSnap.data().value + 1 });
});
```

### ✅ DO: Read inside transaction

```typescript
// GOOD - Always fresh data
await runTransaction(db, async (transaction) => {
  const docSnap = await transaction.get(docRef);
  transaction.update(docRef, { value: docSnap.data().value + 1 });
});
```

### ❌ DON'T: Nested transactions

```typescript
// BAD - Will fail
await runTransaction(db, async (transaction) => {
  await runTransaction(db, async (innerTransaction) => {
    // NOT ALLOWED
  });
});
```

### ✅ DO: Sequential transactions

```typescript
// GOOD - One at a time
await runTransaction(db, async (transaction) => {
  // First transaction
});

await runTransaction(db, async (transaction) => {
  // Second transaction (separate)
});
```

### ❌ DON'T: External API calls

```typescript
// BAD - Slow, can timeout
await runTransaction(db, async (transaction) => {
  const response = await fetch("https://api.example.com");
  transaction.update(docRef, { data: response.data });
});
```

### ✅ DO: Pre-fetch external data

```typescript
// GOOD - Fast transaction
const response = await fetch("https://api.example.com");
await runTransaction(db, async (transaction) => {
  transaction.update(docRef, { data: response.data });
});
```

## Idempotency Pattern

Always check if the operation already completed:

```typescript
await runTransaction(db, async (transaction) => {
  const docSnap = await transaction.get(docRef);
  const data = docSnap.data();
  
  // Check if already processed
  if (data.processed) {
    return; // Silently succeed (idempotent)
  }
  
  transaction.update(docRef, { processed: true });
});
```

## Debugging Transactions

### Enable Firestore Logs

```typescript
import { setLogLevel } from "firebase/firestore";

// In development
if (process.env.NODE_ENV === "development") {
  setLogLevel("debug");
}
```

### Look for These Patterns

```
✅ Transaction attempt #1
✅ Transaction committed
```

```
⚠️ Transaction attempt #2 (retry due to conflict)
✅ Transaction committed
```

```
❌ Transaction failed after 5 attempts
❌ Too much contention on this document
```

## Performance Tips

1. **Keep transactions fast:** <500ms ideal, <1s maximum
2. **Read minimal data:** Only read documents you'll update
3. **Batch unrelated writes:** Use `writeBatch` for independent updates
4. **Use server timestamps:** Avoid client-side timestamp calculations
5. **Pre-compute values:** Do heavy calculations before transaction

## Testing Transactions

### Manual Test: Concurrent Submissions

```bash
# Terminal 1
curl -X POST /api/submit-guess -d '{"roomId":"ABC123","guess":"apple"}'

# Terminal 2 (run simultaneously)
curl -X POST /api/submit-guess -d '{"roomId":"ABC123","guess":"apple"}'
```

Expected: One succeeds immediately, other retries and may get ROUND_ENDED.

### Automated Test Pattern

```typescript
import { describe, it, expect } from "vitest";

describe("Transaction Safety", () => {
  it("handles concurrent updates", async () => {
    // Arrange: Create test room
    const roomId = await createTestRoom();
    
    // Act: Submit 3 guesses simultaneously
    const promises = [
      submitGuess(roomId, "player1", "apple"),
      submitGuess(roomId, "player2", "apple"),
      submitGuess(roomId, "player3", "apple"),
    ];
    
    await Promise.allSettled(promises);
    
    // Assert: All guesses recorded, no duplicates
    const room = await getRoom(roomId);
    expect(Object.keys(room.guesses).length).toBe(3);
  });
});
```

## Checklist for New Transactional Operations

- [ ] Read all needed data inside transaction
- [ ] Validate state before writing
- [ ] Handle "operation already completed" case (idempotency)
- [ ] Keep transaction logic fast (<500ms)
- [ ] Use `transaction.get()` not `getDoc()`
- [ ] Use `transaction.update()` not `updateDoc()`
- [ ] No external API calls inside transaction
- [ ] No nested transactions
- [ ] Add error handling in caller
- [ ] Test with concurrent submissions
- [ ] Check Firestore logs for retries

## Quick Reference: Function Signatures

```typescript
// Transaction function
runTransaction<T>(
  firestore: Firestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T>

// Transaction methods
transaction.get(docRef: DocumentReference): Promise<DocumentSnapshot>
transaction.update(docRef: DocumentReference, data: object): Transaction
transaction.set(docRef: DocumentReference, data: object): Transaction
transaction.delete(docRef: DocumentReference): Transaction
```

## Need Help?

- 📖 [Firestore Transactions Docs](https://firebase.google.com/docs/firestore/manage-data/transactions)
- 📖 [TRANSACTION_SAFETY.md](./TRANSACTION_SAFETY.md) - Full documentation
- 💬 Ask in team chat with example code
- 🐛 Check Firebase Console logs for transaction failures

---

**Remember:** Transactions automatically retry on conflicts. Your code will be called multiple times if there's contention, so avoid side effects inside the transaction function!
