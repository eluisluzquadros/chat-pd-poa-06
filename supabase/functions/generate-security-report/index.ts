import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityReportRequest {
  sessionId: string;
  alertId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is admin or supervisor
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'supervisor'].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: 'Access denied. Admin or Supervisor role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sessionId, alertId }: SecurityReportRequest = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔒 Generating security report for session: ${sessionId}`);

    // 1. Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch all messages from the session
    const { data: messages, error: messagesError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    }

    // 3. Fetch user account details
    const { data: userAccount, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        *,
        user_roles (
          role,
          created_at
        )
      `)
      .eq('user_id', session.user_id)
      .single();

    if (userError) {
      console.error('Error fetching user account:', userError);
    }

    // 4. Fetch authentication attempts
    const { data: authAttempts, error: authError2 } = await supabase
      .from('auth_attempts')
      .select('*')
      .eq('email', userAccount?.email || '')
      .order('created_at', { ascending: false })
      .limit(50);

    if (authError2) {
      console.error('Error fetching auth attempts:', authError2);
    }

    // 5. Fetch message insights (sentiment analysis)
    const { data: insights, error: insightsError } = await supabase
      .from('message_insights')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
    }

    // 6. Fetch related intelligence alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('intelligence_alerts')
      .select('*')
      .contains('data', { session_id: sessionId })
      .order('triggered_at', { ascending: false });

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
    }

    // 7. Identify malicious patterns
    const maliciousMessage = messages?.find(m => 
      m.message?.content?.toLowerCase().includes('[system') ||
      m.message?.content?.toLowerCase().includes('reiniciar') ||
      m.message?.content?.toLowerCase().includes('ignore')
    );

    // 8. Calculate threat level
    const threatIndicators = {
      hasPromptInjection: !!maliciousMessage,
      hasNegativeSentiment: insights?.some(i => i.sentiment === 'negative') || false,
      hasMultipleFailedAuth: (authAttempts?.filter(a => !a.success).length || 0) > 3,
      isAccountDeactivated: !userAccount?.is_active,
    };

    const threatScore = Object.values(threatIndicators).filter(Boolean).length;
    const threatLevel = threatScore >= 3 ? 'critical' : threatScore >= 2 ? 'high' : 'medium';

    // 9. Generate comprehensive forensic report
    const report = {
      report_metadata: {
        report_id: crypto.randomUUID(),
        generated_at: new Date().toISOString(),
        generated_by: user.email,
        report_version: '1.0',
      },

      incident_classification: {
        incident_type: 'prompt_injection_attempt',
        severity: threatLevel,
        status: userAccount?.is_active ? 'active_threat' : 'neutralized',
        confidence_score: threatScore / 4,
      },

      attacker_profile: {
        user_id: userAccount?.user_id || session.user_id,
        full_name: userAccount?.full_name || 'Unknown',
        email: userAccount?.email || 'Unknown',
        account_created: userAccount?.created_at || session.created_at,
        role: userAccount?.user_roles?.[0]?.role || 'unknown',
        is_active: userAccount?.is_active ?? false,
        account_status: userAccount?.is_active ? 'ACTIVE' : 'DEACTIVATED',
      },

      attack_details: {
        session_id: sessionId,
        attack_timestamp: session.created_at,
        session_title: session.title,
        last_activity: session.updated_at,
        ip_address: authAttempts?.[0]?.ip_address || 'Unknown',
        technique: 'System Prompt Override / Instruction Injection',
        objective: 'Data Exfiltration & System Manipulation',
        target: 'Knowledge Base & System Configuration',
        attack_vector: 'Chat Interface',
      },

      threat_indicators: {
        prompt_injection_detected: threatIndicators.hasPromptInjection,
        negative_sentiment_detected: threatIndicators.hasNegativeSentiment,
        multiple_failed_auth: threatIndicators.hasMultipleFailedAuth,
        account_deactivated: threatIndicators.isAccountDeactivated,
        threat_score: `${threatScore}/4`,
        threat_level: threatLevel.toUpperCase(),
      },

      technical_evidence: {
        malicious_messages: maliciousMessage ? [{
          message_id: maliciousMessage.id,
          content: maliciousMessage.message?.content || '',
          timestamp: maliciousMessage.created_at,
          role: maliciousMessage.message?.role || 'user',
        }] : [],
        
        sentiment_analysis: insights?.map(i => ({
          sentiment: i.sentiment,
          sentiment_score: i.sentiment_score,
          keywords: i.keywords,
          topics: i.topics,
          intent: i.intent,
          analyzed_at: i.analyzed_at,
        })) || [],
        
        authentication_history: authAttempts?.map(a => ({
          timestamp: a.created_at,
          ip_address: a.ip_address,
          success: a.success,
          email: a.email,
        })) || [],

        security_alerts: alerts?.map(a => ({
          alert_id: a.id,
          alert_type: a.alert_type,
          severity: a.severity,
          title: a.title,
          description: a.description,
          triggered_at: a.triggered_at,
          acknowledged: a.acknowledged,
        })) || [],
      },

      system_response: {
        automated_actions_taken: [
          userAccount?.is_active === false ? 'User account automatically deactivated' : 'User account remains active',
          alerts && alerts.length > 0 ? 'Security alert generated' : 'No alert generated',
          'Incident logged for forensic analysis',
        ],
        attack_blocked: true,
        data_compromised: false,
        containment_status: 'complete',
      },

      full_conversation_log: messages?.map(m => ({
        message_id: m.id,
        timestamp: m.created_at,
        role: m.message?.role || 'unknown',
        content: m.message?.content || '',
        metadata: m.metadata,
      })) || [],

      recommendations: [
        threatIndicators.isAccountDeactivated 
          ? 'Account successfully deactivated. Review other sessions from this user.'
          : 'URGENT: Manually review and deactivate account if necessary.',
        'Forward this report to legal team for potential law enforcement notification.',
        'Review access logs for any unauthorized data access.',
        'Implement additional rate limiting on prompt injection patterns.',
        'Consider IP blocking for repeat offenders.',
      ],

      legal_notice: 
        'CONFIDENTIAL SECURITY INCIDENT REPORT\n\n' +
        'This document contains sensitive security information regarding an attempted ' +
        'unauthorized access to the system. The incident was detected and blocked by ' +
        'automated security measures. This report is generated for legal and compliance ' +
        'purposes and may be used as evidence in legal proceedings.\n\n' +
        'Generated by: Automated Security System\n' +
        'Report Classification: CONFIDENTIAL\n' +
        'Retention Period: 7 years (as per legal requirements)',
    };

    console.log('✅ Security report generated successfully');

    // Save report to database
    const { error: saveError } = await supabase
      .from('security_incident_reports')
      .insert({
        session_id: sessionId,
        alert_id: alertId,
        report_data: report,
        generated_by: user.id,
        threat_level: threatLevel,
        status: 'pending_review'
      });

    if (saveError) {
      console.error("⚠️ Error saving report:", saveError);
    } else {
      console.log("✅ Report saved to database");
      
      // Trigger email notification for critical threats
      if (threatLevel === 'critical') {
        try {
          await supabase.functions.invoke('send-security-email', {
            body: {
              to: 'security@urbanista.app',
              title: `Incidente Crítico: ${session.title}`,
              description: `Tentativa de injeção de prompt detectada na sessão ${sessionId}`,
              severity: 'critical',
              sessionId: sessionId,
              reportId: alertId,
              alert_type: 'prompt_injection',
              triggered_at: new Date().toISOString(),
              user_email: userAccount?.email || 'unknown',
            }
          });
          console.log("📧 Critical alert email sent");
        } catch (emailError) {
          console.error("⚠️ Error sending alert email:", emailError);
        }
      }
    }

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ Error generating security report:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate security report', 
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});