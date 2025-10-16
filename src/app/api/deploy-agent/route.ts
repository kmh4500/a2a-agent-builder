import { NextRequest, NextResponse } from 'next/server';
import { AgentConfig } from '@/types/agent';
import { setAgent } from '@/lib/agentStore';
import type { AgentCard } from "@a2a-js/sdk";
export async function POST(request: NextRequest) {
  try {
    const agentConfig: AgentConfig = await request.json();
    const agentId = agentConfig.id;

    console.log('🚀 Deploying agent:', agentId);

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

    // Store agent configuration in Redis
    // The executor will be created on-demand when the agent receives a message
    await setAgent(agentId, {
      card: agentCard,
      prompt: agentConfig.prompt,
      modelProvider: agentConfig.modelProvider,
      modelName: agentConfig.modelName,
    });

    console.log('✅ Agent deployed successfully:', agentId);

    return NextResponse.json({
      success: true,
      agentId: agentConfig.id,
      url: agentConfig.url
    });
  } catch (error) {
    console.error('❌ Error deploying agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to deploy agent: ${errorMessage}` },
      { status: 500 }
    );
  }
}