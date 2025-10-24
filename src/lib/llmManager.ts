import { OpenAI } from "openai";

interface LLMConfig {
  apiUrl: string;
  modelName: string;
}

class LLMManager {
  private static instance: LLMManager;
  private client: OpenAI | null = null;
  private config: LLMConfig;

  private constructor() {
    const apiUrl = process.env.LLM_API_URL || "";
    const modelName = process.env.LLM_MODEL || "";

    if (!apiUrl || !modelName) {
      console.warn("LLM API credentials not configured. LLM will not be available.");
    }

    this.config = {
      apiUrl,
      modelName
    };

    // Disable TLS verification if specified (for self-signed certificates)
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  public static getInstance(): LLMManager {
    if (!LLMManager.instance) {
      LLMManager.instance = new LLMManager();
    }
    return LLMManager.instance;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const { apiUrl, modelName } = this.config;

      if (!apiUrl || !modelName) {
        throw new Error("LLM API credentials are not configured. Please set LLM_API_URL and LLM_MODEL environment variables.");
      }

      // Extract base URL (remove /chat/completions if present)
      const baseURL = apiUrl.replace(/\/chat\/completions$/, '');

      this.client = new OpenAI({
        baseURL,
        apiKey: 'dummy-key', // Some servers don't require a real API key
      });
    }
    return this.client;
  }

  public async generateChatResponse(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    maxTokens: number = 16384
  ): Promise<string> {
    try {
      const client = this.getClient();

      const response = await client.chat.completions.create({
        messages,
        max_tokens: maxTokens,
        model: this.config.modelName
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in LLM response");
      }

      return content;
    } catch (error) {
      console.error("Error calling LLM:", error);
      throw error;
    }
  }

  public isConfigured(): boolean {
    return !!(this.config.apiUrl && this.config.modelName);
  }

  public getModelName(): string {
    return this.config.modelName;
  }
}

// Export singleton instance
export const llmManager = LLMManager.getInstance();

// Export convenience function
export async function callLLM(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens?: number
): Promise<string> {
  return llmManager.generateChatResponse(messages, maxTokens);
}
