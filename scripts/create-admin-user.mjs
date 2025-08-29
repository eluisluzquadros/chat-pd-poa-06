#!/usr/bin/env node

/**
 * Create Admin User
 * Cria ou atualiza um usuário admin para testes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log(chalk.red('❌ Variáveis de ambiente não configuradas!'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  console.log(chalk.bold.cyan('\n🔧 Criando Usuário Admin\n'));
  
  const adminEmail = 'admin@chatpdpoa.com';
  const adminPassword = 'Admin@2025!';
  
  try {
    // 1. Tentar deletar usuário existente
    console.log(chalk.yellow('1. Verificando usuário existente...'));
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);
    
    if (existingUser) {
      console.log(chalk.yellow('   Usuário encontrado. Atualizando...'));
      
      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: adminPassword,
          email_confirm: true
        }
      );
      
      if (updateError) {
        console.log(chalk.red(`   ❌ Erro ao atualizar: ${updateError.message}`));
      } else {
        console.log(chalk.green('   ✅ Senha atualizada'));
      }
      
      // Update profile to admin
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: existingUser.id,
          email: adminEmail,
          role: 'admin',
          full_name: 'Administrador',
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.log(chalk.red(`   ❌ Erro ao atualizar perfil: ${profileError.message}`));
      } else {
        console.log(chalk.green('   ✅ Perfil atualizado para admin'));
      }
      
    } else {
      console.log(chalk.yellow('2. Criando novo usuário...'));
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Administrador',
          role: 'admin'
        }
      });
      
      if (createError) {
        console.log(chalk.red(`   ❌ Erro ao criar: ${createError.message}`));
        return;
      }
      
      console.log(chalk.green('   ✅ Usuário criado'));
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: adminEmail,
          role: 'admin',
          full_name: 'Administrador'
        });
      
      if (profileError) {
        console.log(chalk.red(`   ❌ Erro ao criar perfil: ${profileError.message}`));
      } else {
        console.log(chalk.green('   ✅ Perfil admin criado'));
      }
    }
    
    // 3. Testar login
    console.log(chalk.yellow('\n3. Testando login...'));
    const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: session, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });
    
    if (loginError) {
      console.log(chalk.red(`   ❌ Erro no login: ${loginError.message}`));
    } else if (session?.user) {
      console.log(chalk.green('   ✅ Login bem-sucedido!'));
    }
    
    console.log(chalk.bold.green('\n✅ USUÁRIO ADMIN CONFIGURADO!\n'));
    console.log(chalk.white('Credenciais de acesso:'));
    console.log(chalk.cyan(`  📧 Email: ${adminEmail}`));
    console.log(chalk.cyan(`  🔐 Senha: ${adminPassword}`));
    console.log(chalk.yellow('\n💡 Use essas credenciais para fazer login em http://localhost:8080'));
    
  } catch (error) {
    console.log(chalk.red(`❌ Erro: ${error.message}`));
  }
}

createAdminUser();