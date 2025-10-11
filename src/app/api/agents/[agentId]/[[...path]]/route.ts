import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";
import type { AgentCard, Message, JSONRPCErrorResponse, JSONRPCResponse, JSONRPCSuccessResponse } from "@a2a-js/sdk";
import {
    AgentExecutor,
    RequestContext,
    ExecutionEventBus,
    DefaultRequestHandler,
    InMemoryTaskStore,
    JsonRpcTransportHandler,
    A2AError,
} from "@a2a-js/sdk/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getAgent, setAgent, hasAgent, getAllAgents, type StoredAgent } from '@/lib/agentStore';

const AGENT_CARD_PATH = ".well-known/agent.json";

// Define DynamicAgentExecutor class before using it
class DynamicAgentExecutor implements AgentExecutor {
  private static historyStore: Record<string, Message[]> = {};
  private genAI?: GoogleGenerativeAI;
  private model?: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(
    private agentId: string,
    private prompt: string,
    private modelProvider: string,
    private modelName: string
  ) {
    if (this.modelProvider === 'gemini') {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }
  }

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const contextId = requestContext.contextId;
    const key = `${this.agentId}-${contextId}`;
    
    if (!DynamicAgentExecutor.historyStore[key]) {
      DynamicAgentExecutor.historyStore[key] = [];
      // Add initial system prompt
      const initialMessage: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: this.prompt }],
        contextId,
      };
      DynamicAgentExecutor.historyStore[key].push(initialMessage);
    }
    
    const history = DynamicAgentExecutor.historyStore[key];
    const incomingMessage = requestContext.userMessage;
    
    if (incomingMessage) {
      history.push(incomingMessage);
    }

    try {
      if (this.modelProvider === 'gemini' && this.model) {
        // Convert history to Gemini format
        const geminiMessages = history.map(msg => {
          const textPart = msg.parts.find(part => part.kind === "text");
          return {
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: textPart?.text || "" }]
          };
        });

        const result = await this.model.generateContent({
          contents: geminiMessages
        });
        
        const geminiResponse = await result.response;
        const responseText = geminiResponse.text();

        const responseMessage: Message = {
          kind: "message",
          messageId: uuidv4(),
          role: "agent",
          parts: [{ kind: "text", text: responseText }],
          contextId,
        };
        
        history.push(responseMessage);
        eventBus.publish(responseMessage);
      } else {
        const errorMessage: Message = {
          kind: "message",
          messageId: uuidv4(),
          role: "agent",
          parts: [{ kind: "text", text: "This model provider is not implemented yet." }],
          contextId,
        };
        history.push(errorMessage);
        eventBus.publish(errorMessage);
      }
    } catch (error) {
      console.error("Error calling AI model:", error);
      const errorMessage: Message = {
        kind: "message",
        messageId: uuidv4(),
        role: "agent",
        parts: [{ kind: "text", text: "Sorry, I encountered an error while processing your request." }],
        contextId,
      };
      history.push(errorMessage);
      eventBus.publish(errorMessage);
    } finally {
      eventBus.finished();
    }
  }

  cancelTask = async (): Promise<void> => {};
}

// Helper function to ensure agent has runtime handlers
function ensureAgentHandlers(agent: StoredAgent, agentId: string): StoredAgent {
  // If handlers already exist, return as is
  if (agent.executor && agent.requestHandler && agent.transportHandler) {
    return agent;
  }

  // Recreate handlers from stored data
  const executor = new DynamicAgentExecutor(
    agentId,
    agent.prompt,
    agent.modelProvider,
    agent.modelName
  );

  const requestHandler = new DefaultRequestHandler(
    agent.card,
    new InMemoryTaskStore(),
    executor
  );

  const transportHandler = new JsonRpcTransportHandler(requestHandler);

  return {
    ...agent,
    executor,
    requestHandler,
    transportHandler
  };
}

// Initialize sample agent if it doesn't exist
let sampleAgentInitialized = false;
const sampleAgentId = 'socrates-web3-tutor';

