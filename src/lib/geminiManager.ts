import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Centralized Gemini API Manager
 *
 * Manages all Gemini API calls with priority queuing and rate limiting:
 * - HIGH priority: User-facing responses (immediate execution)
 * - LOW priority: Background tasks (rate limited to 3 calls per minute)
 */

export enum CallPriority {
  HIGH = 'HIGH', // User responses - immediate
  LOW = 'LOW'    // Background tasks - rate limited
}

interface GeminiCall {
  id: string;
  priority: CallPriority;
  prompt: string;
  modelName: string;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class GeminiAPIManager {
  private static instance: GeminiAPIManager;
  private genAI: GoogleGenerativeAI;
  private queue: GeminiCall[] = [];
  private processing = false;

  // Rate limiting for LOW priority calls
  private lowPriorityCallTimes: number[] = [];
  private readonly MAX_LOW_PRIORITY_CALLS_PER_MINUTE = 3;
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

  private constructor() {
    this.genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
    );
  }

  public static getInstance(): GeminiAPIManager {
    if (!GeminiAPIManager.instance) {
      GeminiAPIManager.instance = new GeminiAPIManager();
    }
    return GeminiAPIManager.instance;
  }

  /**
   * Call Gemini API with priority
   */
  async call(
    prompt: string,
    modelName: string,
    priority: CallPriority = CallPriority.LOW
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const call: GeminiCall = {
        id: `${Date.now()}-${Math.random()}`,
        priority,
        prompt,
        modelName,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Add to queue
      this.queue.push(call);

      // Sort queue by priority (HIGH first)
      this.queue.sort((a, b) => {
        if (a.priority === b.priority) return a.timestamp - b.timestamp;
        return a.priority === CallPriority.HIGH ? -1 : 1;
      });

      console.log(`📋 [GeminiManager] Queued ${priority} priority call (queue size: ${this.queue.length})`);

      // Start processing if not already
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const call = this.queue[0];

      if (call.priority === CallPriority.HIGH) {
        // HIGH priority: execute immediately
        console.log(`⚡ [GeminiManager] Executing HIGH priority call immediately`);
        this.queue.shift();
        await this.executeCall(call);
      } else {
        // LOW priority: check rate limit
        if (this.canExecuteLowPriorityCall()) {
          console.log(`🔄 [GeminiManager] Executing LOW priority call`);
          this.queue.shift();
          this.recordLowPriorityCall();
          await this.executeCall(call);
        } else {
          // Rate limit hit, schedule retry and exit
          const waitTime = this.getWaitTimeForLowPriority();
          console.log(`⏳ [GeminiManager] Rate limit reached. Scheduling retry in ${Math.ceil(waitTime / 1000)}s (${this.queue.length} in queue)`);

          this.processing = false;

          // Schedule next processing attempt without blocking
          setTimeout(() => {
            this.processQueue();
          }, waitTime);

          return; // Exit without blocking
        }
      }
    }

    this.processing = false;
  }

  /**
   * Execute a single Gemini call
   */
  private async executeCall(call: GeminiCall) {
    try {
      const model = this.genAI.getGenerativeModel({ model: call.modelName });
      const result = await model.generateContent(call.prompt);
      const response = await result.response;
      const text = response.text();

      console.log(`✅ [GeminiManager] ${call.priority} call completed (${text.length} chars)`);
      call.resolve(text);
    } catch (error) {
      console.error(`❌ [GeminiManager] ${call.priority} call failed:`, error);
      call.reject(error as Error);
    }
  }

  /**
   * Check if we can execute a LOW priority call
   */
  private canExecuteLowPriorityCall(): boolean {
    this.cleanupOldCallTimes();
    return this.lowPriorityCallTimes.length < this.MAX_LOW_PRIORITY_CALLS_PER_MINUTE;
  }

  /**
   * Record a LOW priority call execution
   */
  private recordLowPriorityCall() {
    this.lowPriorityCallTimes.push(Date.now());
  }

  /**
   * Remove call times older than the rate limit window
   */
  private cleanupOldCallTimes() {
    const now = Date.now();
    this.lowPriorityCallTimes = this.lowPriorityCallTimes.filter(
      time => now - time < this.RATE_LIMIT_WINDOW_MS
    );
  }

  /**
   * Get wait time before next LOW priority call can execute
   */
  private getWaitTimeForLowPriority(): number {
    if (this.lowPriorityCallTimes.length === 0) return 0;

    const oldestCallTime = Math.min(...this.lowPriorityCallTimes);
    const timeSinceOldest = Date.now() - oldestCallTime;
    const waitTime = this.RATE_LIMIT_WINDOW_MS - timeSinceOldest;

    return Math.max(waitTime, 1000); // Minimum 1 second
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      highPriorityCount: this.queue.filter(c => c.priority === CallPriority.HIGH).length,
      lowPriorityCount: this.queue.filter(c => c.priority === CallPriority.LOW).length,
      recentLowPriorityCalls: this.lowPriorityCallTimes.length,
      maxLowPriorityCalls: this.MAX_LOW_PRIORITY_CALLS_PER_MINUTE
    };
  }
}

// Export singleton instance
export const geminiManager = GeminiAPIManager.getInstance();

// Export helper function
export async function callGemini(
  prompt: string,
  modelName: string = 'gemini-2.5-flash',
  priority: CallPriority = CallPriority.LOW
): Promise<string> {
  return geminiManager.call(prompt, modelName, priority);
}
