#!/usr/bin/env node

/**
 * Fix Admin Role
 * Corrige o papel do usuário admin no banco de dados
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminRole() {
  console.log(chalk.bold.cyan('\n🔧 Corrigindo Papel do Admin\n'));
  
  const adminEmail = 'admin@chatpdpoa.com';
  
  try {
    // 1. Buscar usuário
    console.log(chalk.yellow('1. Buscando usuário admin...'));
    const { data: users } = await supabase.auth.admin.listUsers();
    const adminUser = users?.users?.find(u => u.email === adminEmail);
    
    if (!adminUser) {
      console.log(chalk.red('   ❌ Usuário admin não encontrado'));
      return;
    }
    
    console.log(chalk.green(`   ✅ Usuário encontrado: ${adminUser.id}`));
    
    // 2. Verificar estrutura da tabela profiles
    console.log(chalk.yellow('\n2. Verificando estrutura da tabela profiles...'));
    const { data: profilesData, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single();
    
    if (selectError && selectError.code === 'PGRST116') {
      console.log(chalk.yellow('   Perfil não existe, criando...'));
      
      // Tentar criar perfil sem campo role primeiro
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: adminUser.id,
          email: adminEmail,
          full_name: 'Administrador',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.log(chalk.red(`   ❌ Erro ao criar perfil: ${insertError.message}`));
      } else {
        console.log(chalk.green('   ✅ Perfil criado'));
      }
    } else if (profilesData) {
      console.log(chalk.green('   ✅ Perfil já existe'));
      console.log(chalk.white(`      Colunas disponíveis: ${Object.keys(profilesData).join(', ')}`));
    }
    
    // 3. Atualizar metadados do usuário para incluir role
    console.log(chalk.yellow('\n3. Atualizando metadados do usuário...'));
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        user_metadata: {
          ...adminUser.user_metadata,
          role: 'admin',
          full_name: 'Administrador'
        },
        app_metadata: {
          ...adminUser.app_metadata,
          role: 'admin'
        }
      }
    );
    
    if (updateError) {
      console.log(chalk.red(`   ❌ Erro ao atualizar metadados: ${updateError.message}`));
    } else {
      console.log(chalk.green('   ✅ Metadados atualizados com role: admin'));
    }
    
    // 4. Verificar tabela user_roles se existir
    console.log(chalk.yellow('\n4. Verificando tabela user_roles...'));
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id)
      .single();
    
    if (roleError && roleError.code === '42P01') {
      console.log(chalk.yellow('   Tabela user_roles não existe'));
    } else if (roleError && roleError.code === 'PGRST116') {
      console.log(chalk.yellow('   Papel não existe em user_roles, criando...'));
      
      const { error: insertRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: adminUser.id,
          role: 'admin',
          created_at: new Date().toISOString()
        });
      
      if (insertRoleError) {
        console.log(chalk.yellow(`   ⚠️ Não foi possível criar role: ${insertRoleError.message}`));
      } else {
        console.log(chalk.green('   ✅ Role admin criada em user_roles'));
      }
    } else if (roleData) {
      // Atualizar role existente
      const { error: updateRoleError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', adminUser.id);
      
      if (updateRoleError) {
        console.log(chalk.yellow(`   ⚠️ Não foi possível atualizar role: ${updateRoleError.message}`));
      } else {
        console.log(chalk.green('   ✅ Role atualizada para admin em user_roles'));
      }
    }
    
    console.log(chalk.bold.green('\n✅ CONFIGURAÇÃO CONCLUÍDA!\n'));
    console.log(chalk.white('O usuário admin foi configurado com:'));
    console.log(chalk.cyan('  • Role nos metadados do usuário'));
    console.log(chalk.cyan('  • Perfil criado/atualizado'));
    console.log(chalk.cyan('  • Role configurada onde possível'));
    console.log(chalk.yellow('\n💡 Faça login novamente para aplicar as mudanças'));
    
  } catch (error) {
    console.log(chalk.red(`❌ Erro: ${error.message}`));
  }
}

fixAdminRole();