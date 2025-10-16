import { AzureOpenAI } from "openai";

interface GPT5Config {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
  modelName: string;
}

class GPT5Manager {
  private static instance: GPT5Manager;
  private client: AzureOpenAI | null = null;
  private config: GPT5Config;

  private constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
    const apiKey = process.env.AZURE_OPENAI_KEY || "";

    if (!endpoint || !apiKey) {
      console.warn("Azure OpenAI credentials not configured. GPT-5 will not be available.");
    }

    this.config = {
      endpoint,
      apiKey,
      deployment: "gpt-5-ainspace",
      apiVersion: "2024-12-01-preview",
      modelName: "gpt-5"
    };
  }

  public static getInstance(): GPT5Manager {
    if (!GPT5Manager.instance) {
      GPT5Manager.instance = new GPT5Manager();
    }
    return GPT5Manager.instance;
  }

  private getClient(): AzureOpenAI {
    if (!this.client) {
      const { endpoint, apiKey, deployment, apiVersion } = this.config;

      if (!endpoint || !apiKey) {
        throw new Error("Azure OpenAI credentials are not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY environment variables.");
      }

      this.client = new AzureOpenAI({
        endpoint,
        apiKey,
        deployment,
        apiVersion
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
        max_completion_tokens: maxTokens,
        model: this.config.modelName
      });

      if (response?.error !== undefined) {
        throw new Error(`GPT-5 API Error: ${JSON.stringify(response.error)}`);
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in GPT-5 response");
      }

      return content;
    } catch (error) {
      console.error("Error calling GPT-5:", error);
      throw error;
    }
  }

  public isConfigured(): boolean {
    return !!(this.config.endpoint && this.config.apiKey);
  }
}

// Export singleton instance
export const gpt5Manager = GPT5Manager.getInstance();

// Export convenience function
export async function callGPT5(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens?: number
): Promise<string> {
  return gpt5Manager.generateChatResponse(messages, maxTokens);
}
