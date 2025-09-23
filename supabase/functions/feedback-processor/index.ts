import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackRequest {
  message_id: string;
  session_id: string;
  model: string;
  helpful: boolean;
  comment?: string;
  rating?: number;
  categories?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the session
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    const feedbackData: FeedbackRequest = await req.json()

    // Validate required fields
    if (!feedbackData.message_id || !feedbackData.session_id || !feedbackData.model || feedbackData.helpful === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Prepare feedback record
    const feedbackRecord = {
      message_id: feedbackData.message_id,
      session_id: feedbackData.session_id,
      model: feedbackData.model,
      helpful: feedbackData.helpful,
      comment: feedbackData.comment || null,
      user_id: user.id,
      metadata: {
        rating: feedbackData.rating,
        categories: feedbackData.categories,
        user_agent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      }
    }

    // Insert feedback
    const { data: feedback, error: feedbackError } = await supabaseClient
      .from('message_feedback')
      .insert(feedbackRecord)
      .select()
      .single()

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError)
      return new Response(
        JSON.stringify({ error: 'Failed to save feedback' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Process negative feedback for alerts
    if (!feedbackData.helpful) {
      await processNegativeFeedback(supabaseClient, feedbackData, feedback.id)
    }

    // Update session quality metrics
    await updateSessionMetrics(supabaseClient, feedbackData.session_id)

    // Update model performance metrics
    await updateModelMetrics(supabaseClient, feedbackData.model)

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedback_id: feedback.id,
        message: 'Feedback processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing feedback:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processNegativeFeedback(
  supabaseClient: any,
  feedbackData: FeedbackRequest,
  feedbackId: string
) {
  try {
    // Check for multiple negative feedbacks in the session
    const { data: sessionFeedbacks } = await supabaseClient
      .from('message_feedback')
      .select('id, helpful')
      .eq('session_id', feedbackData.session_id)
      .order('created_at', { ascending: false })
      .limit(5)

    const recentNegative = sessionFeedbacks?.filter(f => !f.helpful).length || 0
    
    // Determine alert severity
    let severity = 'low'
    let alertType = 'negative_feedback'
    
    if (recentNegative >= 3) {
      severity = 'high'
      alertType = 'low_rating'
    } else if (recentNegative >= 2) {
      severity = 'medium'
    }

    // Check for spam patterns
    if (feedbackData.comment) {
      const spamIndicators = ['spam', 'test', 'asdf', '123', 'aaaaa']
      const isSpam = spamIndicators.some(indicator => 
        feedbackData.comment!.toLowerCase().includes(indicator)
      )
      
      if (isSpam) {
        severity = 'low'
        alertType = 'spam_detection'
      }
    }

    // Create alert
    const { error: alertError } = await supabaseClient
      .from('feedback_alerts')
      .insert({
        message_id: feedbackData.message_id,
        session_id: feedbackData.session_id,
        model: feedbackData.model,
        alert_type: alertType,
        severity: severity,
        comment: feedbackData.comment,
        feedback_id: feedbackId,
        resolved: false,
        metadata: {
          session_negative_count: recentNegative,
          categories: feedbackData.categories,
          rating: feedbackData.rating
        }
      })

    if (alertError) {
      console.error('Error creating alert:', alertError)
    }

    // Send notification for high severity alerts
    if (severity === 'high' || severity === 'critical') {
      await sendAlertNotification(supabaseClient, {
        type: alertType,
        severity,
        model: feedbackData.model,
        session_id: feedbackData.session_id,
        comment: feedbackData.comment
      })
    }

  } catch (error) {
    console.error('Error processing negative feedback:', error)
  }
}

async function updateSessionMetrics(supabaseClient: any, sessionId: string) {
  try {
    const { data: sessionFeedbacks } = await supabaseClient
      .from('message_feedback')
      .select('helpful')
      .eq('session_id', sessionId)

    if (sessionFeedbacks && sessionFeedbacks.length > 0) {
      const helpful = sessionFeedbacks.filter(f => f.helpful).length
      const total = sessionFeedbacks.length
      const satisfaction = (helpful / total) * 100

      // Update or create session quality record
      const { error } = await supabaseClient
        .from('session_quality_metrics')
        .upsert({
          session_id: sessionId,
          total_feedback: total,
          helpful_count: helpful,
          unhelpful_count: total - helpful,
          satisfaction_rate: satisfaction,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating session metrics:', error)
      }
    }
  } catch (error) {
    console.error('Error updating session metrics:', error)
  }
}

async function updateModelMetrics(supabaseClient: any, model: string) {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data: modelFeedbacks } = await supabaseClient
      .from('message_feedback')
      .select('helpful, created_at')
      .eq('model', model)
      .gte('created_at', yesterday.toISOString())

    if (modelFeedbacks && modelFeedbacks.length > 0) {
      const helpful = modelFeedbacks.filter(f => f.helpful).length
      const total = modelFeedbacks.length
      const satisfaction = (helpful / total) * 100

      // Update model performance metrics
      const { error } = await supabaseClient
        .from('model_performance_metrics')
        .upsert({
          model: model,
          date: new Date().toISOString().split('T')[0],
          total_feedback: total,
          helpful_count: helpful,
          unhelpful_count: total - helpful,
          satisfaction_rate: satisfaction,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating model metrics:', error)
      }
    }
  } catch (error) {
    console.error('Error updating model metrics:', error)
  }
}

async function sendAlertNotification(supabaseClient: any, alertData: any) {
  try {
    // Get admin users to notify
    const { data: admins } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: 'feedback_alert',
        title: `Alerta de Feedback - ${alertData.severity.toUpperCase()}`,
        message: `Modelo ${alertData.model} recebeu feedback negativo na sessão ${alertData.session_id}`,
        data: alertData,
        read: false
      }))

      await supabaseClient
        .from('notifications')
        .insert(notifications)
    }
  } catch (error) {
    console.error('Error sending alert notification:', error)
  }
}