---
sidebar_position: 1
---

# State Machines

State machines define the structure of your sessions. Each session type has its own state machine definition.

## Defining a State Machine

A state machine defines:

- Default state
- All possible states
- Transitions between states
- Decision prompts for each state
- Risk dial settings

## Example

```typescript
import { defineStateMachine } from "dialai";

const myStateMachine = defineStateMachine({
  sessionTypeName: "my-task",
  defaultState: "idle",
  states: {
    idle: {
      prompt: "The system is idle. What should happen next?",
      transitions: ["start", "configure"]
    },
    working: {
      prompt: "The system is working. Should it continue or stop?",
      transitions: ["continue", "stop"],
      riskDial: 0.5
    },
    done: {
      prompt: "The task is complete.",
      transitions: ["reset"]
    }
  }
});
```

## Decision Prompts

Each state carries a prompt describing how to decide what to do next. This ensures consistency because everyone's reasoning is based on the same instructions.

## Risk Dial

The risk dial is a state-level configuration that represents a confidence threshold for when the system is allowed to take a fast lane through the decision cycle.
