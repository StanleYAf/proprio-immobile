import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const IMOVIEW_BASE = 'https://api.imoview.com.br';

let cachedToken: { codigo: string; expiresAt: number } | null = null;

async function getCodigoAcesso(chave: string, email: string, senha: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.codigo;
  const res = await fetch(`${IMOVIEW_BASE}/Usuario/App_ValidarAcesso`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'API Key',
      'chave': chave,
    },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Falha no login Imoview (${res.status}): ${t}`);
  }
  const json = await res.json();
  const codigo = json.codigoacesso || json.CodigoAcesso || json.codigo;
  if (!codigo) throw new Error('Resposta de login sem codigoacesso');
  cachedToken = { codigo, expiresAt: Date.now() + 50 * 60 * 1000 };
  return codigo;
}

async function callImoviewGet(path: string, params: Record<string, any>, headers: Record<string, string>) {
  const url = new URL(`${IMOVIEW_BASE}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { method: 'GET', headers });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`Imoview ${path} (${res.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const chave = Deno.env.get('IMOVIEW_CHAVE');
    const email = Deno.env.get('IMOVIEW_EMAIL');
    const senha = Deno.env.get('IMOVIEW_SENHA');
    if (!chave || !email || !senha) {
      return new Response(
        JSON.stringify({ success: false, error: 'CONFIG_MISSING', message: 'Credenciais do Imoview não configuradas.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, params = {} } = await req.json();
    if (!action) throw new Error('action obrigatório');

    const codigoacesso = await getCodigoAcesso(chave, email, senha);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'API Key',
      'chave': chave,
      'codigoacesso': codigoacesso,
    };

    let data: any;
    switch (action) {
      case 'listar_imoveis':
        data = await callImoviewGet('/Imovel/App_RetornarImoveis', params, headers);
        break;
      case 'detalhe_imovel':
        data = await callImoviewGet('/Imovel/App_RetornarDetalhesImovel', params, headers);
        break;
      case 'listar_atendimentos':
        data = await callImoviewGet('/Atendimento/App_RetornarAtendimentos', params, headers);
        break;
      case 'listar_clientes':
        data = await callImoviewGet('/Cliente/App_RetornarPessoas', params, headers);
        break;
      default:
        throw new Error(`action desconhecida: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    // se token expirou, invalida cache
    if (String(err?.message || '').includes('401')) cachedToken = null;
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
