#!/usr/bin/env node

/**
 * Test Supabase Connection
 * Verifica se a conexão com o Supabase está funcionando
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(chalk.bold.cyan('\n🔍 Testando Conexão com Supabase\n'));

// Test 1: Check environment variables
console.log(chalk.yellow('1. Verificando variáveis de ambiente:'));
console.log(chalk.white(`   URL: ${supabaseUrl ? '✅ Configurada' : '❌ Não configurada'}`));
console.log(chalk.white(`   Anon Key: ${supabaseAnonKey ? '✅ Configurada' : '❌ Não configurada'}`));
console.log(chalk.white(`   Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Não configurada'}`));

if (!supabaseUrl || !supabaseAnonKey) {
  console.log(chalk.red('\n❌ Variáveis de ambiente não configuradas!'));
  process.exit(1);
}

// Test 2: Create client
console.log(chalk.yellow('\n2. Criando cliente Supabase...'));
const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log(chalk.green('   ✅ Cliente criado com sucesso'));

// Test 3: Test database connection
console.log(chalk.yellow('\n3. Testando conexão com banco de dados...'));
try {
  const { data, error } = await supabase
    .from('qa_test_cases')
    .select('count')
    .limit(1);
  
  if (error) {
    console.log(chalk.red(`   ❌ Erro na conexão: ${error.message}`));
  } else {
    console.log(chalk.green('   ✅ Conexão com banco de dados OK'));
  }
} catch (error) {
  console.log(chalk.red(`   ❌ Erro: ${error.message}`));
}

// Test 4: Test auth status
console.log(chalk.yellow('\n4. Testando status de autenticação...'));
try {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.log(chalk.red(`   ❌ Erro ao obter sessão: ${error.message}`));
  } else if (session) {
    console.log(chalk.green(`   ✅ Sessão ativa: ${session.user.email}`));
  } else {
    console.log(chalk.yellow('   ⚠️ Nenhuma sessão ativa'));
  }
} catch (error) {
  console.log(chalk.red(`   ❌ Erro: ${error.message}`));
}

// Test 5: Test service role connection
if (supabaseServiceKey) {
  console.log(chalk.yellow('\n5. Testando conexão com Service Role...'));
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(chalk.red(`   ❌ Erro: ${error.message}`));
    } else {
      console.log(chalk.green(`   ✅ Service Role OK - ${count} usuários no sistema`));
    }
  } catch (error) {
    console.log(chalk.red(`   ❌ Erro: ${error.message}`));
  }
}

// Test 6: Create test user
console.log(chalk.yellow('\n6. Criando usuário de teste...'));
const testEmail = 'test@example.com';
const testPassword = 'Test123456!';

try {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Try to create user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });
  
  if (createError && createError.message.includes('already registered')) {
    console.log(chalk.yellow('   ⚠️ Usuário de teste já existe'));
  } else if (createError) {
    console.log(chalk.red(`   ❌ Erro ao criar usuário: ${createError.message}`));
  } else {
    console.log(chalk.green(`   ✅ Usuário de teste criado: ${testEmail}`));
  }
  
  // Try to sign in with test user
  console.log(chalk.yellow('\n7. Testando login com usuário de teste...'));
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  
  if (signInError) {
    console.log(chalk.red(`   ❌ Erro no login: ${signInError.message}`));
  } else if (session?.user) {
    console.log(chalk.green(`   ✅ Login bem-sucedido!`));
    console.log(chalk.white(`      ID: ${session.user.id}`));
    console.log(chalk.white(`      Email: ${session.user.email}`));
  }
  
} catch (error) {
  console.log(chalk.red(`   ❌ Erro: ${error.message}`));
}

console.log(chalk.bold.cyan('\n📊 Resumo da Conexão:\n'));
console.log(chalk.white('URL Supabase: ' + supabaseUrl));
console.log(chalk.white('\nCredenciais de teste:'));
console.log(chalk.green(`  Email: ${testEmail}`));
console.log(chalk.green(`  Senha: ${testPassword}`));
console.log(chalk.yellow('\n💡 Use essas credenciais para fazer login no sistema'));

process.exit(0);