async function ensureSampleAgent() {
  if (sampleAgentInitialized) return;

  const exists = await hasAgent(sampleAgentId);
  if (exists) {
    sampleAgentInitialized = true;
    return;
  }

  const sampleCard: AgentCard = {
    name: "Socrates Web3 Tutor",
    description: "Web3, AI, 블록체인 등 다양한 주제에 대해 소크라테스식 문답법으로 대화하며 학습을 도와주는 AI 튜터입니다.",
    protocolVersion: "0.3.0",
    version: "0.1.0",
    url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000") + `/api/agents/${sampleAgentId}`,
    capabilities: {},
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills: [
      {
        id: "chat",
        name: "Socratic Dialogue",
        description: "질문을 통해 사고를 유도하고 스스로 답을 찾도록 돕습니다",
        tags: ["chat", "socratic", "web3", "ai", "blockchain"]
      }
    ],
  };

  const samplePrompt = "You are Socrates, teaching Web3 and AI concepts using the Socratic method.";
  const sampleModelProvider = 'gemini';
  const sampleModelName = 'gemini-2.5-flash';

  // Initialize executor, request handler, and transport handler for sample agent
  const executor = new DynamicAgentExecutor(
    sampleAgentId,
    samplePrompt,
    sampleModelProvider,
    sampleModelName
  );

  const requestHandler = new DefaultRequestHandler(
    sampleCard,
    new InMemoryTaskStore(),
    executor
  );

  const transportHandler = new JsonRpcTransportHandler(requestHandler);

  const sampleAgent: StoredAgent = {
    card: sampleCard,
    prompt: samplePrompt,
    modelProvider: sampleModelProvider,
    modelName: sampleModelName,
    executor,
    requestHandler,
    transportHandler
  };

  await setAgent(sampleAgentId, sampleAgent);
  sampleAgentInitialized = true;
  console.log('✅ Sample agent initialized:', {
    id: sampleAgentId,
    name: sampleCard.name,
    url: sampleCard.url,
    agentCardUrl: `${sampleCard.url}/.well-known/agent.json`
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; path?: string[] }> }
) {
  // Ensure sample agent is initialized
  await ensureSampleAgent();

  const params = await context.params;
  const agentId = params.agentId;
  const currentPath = params.path?.join('/') || '';

  console.log('🔍 GET request:', {
    agentId,
    pathArray: params.path,
    currentPath,
    expectedPath: AGENT_CARD_PATH,
    match: currentPath === AGENT_CARD_PATH
  });

  // Handle .well-known/agent.json
  if (currentPath === AGENT_CARD_PATH) {
    const agent = await getAgent(agentId);
    console.log('🤖 Agent lookup:', { agentId, found: !!agent });

    if (!agent) {
      const allAgents = await getAllAgents();
      const agentIds = allAgents.map(a => a.card.url.split('/').pop());
      console.error('❌ Agent not found in store. Available agents:', agentIds);
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json(agent.card);
  }

  console.log('❌ Path did not match agent card path');
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string; path?: string[] }> }
) {
  // Ensure sample agent is initialized
  await ensureSampleAgent();

  const params = await context.params;
  const agentId = params.agentId;
  const currentPath = params.path?.join('/') || '';

  // Handle deploy endpoint
  if (currentPath === "deploy") {
    try {
      const agentConfig = await request.json();

      const agentCard: AgentCard = {
        name: agentConfig.name,
        description: agentConfig.description,
        protocolVersion: agentConfig.protocolVersion,
        version: agentConfig.version,
        url: agentConfig.url,
        capabilities: agentConfig.capabilities,
        defaultInputModes: agentConfig.defaultInputModes,
        defaultOutputModes: agentConfig.defaultOutputModes,
        skills: agentConfig.skills,
      };

      // Create agent components
      const executor = new DynamicAgentExecutor(
        agentId,
        agentConfig.prompt,
        agentConfig.modelProvider,
        agentConfig.modelName
      );

      const requestHandler = new DefaultRequestHandler(
        agentCard,
        new InMemoryTaskStore(),
        executor
      );

      const transportHandler = new JsonRpcTransportHandler(requestHandler);

      await setAgent(agentId, {
        card: agentCard,
        prompt: agentConfig.prompt,
        modelProvider: agentConfig.modelProvider,
        modelName: agentConfig.modelName,
        executor,
        requestHandler,
        transportHandler
      });

      console.log('✅ Agent deployed:', { agentId, name: agentCard.name });
      return NextResponse.json({ success: true, agentId });
    } catch (error) {
      console.error("Deploy error:", error);
      return NextResponse.json({ error: "Failed to deploy agent" }, { status: 500 });
    }
  }

  // Handle agent execution
  if (currentPath === '') {
    let agent = await getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Ensure agent has runtime handlers (recreate if needed)
    agent = ensureAgentHandlers(agent, agentId);

    try {
      const body = await request.json();
      const rpcResponseOrStream = await agent.transportHandler!.handle(body);

      // Check if result is a stream
      const isAsyncIterable = (obj: unknown): obj is AsyncIterable<JSONRPCSuccessResponse> => {
        return obj != null && typeof obj === 'object' && Symbol.asyncIterator in obj;
      };

      if (isAsyncIterable(rpcResponseOrStream)) {
        const stream = rpcResponseOrStream as AsyncGenerator<JSONRPCSuccessResponse, void, undefined>;

        // Create SSE stream
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const event of stream) {
                controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
              }
            } catch (streamError: unknown) {
              console.error(`Error during SSE streaming:`, streamError);
              const a2aError = streamError instanceof A2AError ? streamError : A2AError.internalError((streamError as Error).message || 'Streaming error.');
              const errorResponse: JSONRPCErrorResponse = {
                jsonrpc: '2.0',
                id: body?.id || null,
                error: a2aError.toJSONRPCError(),
              };
              controller.enqueue(`event: error\n`);
              controller.enqueue(`data: ${JSON.stringify(errorResponse)}\n\n`);
            } finally {
              controller.close();
            }
          }
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      } else {
        // Handle single JSON-RPC response
        const rpcResponse = rpcResponseOrStream as JSONRPCResponse;
        return NextResponse.json(rpcResponse);
      }
    } catch (error: unknown) {
      console.error("Error in POST handler:", error);
      const a2aError = error instanceof A2AError ? error : A2AError.internalError('General processing error.');
      const errorResponse: JSONRPCErrorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: a2aError.toJSONRPCError(),
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}