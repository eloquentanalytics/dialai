---
sidebar_position: 9
---

# `evaluateConsensus(sessionId: string): Promise<ConsensusResult>`

Evaluates consensus for all proposals and votes in the session. Called continuously after each proposal and vote—not just once at the end.

Rules:
- **0 proposals**: `{ consensusReached: false }`
- **1+ proposals**: Human votes override; otherwise ahead-by-k (k=1). A single proposal still requires votes to demonstrate support—it does not auto-win.

```typescript
import { evaluateConsensus } from "dialai";

const result = await evaluateConsensus(session.sessionId);
if (result.consensusReached) {
  console.log("Winner:", result.winningProposalId);
}
```
