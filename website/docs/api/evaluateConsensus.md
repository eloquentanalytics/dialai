---
sidebar_position: 9
---

# `evaluateConsensus(sessionId: string): Promise<ConsensusResult>`

Evaluates consensus for all proposals and votes in the session:
- **0 proposals**: `{ consensusReached: false }`
- **1 proposal**: `{ consensusReached: true, winningProposalId: ... }`
- **2+ proposals**: Human votes override; otherwise ahead-by-k (k=1)

```typescript
import { evaluateConsensus } from "dialai";

const result = await evaluateConsensus(session.sessionId);
if (result.consensusReached) {
  console.log("Winner:", result.winningProposalId);
}
```
