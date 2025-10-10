import { supabase } from '@/integrations/supabase/client';

type LogType = 'platform_detection' | 'xhr_start' | 'xhr_success' | 'xhr_error' | 'json_parse' | 'error' | 'info';
type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  log_type: LogType;
  log_level: LogLevel;
  message: string;
  details?: object;
  user_agent?: string;
  error_name?: string;
  error_message?: string;
  stack_trace?: string;
}

class TelemetryService {
  private sessionId: string | null = null;
  private userId: string | null = null;

  setContext(sessionId: string | null, userId: string | null) {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  private async sendLog(entry: LogEntry): Promise<void> {
    try {
      const { error } = await supabase.from('ios_debug_logs').insert({
        user_id: this.userId,
        session_id: this.sessionId,
        user_agent: entry.user_agent || navigator.userAgent,
        ...entry
      });

      if (error) {
        console.error('❌ Telemetry failed:', error);
      }
    } catch (err) {
      // Silently fail - não queremos que telemetria quebre a aplicação
      console.error('❌ Telemetry exception:', err);
    }
  }

  async logPlatformDetection(details: {
    userAgent: string;
    isiOS: boolean;
    isWebKit: boolean;
    isSafariIOS: boolean;
    willUseXHR: boolean;
    navigatorPlatform: string;
    windowWidth: number;
  }): Promise<void> {
    await this.sendLog({
      log_type: 'platform_detection',
      log_level: 'info',
      message: `Platform detected: ${details.isSafariIOS ? 'Safari iOS' : 'Other'}`,
      details,
      user_agent: details.userAgent
    });
  }

  async logXHRStart(url: string, method: string): Promise<void> {
    await this.sendLog({
      log_type: 'xhr_start',
      log_level: 'info',
      message: `XHR ${method} request to ${url}`,
      details: { url, method }
    });
  }

  async logXHRSuccess(status: number, responseLength: number): Promise<void> {
    await this.sendLog({
      log_type: 'xhr_success',
      log_level: 'info',
      message: `XHR success: ${status}, response length: ${responseLength}`,
      details: { status, responseLength }
    });
  }

  async logXHRError(error: Error, readyState: number): Promise<void> {
    await this.sendLog({
      log_type: 'xhr_error',
      log_level: 'error',
      message: `XHR error: ${error.message}`,
      details: { readyState },
      error_name: error.name,
      error_message: error.message,
      stack_trace: error.stack
    });
  }

  async logJSONParse(success: boolean, error?: Error): Promise<void> {
    await this.sendLog({
      log_type: 'json_parse',
      log_level: success ? 'info' : 'error',
      message: success ? 'JSON parse succeeded' : `JSON parse failed: ${error?.message}`,
      details: success ? {} : { error: error?.message },
      error_name: error?.name,
      error_message: error?.message,
      stack_trace: error?.stack
    });
  }

  async logError(error: Error, context: string): Promise<void> {
    await this.sendLog({
      log_type: 'error',
      log_level: 'error',
      message: `${context}: ${error.message}`,
      details: { context },
      error_name: error.name,
      error_message: error.message,
      stack_trace: error.stack
    });
  }

  async logInfo(message: string, details?: object): Promise<void> {
    await this.sendLog({
      log_type: 'info',
      log_level: 'info',
      message,
      details
    });
  }
}

export const telemetryService = new TelemetryService();
