#!/usr/bin/env node

/**
 * Test script para diagnosticar problemas no orchestrator
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testOrchestratorDirect() {
  console.log(chalk.cyan('🔍 Testing Orchestrator Direct Call...'));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator-master`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: 'Test query',
        sessionId: 'test-session-debug',
        options: { debug: true }
      })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('Raw response:', text);
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log(chalk.green('✅ Orchestrator working'));
        console.log('Response:', data);
      } catch (e) {
        console.log(chalk.red('❌ JSON parse error'), e.message);
      }
    } else {
      console.log(chalk.red('❌ HTTP Error'), response.status);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Network error:'), error.message);
  }
}

async function testAgentDirect() {
  console.log(chalk.cyan('\n🤖 Testing Legal Agent Direct Call...'));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-legal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: 'Qual o artigo da LUOS que define EIV?',
        context: { debug: true }
      })
    });
    
    console.log('Agent Status:', response.status);
    const text = await response.text();
    console.log('Agent Response:', text);
    
  } catch (error) {
    console.error(chalk.red('❌ Agent error:'), error.message);
  }
}

async function testConnection() {
  console.log(chalk.cyan('\n🔗 Testing Basic Connection...'));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    console.log('Connection Status:', response.status);
    
    if (response.ok) {
      console.log(chalk.green('✅ Supabase connection working'));
    } else {
      console.log(chalk.red('❌ Supabase connection failed'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Connection error:'), error.message);
  }
}

async function main() {
  console.log(chalk.bold.cyan('🔧 ORCHESTRATOR DIAGNOSTIC TESTS\n'));
  
  await testConnection();
  await testOrchestratorDirect();
  await testAgentDirect();
}

main().catch(console.error);