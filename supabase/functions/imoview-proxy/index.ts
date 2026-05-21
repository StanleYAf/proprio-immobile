import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { parse as parseXml } from 'https://deno.land/x/xml@2.1.3/mod.ts';

function md5Hash(text: string): string {
  const msg = (b: number, c: number) => {
    const d: number[] = [];
    const e = (f: number) => {
      let g = f;
      for (let h = 0; h < 4; h++) d.push((g & 255) >>> 0), g >>>= 8;
    };
    e(b);
    e(c);
    return d;
  };
  const safeAdd = (x: number, y: number) => {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  };
  const bitRotateLeft = (num: number, cnt: number) => (num << cnt) | (num >>> (32 - cnt));
  const md5cmn = (q: number, a: number, b: number, x: number, s: number, t: number) => safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  const md5ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => md5cmn((b & c) | (~b & d), a, b, x, s, t);
  const md5gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  const md5hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => md5cmn(b ^ c ^ d, a, b, x, s, t);
  const md5ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => md5cmn(c ^ (b | ~d), a, b, x, s, t);

  const binlMD5 = (x: number[], len: number) => {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d;
      a = md5ff(a, b, c, d, x[i], 7, -680876936);
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5hh(d, a, b, c, x[i], 11, -358537222);
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = md5ii(a, b, c, d, x[i], 6, -198630844);
      d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  };

  const rstr2hex = (input: number[]) => {
    const hexTab = '0123456789abcdef';
    let output = '';
    for (let i = 1; i < input.length * 4; i++) {
      output += hexTab.charAt((input[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) +
                hexTab.charAt((input[i >> 2] >> ((i % 4) * 8)) & 0xf);
    }
    return output;
  };

  const str2binl = (str: string) => {
    const bin: number[] = [];
    const mask = (1 << 8) - 1;
    for (let i = 0; i < str.length * 8; i += 8) {
      bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32);
    }
    return bin;
  };

  return rstr2hex(binlMD5(str2binl(text), text.length * 8));
}

const REST_BASE = 'https://api.imoview.com.br';
const LEGACY_BASE = 'https://ws.imoview.com.br/Servicos.asmx';

let cachedToken: { codigo: string; expiresAt: number } | null = null;

async function getCodigoAcesso(chave: string, email: string, senha: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.codigo;

  const senhaMD5 = md5Hash(senha).toUpperCase();
  const url = new URL(`${REST_BASE}/Usuario/App_ValidarAcesso`);
  url.searchParams.set('email', email);
  // Try MD5 first, fallback to plain if needed
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
