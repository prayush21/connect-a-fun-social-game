# Mutation Core Checklist Spec

Scope: minimal, uniform mutation rules for all interfaces. This is a checklist, not implementation.

Global rules (apply to all mutations)

- Validate room exists; else ROOM_NOT_FOUND.
- Validate player exists when required; else PLAYER_NOT_FOUND.
- Enforce allowed phase; else INVALID_PHASE.
- Enforce role/ownership (setter/guesser/host) explicitly.
- Use transactions for multi-field updates.
- Always set updatedAt.
- Return consistent error codes.

Mutation checklist table

| Mutation                 | Required role             | Allowed phase(s)         | Required checks                              | State updates (must be atomic)                                                                     |
| ------------------------ | ------------------------- | ------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| createRoom               | none (creator)            | n/a                      | validate inputs, display mode handling       | schema defaults, players/host/setter, settings, signullState, scores, timestamps                   |
| joinRoom                 | any                       | lobby, setting, signulls | maxPlayers, host assignment for first player | players, hostId, setterId, updatedAt                                                               |
| leaveRoom                | player                    | any                      | player exists                                | remove player, transfer host/setter, updatedAt                                                     |
| startGame                | host (or setter)          | lobby                    | allowed phase only                           | phase -> setting, updatedAt                                                                        |
| setSecretWord            | setter                    | lobby, setting           | non-empty + basic format                     | secretWord, phase -> signulls, updatedAt                                                           |
| addSignull               | guesser                   | signulls                 | prefix mode rules                            | signullState.itemsById, order, activeIndex, updatedAt                                              |
| submitConnect            | guesser or setter         | signulls                 | no self-connect (guesser), no dup connect    | signull status, revealedCount, activeIndex, scoreEvents, scores, winner/phase, insights, updatedAt |
| submitDirectGuess        | guesser                   | signulls                 | directGuessesLeft > 0                        | directGuessesLeft, lastDirectGuess, scoreEvents, scores, winner/phase, insights, updatedAt         |
| changeSetter             | host                      | lobby, setting           | newSetter exists                             | setterId, roles, updatedAt                                                                         |
| updateGameSettings       | host                      | lobby (or setting)       | whitelist keys                               | settings.\* fields, updatedAt                                                                      |
| endGame                  | host/admin or rule-driven | any                      | winner set                                   | phase -> ended, winner, updatedAt                                                                  |
| playAgain                | host                      | ended                    | none                                         | reset game state, clear insights/events, updatedAt                                                 |
| backToLobby              | host                      | ended                    | resetScores flag                             | reset state, optionally reset scores, updatedAt                                                    |
| resetScoresOnly          | host                      | lobby                    | none                                         | players.\*.score = 0, updatedAt                                                                    |
| setScoreCountingComplete | display host              | ended                    | none                                         | scoreCountingComplete, updatedAt                                                                   |

Notes

- wordValidation is intentionally not enforced (per current intent).
- Error codes should map 1:1 across GUI/CLI.
- If security rules are added later, mirror these checks there.
