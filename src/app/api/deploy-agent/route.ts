import { NextRequest, NextResponse } from 'next/server';
import { AgentConfig } from '@/types/agent';

export async function POST(request: NextRequest) {
  try {
    const agentConfig: AgentConfig = await request.json();

    // Extract agent ID from URL
    const agentId = agentConfig.id;

    // Use relative path for internal API call
    const deployUrl = `/api/agents/${agentId}/deploy`;

    // Get the base URL for the fetch (needs to be absolute for server-side fetch)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const absoluteDeployUrl = `${baseUrl}${deployUrl}`;

    console.log('🚀 Deploying agent to:', absoluteDeployUrl);

    const deployResponse = await fetch(absoluteDeployUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentConfig),
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      console.error('❌ Deploy failed:', errorText);
      throw new Error(`Failed to deploy agent to endpoint: ${deployResponse.status} ${errorText}`);
    }

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