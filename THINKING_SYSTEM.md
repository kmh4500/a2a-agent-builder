# Logical Thinking System

This document explains the enhanced thinking system that allows agents to build and evolve their knowledge using logical reasoning.

## Overview

The thinking system is inspired by first-order logic (FOL) and uses a **Memory-Prompt-Verifier** architecture to evolve agent knowledge:

1. **Memory**: Stores verified propositions and manages multiple reasoning paths
2. **Prompt**: Generates new propositions based on existing knowledge
3. **Verifier**: Validates logical consistency of new propositions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Thinking Evolution                    │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │   Memory     │◄───────│   Prompt     │
        │              │        │              │
        │ - Stores     │        │ - Generates  │
        │   facts      │        │   new ideas  │
        │ - Manages    │        │ - Creative   │
        │   paths      │        │   reasoning  │
        └──────┬───────┘        └──────────────┘
               │
               │ validates
               ▼
        ┌──────────────┐
        │  Verifier    │
        │              │
        │ - Checks     │
        │   logic      │
        │ - Ensures    │
        │   consistency│
        └──────────────┘
```

## Key Features

### 1. Multi-Path Reasoning

The system can explore multiple reasoning paths simultaneously, allowing agents to consider different perspectives or hypotheses.

```typescript
// Memory maintains multiple paths
{
  paths: [
    {
      id: 'path-1',
      propositions: ['Socrates is human', 'All humans are mortal'],
      confidence: 0.9
    },
    {
      id: 'path-2',
      propositions: ['Socrates is a philosopher', 'Philosophers question mortality'],
      confidence: 0.7
    }
  ]
}
```

### 2. Logical Verification

Before adding new knowledge, the verifier checks:
- **Consistency**: Does it contradict existing facts?
- **Meaningfulness**: Does it add new information?
- **Specificity**: Is it concrete enough to be useful?

### 3. Automatic Evolution

The system can automatically evolve thinking during conversations:
- Triggers after 6+ messages on a specific topic
- Runs in the background (non-blocking)
- Adds verified propositions to the agent's knowledge base

## Usage

### Automatic Evolution (Recommended)

The system automatically evolves thinking during conversations. No manual intervention needed!

```typescript
// Automatically triggered in route.ts:175
// When conversation reaches 6+ messages on a specific intent
autoEvolveAfterConversation(agentId, intent, conversationHistory);
```

### Manual Evolution via API

You can manually trigger thinking evolution:

```bash
# Evolve thinking about a specific topic
curl -X POST http://localhost:3000/api/agents/my-agent/evolve-thinking \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "blockchain",
    "conversationContext": "user: What is blockchain?\nagent: Blockchain is a distributed ledger...",
    "cycles": 2
  }'

# Get thinking summary
curl http://localhost:3000/api/agents/my-agent/evolve-thinking?intent=blockchain
```

### Programmatic Usage

```typescript
import { evolveThinking } from '@/lib/thinkingEvolution';
import { LogicalReasoningEngine } from '@/lib/logicalReasoning';

// Evolve agent thinking
const result = await evolveThinking({
  agentId: 'my-agent',
  intent: 'web3',
  conversationContext: 'Recent conversation about Web3...',
  cycles: 3
});

console.log(`Added ${result.factsAdded} new facts`);
console.log('New knowledge:', result.newThinking);

// Or use the engine directly
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const engine = new LogicalReasoningEngine(
  model,
  'Initial knowledge here',
  'Domain context'
);

