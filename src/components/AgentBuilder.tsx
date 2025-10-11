'use client';

import React, { useState } from 'react';
import { AgentBuilderForm, AgentConfig } from '@/types/agent';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

export default function AgentBuilder() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<AgentBuilderForm | null>(null);

  const generateAgentFromPrompt = async () => {
    if (!prompt.trim()) {
      alert('프롬프트를 입력해주세요');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate agent');
      }

      const data = await response.json();
      setGeneratedForm(data);
    } catch (error) {
      console.error('Error generating agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`에이전트 생성 실패: ${errorMessage}\n\n서버 콘솔에서 자세한 로그를 확인해주세요.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const createAgent = () => {
    if (!generatedForm) {
      alert('Please generate an agent first');
      return;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Convert agent name to meaningful English slug
    // Remove non-ASCII characters, convert to lowercase, replace spaces with hyphens
    const agentSlug = generatedForm.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Add timestamp suffix to ensure uniqueness
    const agentId = `${agentSlug}-${Date.now()}`;

    const newAgent: AgentConfig = {
      id: agentId,
      name: generatedForm.name,
      description: generatedForm.description,
      prompt: generatedForm.prompt,
      protocolVersion: '0.3.0',
      version: '0.1.0',
      url: `${siteUrl}/api/agents/${agentId}`,
      capabilities: {},
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      skills: generatedForm.skills,
      modelProvider: generatedForm.modelProvider,
      modelName: generatedForm.modelName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setAgents(prev => [...prev, newAgent]);
    
    // Reset form
    setPrompt('');
    setGeneratedForm(null);
  };

  const exportAgent = (agent: AgentConfig) => {
    const exportData = {
      agentCard: {
        name: agent.name,
        description: agent.description,
        protocolVersion: agent.protocolVersion,
        version: agent.version,
        url: agent.url,
        capabilities: agent.capabilities,
        defaultInputModes: agent.defaultInputModes,
        defaultOutputModes: agent.defaultOutputModes,
        skills: agent.skills,
      },
      config: {
        prompt: agent.prompt,
        modelProvider: agent.modelProvider,
        modelName: agent.modelName,
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deployAgent = async (agent: AgentConfig) => {
    try {
      const response = await fetch('/api/deploy-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to deploy agent');
      }

      // Update deployed status
      setAgents(prev => prev.map(a =>
        a.id === agent.id ? { ...a, deployed: true } : a
      ));

      const agentCardUrl = `${agent.url}/.well-known/agent.json`;
      alert(`✅ 에이전트가 성공적으로 배포되었습니다!\n\n🔗 Base URL: ${agent.url}\n📄 Agent Card: ${agentCardUrl}\n\n이제 다른 클라이언트에서 이 에이전트에 연결할 수 있습니다.`);
    } catch (error) {
      console.error('Error deploying agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ 에이전트 배포 실패: ${errorMessage}\n\n서버 콘솔에서 자세한 로그를 확인해주세요.`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white text-xl font-bold">🏠</span>
            </div>
            <span className="font-bold text-gray-700 group-hover:text-purple-600 transition-colors">홈으로</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
              <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                A2A Protocol v0.3.0
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            A2A Agent Builder
          </h1>
          <p className="text-gray-600 text-lg">AI로 나만의 에이전트를 쉽고 빠르게 만들어보세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6 bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-purple-100 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">✨</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">새 에이전트 만들기</h2>
            </div>
          
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">
              에이전트 설명
              <span className="text-gray-400 font-normal ml-2">(어떤 에이전트를 만들고 싶으신가요?)</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl h-40 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-200 resize-none"
              placeholder="예: Web3와 블록체인 기술을 소크라테스식 문답법으로 가르치는 AI 튜터를 만들어줘. 학생들이 스스로 답을 찾도록 유도하고, 복잡한 개념을 단계적으로 이해할 수 있게 도와줘."
            />
          </div>

          <button
            onClick={generateAgentFromPrompt}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚡</span> 생성 중...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🤖 AI로 에이전트 생성하기
              </span>
            )}
          </button>

          {/* Generated Preview */}
          {generatedForm && (
            <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 animate-fade-in">
              <h3 className="font-bold text-lg mb-4 text-purple-900 flex items-center gap-2">
                ✨ 생성된 에이전트
              </h3>

              <div className="space-y-4">
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-xs font-semibold text-purple-600 uppercase">Name</span>
                  <p className="font-bold text-gray-800 mt-1">{generatedForm.name}</p>
                </div>

                <div className="bg-white p-3 rounded-lg">
                  <span className="text-xs font-semibold text-purple-600 uppercase">Description</span>
                  <p className="text-gray-700 mt-1">{generatedForm.description}</p>
                </div>

                <div className="bg-white p-3 rounded-lg">
                  <span className="text-xs font-semibold text-purple-600 uppercase">Skills</span>
                  <div className="mt-2 space-y-2">
                    {generatedForm.skills.map(skill => (
                      <div key={skill.id} className="text-sm bg-purple-50 p-2 rounded">
                        <span className="font-semibold text-purple-700">{skill.name}:</span>
                        <span className="text-gray-700 ml-1">{skill.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg">
                  <span className="text-xs font-semibold text-purple-600 uppercase">Tags</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {generatedForm.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full text-xs font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg">
                  <span className="text-xs font-semibold text-purple-600 uppercase">AI Model</span>
                  <p className="text-sm font-medium text-gray-800 mt-1">{generatedForm.modelProvider} / {generatedForm.modelName}</p>
                </div>
              </div>

              <button
                onClick={createAgent}
                className="mt-6 w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                ✅ 이 에이전트 생성하기
              </button>
            </div>
          )}
        </div>

        {/* Created Agents Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">🤖</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">생성된 에이전트</h2>
          </div>

          {agents.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-sm p-12 rounded-2xl shadow-xl border border-blue-100 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-gray-500 text-lg mb-2">아직 생성된 에이전트가 없습니다</p>
              <p className="text-gray-400">왼쪽에 프롬프트를 입력하고 첫 번째 에이전트를 만들어보세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map(agent => (
                <div key={agent.id} className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-blue-100 hover:shadow-2xl hover:border-blue-300 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{agent.name}</h3>
                      <p className="text-gray-600 leading-relaxed">{agent.description}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${
                      agent.deployed
                        ? 'bg-gradient-to-br from-green-100 to-emerald-100'
                        : 'bg-gradient-to-br from-yellow-100 to-orange-100'
                    }`}>
                      <span className={`text-xs font-bold ${
                        agent.deployed ? 'text-green-700' : 'text-orange-700'
                      }`}>
                        {agent.deployed ? '✅ DEPLOYED' : '⚠️ NOT DEPLOYED'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mt-4 bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">🧠 Model:</span>
                      <span className="text-gray-600">{agent.modelProvider} / {agent.modelName}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-gray-700">⚡ Skills:</span>
                      <span className="text-gray-600">{agent.skills.map(s => s.name).join(', ')}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-700">🔗 Base URL:</span>
                        <code className="flex-1 bg-white px-3 py-1.5 rounded-lg text-xs border border-gray-200 break-all">{agent.url}</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-700">📄 Agent Card:</span>
                        <code className="flex-1 bg-white px-3 py-1.5 rounded-lg text-xs border border-gray-200 break-all">{agent.url}/.well-known/agent.json</code>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => deployAgent(agent)}
                      disabled={agent.deployed}
                      className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg font-semibold shadow-md transition-all duration-200 ${
                        agent.deployed
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:shadow-lg transform hover:-translate-y-0.5'
                      }`}
                    >
                      {agent.deployed ? '✅ Deployed' : '🚀 Deploy'}
                    </button>
                    <button
                      onClick={() => exportAgent(agent)}
                      className="flex-1 min-w-[120px] px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      💾 Export
                    </button>
                    {agent.deployed ? (
                      <a
                        href={`/?agentUrl=${encodeURIComponent(agent.url)}`}
                        className="flex-1 min-w-[120px] px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-center"
                      >
                        💬 Test Chat
                      </a>
                    ) : (
                      <button
                        disabled
                        className="flex-1 min-w-[120px] px-4 py-2.5 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed"
                        title="Deploy the agent first to test chat"
                      >
                        💬 Test Chat
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}