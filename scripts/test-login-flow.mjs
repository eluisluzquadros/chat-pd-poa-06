#!/usr/bin/env node

/**
 * Test Login Flow
 * Testa o fluxo completo de login
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLoginFlow() {
  console.log(chalk.bold.cyan('\n🔐 Testando Fluxo de Login\n'));
  
  const email = 'admin@chatpdpoa.com';
  const password = 'Admin@2025!';
  
  // 1. Test frontend is running
  console.log(chalk.yellow('1. Verificando se o frontend está rodando...'));
  try {
    const response = await fetch('http://localhost:8080');
    if (response.ok) {
      console.log(chalk.green('   ✅ Frontend está acessível'));
    } else {
      console.log(chalk.red(`   ❌ Frontend retornou status ${response.status}`));
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Frontend não está rodando: ${error.message}`));
    console.log(chalk.yellow('   💡 Execute "npm run dev" primeiro'));
    return;
  }
  
  // 2. Test login
  console.log(chalk.yellow('\n2. Testando login com credenciais...'));
  try {
    const { data: session, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.log(chalk.red(`   ❌ Erro no login: ${error.message}`));
      return;
    }
    
    if (session?.user) {
      console.log(chalk.green('   ✅ Login bem-sucedido!'));
      console.log(chalk.white(`      User ID: ${session.user.id}`));
      console.log(chalk.white(`      Email: ${session.user.email}`));
      console.log(chalk.white(`      Token: ${session.session?.access_token?.substring(0, 20)}...`));
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Erro: ${error.message}`));
    return;
  }
  
  // 3. Test authenticated request
  console.log(chalk.yellow('\n3. Testando requisição autenticada...'));
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Test chat endpoint
      const chatResponse = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'teste',
          model: 'gpt-3.5-turbo'
        })
      });
      
      if (chatResponse.ok) {
        console.log(chalk.green('   ✅ Endpoint agentic-rag acessível'));
      } else {
        console.log(chalk.yellow(`   ⚠️ Endpoint retornou status ${chatResponse.status}`));
      }
    }
  } catch (error) {
    console.log(chalk.yellow(`   ⚠️ Erro ao testar endpoint: ${error.message}`));
  }
  
  // 4. Sign out
  console.log(chalk.yellow('\n4. Fazendo logout...'));
  await supabase.auth.signOut();
  console.log(chalk.green('   ✅ Logout realizado'));
  
  console.log(chalk.bold.green('\n✅ FLUXO DE LOGIN FUNCIONANDO!\n'));
  console.log(chalk.white('Instruções para acessar o sistema:'));
  console.log(chalk.cyan('1. Abra http://localhost:8080 no navegador'));
  console.log(chalk.cyan('2. Faça login com:'));
  console.log(chalk.white(`   Email: ${email}`));
  console.log(chalk.white(`   Senha: ${password}`));
  console.log(chalk.cyan('3. Você será redirecionado para /chat'));
  console.log(chalk.cyan('4. Para acessar admin: http://localhost:8080/admin/quality'));
  console.log(chalk.cyan('5. Para benchmark: http://localhost:8080/admin/benchmark'));
}

testLoginFlow();