import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentBuilderForm } from '@/types/agent';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      console.error('❌ API key not found. Please set GEMINI_API_KEY or GOOGLE_API_KEY in .env file');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log('🚀 Generating agent with prompt:', prompt.substring(0, 50) + '...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `You are an AI agent designer. Based on the user's description, generate a complete agent configuration.

    Return ONLY valid JSON in this exact format:
    {
      "name": "Agent Name in English",
      "description": "Brief description of what the agent does",
      "prompt": "Detailed system prompt for the agent that defines its behavior, personality, and capabilities",
      "skills": [
        {
          "id": "skill-id",
          "name": "Skill Name",
          "description": "What this skill does",
          "tags": ["tag1", "tag2"]
        }
      ],
      "tags": ["relevant", "tags", "for", "the", "agent"],
      "modelProvider": "gemini",
      "modelName": "gemini-2.5-flash"
    }

    IMPORTANT RULES:
    - The "name" field MUST be in English only (no Korean, Chinese, Japanese, etc.)
    - The name should be concise, descriptive, and URL-friendly (e.g., "Socrates Web3 Tutor", "Blockchain Learning Assistant")
    - The description can be in the same language as user's request
    - The prompt is detailed and defines the agent's personality, behavior, and expertise
    - Skills are relevant to the agent's purpose
    - Tags help categorize the agent (in English)
    - Use "gemini" as modelProvider and "gemini-2.5-flash" as modelName`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User request: ${prompt}` }
    ]);

    const response = await result.response;
    const text = response.text();
    console.log('📝 Gemini response received:', text.substring(0, 100) + '...');

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON from response:', text);
      throw new Error('Failed to generate valid JSON');
    }

    const agentConfig: AgentBuilderForm = JSON.parse(jsonMatch[0]);
    console.log('✅ Agent config generated:', agentConfig.name);

    return NextResponse.json(agentConfig);
  } catch (error) {
    console.error('❌ Error generating agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate agent configuration: ${errorMessage}` },
      { status: 500 }
    );
  }
}