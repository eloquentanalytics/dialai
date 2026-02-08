---
sidebar_position: 10
---

# Roadmap

This roadmap captures recommendations from research on making libraries easier for agents to use. Items are organized by their complexity-to-value tradeoff: high-value, low-complexity items first.

## High Value, Low Complexity

### Verbose Error Messages with Recovery Instructions

**Status**: Partially implemented

Every error should include a plain-English explanation and at least one suggested fix. Research shows that chatty text errors drive faster agent recovery than terse codes alone.

> "While JSON structure is fine for machines, a plain-English 'message' field often helps an LLM more than a perfectly terse schema." — [Stytch](https://stytch.com/blog/if-an-ai-agent-can-'t-figure-out-how-your-api-works-neither-can-your-users/)

**Current state**: DIAL errors include codes and messages. Some errors include recovery suggestions.

**Gap**: Not all error paths include actionable recovery instructions. Need systematic audit.

### OpenAPI Schema for HTTP Transport

**Status**: Not implemented

Publish an OpenAPI 3.1 schema for the HTTP transport endpoints. Agents using structured tool calling can directly ingest the schema.

> "When creating action groups for agents, you must define the parameters using an OpenAPI schema in JSON or YAML format." — [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-api-schema.html)

**Value**: Enables automatic tool generation for frameworks like Amazon Bedrock, LangChain, and others that consume OpenAPI.

### Document All Error Codes Exhaustively

**Status**: Not implemented

Create a reference page listing every error code, what triggers it, and how to fix it. Agents need this to fail forward instead of stalling.

> "Every error an endpoint can throw should be documented, listing the code, triggering conditions, and at least one fix." — [Stytch](https://stytch.com/blog/if-an-ai-agent-can-'t-figure-out-how-your-api-works-neither-can-your-users/)

## High Value, Medium Complexity

### Bulk Operations for Sessions

**Status**: Not implemented

Add batch endpoints for common operations: create multiple sessions, solicit proposals from all proposers, collect all votes in one call.

> "Wrapping bulk APIs over single-entity APIs enables LLM/agent efficiency, preserves backward compatibility, and keeps systems secure and extensible." — [Stytch](https://stytch.com/blog/if-an-ai-agent-can-'t-figure-out-how-your-api-works-neither-can-your-users/)

**Current state**: Each operation is a single call. Running 10 proposals requires 10 API calls.

**Gap**: For multi-agent scenarios, this creates unnecessary round-trips.

### Rich Tool Descriptors for MCP

**Status**: Partially implemented

Enhance MCP tool schemas with detailed parameter descriptions, expected outcomes, and potential side effects.

> "The March 2025 MCP specification update introduced richer tool descriptors, allowing servers to provide more detailed metadata about tool parameters, expected outcomes, and potential side effects." — [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/)

**Current state**: MCP tools have basic descriptions.

**Gap**: Missing detailed parameter documentation, outcome descriptions, and side effect warnings.

### llms.txt MCP Integration

**Status**: Not implemented

Create an MCP server that serves llms.txt content on demand, allowing agents to fetch relevant documentation sections as needed.

> "LLMTEXT, an open source toolkit, helps developers create, validate, and use llms.txt files—making any website instantly accessible to AI agents through standardized markdown documentation and MCP servers." — [Parallel.ai](https://parallel.ai/blog/LLMTEXT-for-llmstxt)

**Value**: Agents can load documentation into context window on demand rather than pre-loading everything.

## Medium Value, Low Complexity

### Examples in Every Error Message

**Status**: Not implemented

Include a valid example alongside each error message showing the correct format.

**Current state**: Errors describe what's wrong.

**Gap**: Errors don't show what right looks like.

### Tool Count Optimization

**Status**: Implemented (good state)

Keep the number of tools small and focused. DIAL exposes 11 tools, each with a single purpose.

> "Fewer, well-designed tools often outperform many granular ones, especially for agents with small context windows or tight latency budgets." — [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/)

**Current state**: DIAL already follows this principle. No action needed.

### Machine Definition Validation Endpoint

**Status**: Not implemented

Add a `validateMachine` tool/endpoint that checks a machine definition for errors before creating a session.

**Value**: Fail fast before execution. Agents can iterate on definitions without wasting cycles.

## Medium Value, Medium Complexity

### Reflection/Self-Correction Patterns Documentation

**Status**: Not implemented

Document how to build self-correcting agents using DIAL, where a specialist evaluates its own output and refines it.

> "The Evaluator-Optimizer pattern uses a self-correction loop where a second LLM step acts as a reflector or evaluator, critiquing the initial output." — [AIMultiple Research](https://research.aimultiple.com/agentic-ai-design-patterns/)

**Value**: Guidance for building more robust specialist implementations.

### Streaming Responses for Long Operations

**Status**: Partially implemented (SSE transport exists)

Expose streaming for operations that may take time, such as consensus evaluation with many specialists.

**Current state**: SSE transport exists for HTTP but not all operations stream progress.

**Gap**: Long-running operations should emit progress events.

## Medium Value, High Complexity

### Agent-to-Agent (A2A) Protocol Support

**Status**: Not implemented

Implement the emerging A2A protocol for multi-agent communication, allowing DIAL specialists to communicate directly.

> "In multi-agent systems, agents communicate using Agent-to-Agent (A2A) protocols that define the flow of information between them." — [AIMultiple Research](https://research.aimultiple.com/agentic-ai-design-patterns/)

**Complexity**: Requires protocol implementation, security model, message routing.

**Value**: Native support for complex multi-agent workflows.

### OAuth 2.1 Authorization

**Status**: Not implemented

Replace simple token auth with OAuth 2.1 for production deployments.

> "The March 2025 update to the MCP specification formally recommends OAuth 2.1 as the primary mechanism for authorization." — [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/)

**Complexity**: OAuth flows, token management, refresh handling.

**Value**: Enterprise-grade security, standardized auth for MCP ecosystem.

### Code Execution for Tool Composition

**Status**: Not implemented

Allow agents to write code that composes DIAL tools rather than calling each tool individually.

> "Code execution with MCP enables agents to use context more efficiently by loading tools on demand, filtering data before it reaches the model, and executing complex logic in a single step." — [Anthropic Engineering](https://www.anthropic.com/engineering/code-execution-with-mcp)

**Complexity**: Sandboxed execution environment, security model.

**Value**: Dramatically reduces context usage for complex operations.

## Low Value, Low Complexity

### Semantic Versioning in Responses

**Status**: Not implemented

Include the DIAL version in API responses so agents know what spec they're working with.

**Current state**: Version is in VERSION.md but not in API responses.

**Gap**: Agents must read a separate file to know the version.

### Health Check Endpoint

**Status**: Not implemented

Add a `/health` endpoint for the HTTP transport that returns server status.

**Value**: Standard infrastructure pattern. Low effort.

## Contributing

If you're implementing any of these items, please:

1. Update this document to reflect the new status
2. Add documentation following the [spec change workflow](./agent-experience.md#spec-change-workflow)
3. Write changelogs as instructions to agents

## Sources

Research informing this roadmap:

- [7 Practical Guidelines for Designing AI-Friendly APIs](https://medium.com/@chipiga86/7-practical-guidelines-for-designing-ai-friendly-apis-c5527f6869e6)
- [If an AI agent can't figure out how your API works, neither can your users](https://stytch.com/blog/if-an-ai-agent-can-'t-figure-out-how-your-api-works-neither-can-your-users/)
- [MCP Best Practices: Architecture & Implementation Guide](https://modelcontextprotocol.info/docs/best-practices/)
- [Code execution with MCP: building more efficient AI agents](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [The /llms.txt file](https://llmstxt.org/)
- [What is llms.txt?](https://www.gitbook.com/blog/what-is-llms-txt)
- [4 Agentic AI Design Patterns & Real-World Examples](https://research.aimultiple.com/agentic-ai-design-patterns/)
- [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18)
- [OpenAPI Specification](https://swagger.io/specification/)
