import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const REST_BASE = 'https://api.imoview.com.br';

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

async function runAction(action: string, params: Record<string, any>, chave: string) {
  const headers = {
    'Content-Type': 'application/json',
    'chave': chave,
  };

  switch (action) {
    case 'listar_imoveis': {
      const PAGE_SIZE = 20;
      const baseBody: Record<string, any> = {
        finalidade: params.finalidade ?? 2,
        exibircaptadores: true,
        exibiranexos: false,
      };
      const opt = ['destinacao','codigoTipo','codigocidade','codigosbairros','valorde','valorate','numeroquartos','numerovagas','areaprincipalde','ordenacao'];
      for (const k of opt) if (params[k] !== undefined && params[k] !== null && params[k] !== '') baseBody[k] = params[k];

      // PASSO 1: primeira página para descobrir o total
      const primeira = await restPost('/Imovel/RetornarImoveisDisponiveis',
        { ...baseBody, numeroPagina: 1, numeroRegistros: PAGE_SIZE }, headers);

      const quantidade: number = Number(primeira?.quantidade ?? primeira?.lista?.length ?? 0);
      const totalPaginas = Math.max(1, Math.ceil(quantidade / PAGE_SIZE));

      if (totalPaginas <= 1) return primeira;

      // PASSO 2: páginas restantes em paralelo
      const promises: Promise<any>[] = [];
      for (let pagina = 2; pagina <= totalPaginas; pagina++) {
        promises.push(
          restPost('/Imovel/RetornarImoveisDisponiveis',
            { ...baseBody, numeroPagina: pagina, numeroRegistros: PAGE_SIZE }, headers)
            .catch((e) => { console.error('Página', pagina, 'falhou:', e?.message); return { lista: [] }; })
        );
      }
      const demais = await Promise.all(promises);
      const lista = [
        ...(primeira?.lista ?? []),
        ...demais.flatMap((p) => p?.lista ?? []),
      ];
      return { ...primeira, quantidade, lista };
    }
    case 'detalhe_imovel':
      return await restGet('/Imovel/App_RetornarDetalhesImovel', params, headers);
    case 'listar_atendimentos':
      return await restGet('/Atendimento/App_RetornarAtendimentos', params, headers);
    case 'listar_clientes':
      return await restGet('/Cliente/App_RetornarPessoas', params, headers);
    default:
      throw new Error(`UNKNOWN_ACTION: ${action}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const chave = Deno.env.get('IMOVIEW_CHAVE');
    if (!chave) {
      return new Response(
        JSON.stringify({ success: false, error: 'CONFIG_MISSING', message: 'IMOVIEW_CHAVE não configurada.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, params = {} } = await req.json();
    if (!action) throw new Error('action obrigatório');

    const data = await runAction(action, params, chave);

    return new Response(
      JSON.stringify({ success: true, source: 'rest', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
