import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { parse as parseXml } from 'https://deno.land/x/xml@2.1.3/mod.ts';

async function md5Hash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const REST_BASE = 'https://api.imoview.com.br';
const LEGACY_BASE = 'https://ws.imoview.com.br/Servicos.asmx';

let cachedToken: { codigo: string; expiresAt: number } | null = null;

async function getCodigoAcesso(chave: string, email: string, senha: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.codigo;

  const senhaMD5 = createHash('md5').update(senha).toString('hex');
  const url = new URL(`${REST_BASE}/Usuario/App_ValidarAcesso`);
  url.searchParams.set('email', email);
  url.searchParams.set('senha', senhaMD5);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'API Key',
      'chave': chave,
      'codigoacesso': '',
    },
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = null; }

  if (!res.ok || !json) {
    throw new Error(`LOGIN_FAIL_${res.status}: ${text.slice(0, 200)}`);
  }
  const codigo = json.codigoacesso || json.CodigoAcesso || json.codigo;
  if (!codigo) throw new Error(`LOGIN_NO_TOKEN: ${text.slice(0, 200)}`);

  cachedToken = { codigo, expiresAt: Date.now() + 50 * 60 * 1000 };
  return codigo;
}

async function restGet(path: string, params: Record<string, any>, headers: Record<string, string>) {
  const url = new URL(`${REST_BASE}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { method: 'GET', headers });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`REST_${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function restPost(path: string, body: Record<string, any>, headers: Record<string, string>) {
  const res = await fetch(`${REST_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`REST_${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function legacyGet(path: string, params: Record<string, any>) {
  const url = new URL(`${LEGACY_BASE}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { method: 'GET' });
  const text = await res.text();
  if (!res.ok) throw new Error(`LEGACY_${res.status}: ${text.slice(0, 200)}`);
  try {
    return parseXml(text);
  } catch {
    return { raw: text };
  }
}

async function runAction(action: string, params: Record<string, any>, chave: string, email: string, senha: string) {
  // Try REST API first
  try {
    const codigoacesso = await getCodigoAcesso(chave, email, senha);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'API Key',
      'chave': chave,
      'codigoacesso': codigoacesso,
    };

    switch (action) {
      case 'listar_imoveis': {
        const body: Record<string, any> = {
          finalidade: params.finalidade ?? 2,
          numeroPagina: params.numeroPagina ?? 1,
          numeroRegistros: Math.min(params.numeroRegistros ?? 20, 20),
          exibircaptadores: true,
          exibiranexos: false,
        };
        const opt = ['destinacao','codigoTipo','codigocidade','codigosbairros','valorde','valorate','numeroquartos','numerovagas','areaprincipalde','ordenacao'];
        for (const k of opt) if (params[k] !== undefined && params[k] !== null && params[k] !== '') body[k] = params[k];
        return { source: 'rest', data: await restPost('/Imovel/RetornarImoveisDisponiveis', body, headers) };
      }
      case 'detalhe_imovel':
        return { source: 'rest', data: await restGet('/Imovel/App_RetornarDetalhesImovel', params, headers) };
      case 'listar_atendimentos':
        return { source: 'rest', data: await restGet('/Atendimento/App_RetornarAtendimentos', params, headers) };
      case 'listar_clientes':
        return { source: 'rest', data: await restGet('/Cliente/App_RetornarPessoas', params, headers) };
      default:
        throw new Error(`UNKNOWN_ACTION: ${action}`);
    }
  } catch (restErr: any) {
    const msg = String(restErr?.message || '');
    // Invalidate token on auth errors
    if (msg.includes('401') || msg.includes('LOGIN_')) cachedToken = null;

    // Fallback to legacy API only for supported read actions
    const legacyMap: Record<string, string> = {
      listar_imoveis: '/RetornarImoveis',
      detalhe_imovel: '/RetornarDetalhesImovel',
    };
    const legacyPath = legacyMap[action];
    if (!legacyPath) throw restErr;

    try {
      const legacyParams: Record<string, any> = { chave };
      if (action === 'detalhe_imovel') {
        legacyParams.codigoImovel = params.codigoImovel ?? params.CodigoImovel ?? params.codigo;
      }
      const data = await legacyGet(legacyPath, legacyParams);
      return { source: 'legacy', data, restError: msg };
    } catch (legacyErr: any) {
      throw new Error(`REST failed (${msg}) and Legacy failed (${legacyErr?.message || legacyErr})`);
    }
  }
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

    const result = await runAction(action, params, chave, email, senha);

    return new Response(
      JSON.stringify({ success: true, source: result.source, data: result.data, ...(result as any).restError ? { restError: (result as any).restError } : {} }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
