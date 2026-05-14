import { supabase } from '@/integrations/supabase/client';

interface WebhookPayload {
  tipo: 'imovel' | 'cliente';
  acao: 'cadastrar' | 'desativar';
  usuario: { email: string; name: string };
  dados: Record<string, unknown>;
}

export async function sendToWebhook(payload: WebhookPayload): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-webhook', {
      body: payload,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success ?? false, error: data?.error, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { success: false, error: message };
  }
}
