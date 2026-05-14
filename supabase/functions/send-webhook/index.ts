import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get('WEBHOOK_URL');
    if (!webhookUrl) {
      return new Response(JSON.stringify({ success: false, status: 'erro', error: 'WEBHOOK_URL não configurada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const body = await req.json();
    const { tipo, acao, usuario, dados } = body;

    const payload = {
      tipo,
      acao,
      usuario,
      dados,
      timestamp: new Date().toISOString(),
    };

    let status = 'enviado';
    let errorMsg = '';
    let webhookData: Record<string, unknown> = {};

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });


      const responseText = await webhookResponse.text();
      console.log(`Webhook response status: ${webhookResponse.status}, body: ${responseText}`);
      
      if (!webhookResponse.ok) {
        status = 'erro';
        errorMsg = `Webhook retornou ${webhookResponse.status}: ${responseText.substring(0, 200)}`;
      } else {
        try {
          webhookData = JSON.parse(responseText);
        } catch {
          // response is not JSON, ignore
        }
      }
    } catch (fetchError) {
      status = 'erro';
      errorMsg = fetchError.message || 'Falha ao conectar com webhook';
    }

    // Store record in database regardless of webhook result
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let titulo = '';
    if (tipo === 'imovel' && acao === 'cadastrar') titulo = dados.titulo || 'Imóvel';
    else if (tipo === 'imovel' && acao === 'desativar') titulo = `Desativar Imóvel ${dados.codigo || ''}`;
    else if (tipo === 'cliente' && acao === 'cadastrar') titulo = dados.nome || 'Cliente';
    else if (tipo === 'cliente' && acao === 'desativar') titulo = `Desativar Cliente ${dados.codigo || ''}`;

    await supabase.from('sent_records').insert({
      tipo,
      acao,
      titulo: titulo.trim(),
      dados,
      status,
      usuario_email: usuario?.email || 'desconhecido',
    });

    // Always return 200 so the frontend can read the response
    return new Response(JSON.stringify({ success: status === 'enviado', status, error: errorMsg || undefined, ...webhookData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, status: 'erro', error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
