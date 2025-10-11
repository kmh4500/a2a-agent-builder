#!/usr/bin/env tsx

/**
 * Test script to verify Upstash Redis connection
 *
 * Run with: npx tsx scripts/test-redis.ts
 */

import { redis, REDIS_KEYS } from '../src/lib/redis';

async function testRedisConnection() {
  console.log('🧪 Testing Upstash Redis connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣  Testing basic connection...');
    await redis.ping();
    console.log('✅ Redis connection successful!\n');

    // Test 2: Set and Get
    console.log('2️⃣  Testing SET and GET operations...');
    const testKey = 'test:connection';
    const testValue = { message: 'Hello from A2A Agent Builder!', timestamp: Date.now() };

    await redis.set(testKey, testValue);
    console.log('✅ SET operation successful');

    const retrieved = await redis.get(testKey);
    console.log('✅ GET operation successful');
    console.log('   Retrieved value:', retrieved);

    await redis.del(testKey);
    console.log('✅ DELETE operation successful\n');

    // Test 3: Set operations (for agent list)
    console.log('3️⃣  Testing SET operations (SADD, SMEMBERS)...');
    const testSetKey = 'test:agents:list';

    await redis.sadd(testSetKey, 'agent-1', 'agent-2', 'agent-3');
    console.log('✅ SADD operation successful');

    const members = await redis.smembers(testSetKey);
    console.log('✅ SMEMBERS operation successful');
    console.log('   Set members:', members);

    await redis.del(testSetKey);
    console.log('✅ Cleanup successful\n');

    // Test 4: Agent store operations
    console.log('4️⃣  Testing agent store key patterns...');
    const testAgentId = 'test-agent-123';
    const testAgent = {
      card: {
        name: 'Test Agent',
        description: 'A test agent',
        protocolVersion: '0.3.0',
        version: '0.1.0',
        url: 'http://localhost:3001/api/agents/test-agent-123',
        capabilities: {},
        defaultInputModes: ['text'],
        defaultOutputModes: ['text'],
        skills: []
      },
      prompt: 'You are a test agent',
      modelProvider: 'gemini',
      modelName: 'gemini-2.5-flash'
    };

    await redis.set(REDIS_KEYS.AGENT(testAgentId), testAgent);
    console.log('✅ Agent stored successfully');

    const retrievedAgent = await redis.get(REDIS_KEYS.AGENT(testAgentId));
    console.log('✅ Agent retrieved successfully');
    console.log('   Agent name:', (retrievedAgent as any)?.card?.name);

    await redis.sadd(REDIS_KEYS.AGENT_LIST, testAgentId);
    console.log('✅ Agent added to list successfully');

    const agentList = await redis.smembers(REDIS_KEYS.AGENT_LIST);
    console.log('✅ Agent list retrieved successfully');
    console.log('   Agent IDs in list:', agentList);

    // Cleanup
    await redis.del(REDIS_KEYS.AGENT(testAgentId));
    await redis.srem(REDIS_KEYS.AGENT_LIST, testAgentId);
    console.log('✅ Cleanup successful\n');

    console.log('🎉 All tests passed! Your Upstash Redis is properly configured.\n');

  } catch (error) {
    console.error('\n❌ Redis test failed!\n');

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('\nTroubleshooting:');
      console.error('1. Check that UPSTASH_REDIS_REST_URL is set in your .env file');
      console.error('2. Check that UPSTASH_REDIS_REST_TOKEN is set in your .env file');
      console.error('3. Verify your credentials are correct in the Upstash console');
      console.error('4. Ensure your Redis database is active\n');
    }

    process.exit(1);
  }
}

// Run the test
testRedisConnection();
