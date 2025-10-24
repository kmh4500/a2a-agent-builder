import { getAgent, setAgent } from './agentStore';
import type { IntentMemory } from './agentStore';
import { callLLM } from './llmManager';

// Try to match intent from stored patterns first
async function matchIntentFromPatterns(
  agentId: string,
  conversationText: string
): Promise<string | null> {
  const agent = await getAgent(agentId);
  const intentPatterns = agent?.intentPatterns || {};

  // Get the last user message only (most recent)
  const lines = conversationText.trim().split('\n');
  const lastUserMessage = lines.reverse().find(line => line.startsWith('user:'));

  if (!lastUserMessage) {
    return null;
  }

  const lastMessageText = lastUserMessage.toLowerCase();

  // Try to match keywords in the latest user message
  for (const [intent, keywords] of Object.entries(intentPatterns)) {
    for (const keyword of keywords) {
      if (lastMessageText.includes(keyword.toLowerCase())) {
        console.log(`🎯 Pattern matched: "${keyword}" -> "${intent}"`);
        return intent;
      }
    }
  }

  return null;
}

// Save new pattern after Gemini classification
async function saveIntentPattern(
  agentId: string,
  intent: string,
  keywords: string[]
): Promise<void> {
  const agent = await getAgent(agentId);
  if (!agent) return;

  const intentPatterns = agent.intentPatterns || {};

  // Merge new keywords with existing ones
  const existingKeywords = intentPatterns[intent] || [];
  const allKeywords = Array.from(new Set([...existingKeywords, ...keywords]));

  intentPatterns[intent] = allKeywords;

  await setAgent(agentId, {
    ...agent,
    intentPatterns
  });

  console.log(`💾 Saved patterns for "${intent}":`, allKeywords);
}

export async function classifyIntent(
  agentId: string,
  conversationText: string,
  previousIntent?: string
): Promise<string> {
  // Step 1: Try pattern matching first
  const matchedIntent = await matchIntentFromPatterns(agentId, conversationText);
  if (matchedIntent) {
    return matchedIntent;
  }

  // Step 2: No match found, call LLM
  console.log('📞 No pattern match - calling LLM for intent classification');

  const previousIntentContext = previousIntent
    ? `\nPrevious intent: ${previousIntent}`
    : '';

  const systemPrompt = `You are an intent classification expert. Identify the MOST SPECIFIC named entity or concept in conversations and provide keywords to identify them in the future.

Be as specific as possible:
- Use actual names: "yi_sun_sin" NOT "historical_figure"
- Use specific tech: "react" NOT "frontend"
- Use company names: "tesla" NOT "ev_company"
- Use person names: "elon_musk" NOT "entrepreneur"

Format: 1-2 words, lowercase, underscore for spaces.
Keep the intent same as the previous one if the conversation flow hasn't changed.${previousIntentContext}

Respond in this exact format:
INTENT: [the most specific entity/concept]
KEYWORDS: [comma-separated list of keywords in multiple languages that identify this intent]

Example:
INTENT: yi_sun_sin
KEYWORDS: 이순신, yi_sun_sin, admiral, 충무공, 장군, turtle ship`;

  const userPrompt = `Conversation:
${conversationText}`;

  const response = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);

  // Parse response
  const intentMatch = response.match(/INTENT:\s*(.+?)(?=\n|$)/);
  const keywordsMatch = response.match(/KEYWORDS:\s*(.+?)$/s);

  if (!intentMatch) {
    console.error('❌ Failed to parse intent from response:', response);
    return 'general';
  }

  const intent = intentMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
  const keywords: string[] = [];

  if (keywordsMatch) {
    const keywordString = keywordsMatch[1].trim();
    const parsedKeywords = keywordString.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    keywords.push(...parsedKeywords);
    console.log(`📝 LLM provided keywords:`, parsedKeywords);
  }

  // Step 3: Save the new pattern for future use
  await saveIntentPattern(agentId, intent, keywords);

  return intent;
}

export async function getIntentMemory(
  agentId: string,
  intent: string
): Promise<IntentMemory> {
  const agent = await getAgent(agentId);
  const memories = agent?.memories || {};
  return memories[intent] || { thinking: '(empty)', caring: '(empty)' };
}

export async function getThinkingMemory(
  agentId: string,
  intent: string
): Promise<string> {
  const agent = await getAgent(agentId);
  const thinkingMemories = agent?.thinkingMemories || {};
  return thinkingMemories[intent] || '(empty)';
}

export async function getUserCaring(
  agentId: string,
  username: string
): Promise<string> {
  const agent = await getAgent(agentId);
  const caringMemories = agent?.caringMemories || {};
  return caringMemories[username] || '(empty)';
}

export async function getLastIntent(agentId: string): Promise<string | undefined> {
  const agent = await getAgent(agentId);

  // Try new structure first
  const thinkingMemories = agent?.thinkingMemories || {};
  const thinkingIntents = Object.keys(thinkingMemories);
  if (thinkingIntents.length > 0) {
    return thinkingIntents[thinkingIntents.length - 1];
  }

  // Fallback to legacy structure
  const memories = agent?.memories || {};
  const intents = Object.keys(memories);
  return intents.length > 0 ? intents[intents.length - 1] : undefined;
}