const newKnowledge = await engine.evolve('topic_name', 3);
```

## Example: Socratic Learning

Here's how the system evolves knowledge about "Socrates":

### Initial State
```
(empty)
```

### After Cycle 1
```
Socrates was an ancient Greek philosopher
He developed the Socratic method of questioning
```

### After Cycle 2
```
Socrates was an ancient Greek philosopher
He developed the Socratic method of questioning
The Socratic method helps students learn through guided questions
This technique is still used in modern education
```

### After Cycle 3
```
Socrates was an ancient Greek philosopher
He developed the Socratic method of questioning
The Socratic method helps students learn through guided questions
This technique is still used in modern education
By asking questions, Socrates revealed contradictions in people's thinking
He believed that recognizing ignorance is the first step to wisdom
```

## Configuration

### Memory Settings

```typescript
class ThinkingMemory {
  constructor(
    initialProposition?: string,
    maxPaths: number = 3  // Maximum reasoning paths
  )
}
```

### Evolution Settings

```typescript
interface ThinkingEvolutionConfig {
  agentId: string;
  intent: string;
  conversationContext?: string;
  cycles?: number;         // Default: 2
  modelName?: string;      // Default: 'gemini-2.5-flash'
}
```

## How It Works

### Step 1: Initialize Memory

When first encountering a topic, the system creates an initial proposition:

```typescript
// In thinkingEvolution.ts:67
const initialProp = await prompt.generateInitialProposition(intent, conversationContext);
memory.addVerifiedFact(initialProp);
```

### Step 2: Generate Propositions

The Prompt class generates 2-3 new propositions based on existing knowledge:

```typescript
// In logicalReasoning.ts:142
const candidates = await prompt.generateNextPropositions(context, intent);
// Returns: ["New proposition 1", "New proposition 2", "New proposition 3"]
```

### Step 3: Verify Logic

The Verifier checks each proposition:

```typescript
// In logicalReasoning.ts:286
const verification = await verifier.verify(context, candidate);
// Returns: { valid: true/false, confidence: 0.0-1.0, reason: "..." }
```

### Step 4: Update Memory

Valid propositions are added to the shared knowledge base:

```typescript
if (verification.valid) {
  memory.addVerifiedFact(candidate, verification.confidence);
}
```

## Benefits

1. **Structured Learning**: Agents build knowledge systematically, not randomly
2. **Logical Consistency**: Prevents contradictions in agent knowledge
3. **Transparency**: Each fact is traceable and verifiable
4. **Scalability**: Can handle multiple topics independently
5. **Automatic Growth**: Knowledge evolves naturally through conversation

## Integration with Intent System

The thinking system integrates seamlessly with the intent classification system:

```typescript
// route.ts:96
intent = await classifyIntent(agentId, conversationText, modelName, previousIntent);
thinking = await getThinkingMemory(agentId, intent);

// System prompt includes thinking
const systemPrompt = buildSystemPrompt(intent, thinking, caring);
```

Each intent has its own knowledge base, allowing agents to be experts in multiple domains.

## Performance Considerations

- **Automatic evolution runs in background**: Doesn't block conversation responses
- **Limited cycles**: Default is 1-2 cycles to prevent excessive API calls
- **Cached facts**: Verified facts are reused across conversations
- **Lazy initialization**: Engine only runs when needed

## Debugging

Enable detailed logging:

```typescript
// In logicalReasoning.ts
console.log('🧠 [ThinkingMemory] New verified fact...');
console.log('💡 [ReasoningPrompt] Generating propositions...');
console.log('🛡️ [LogicalVerifier] Verifying...');
console.log('🌀 [ReasoningEngine] Running cycle...');
```

Look for these emoji prefixes in your logs to track the reasoning process.

## Future Enhancements

Potential improvements:
- **Cross-intent learning**: Find connections between different topics
- **Confidence decay**: Old facts lose confidence over time
- **Fact pruning**: Remove redundant or obsolete propositions
- **Interactive verification**: Ask user to confirm uncertain propositions
- **Visualization**: Display reasoning paths in UI

## Related Files

- `src/lib/logicalReasoning.ts` - Core reasoning engine
- `src/lib/thinkingEvolution.ts` - Integration layer
- `src/app/api/agents/[agentId]/[[...path]]/route.ts:175` - Auto-evolution trigger
- `src/app/api/agents/[agentId]/evolve-thinking/route.ts` - Manual API endpoint
