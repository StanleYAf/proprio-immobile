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

// GET com fallback entre múltiplos paths (útil quando o nome do endpoint varia)
async function restGetFallback(paths: string[], params: Record<string, any>, headers: Record<string, string>) {
  let lastErr = '';
  let lastUrl = '';
  for (const path of paths) {
    const url = new URL(`${REST_BASE}${path}`);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
    lastUrl = url.toString();
    const res = await fetch(lastUrl, { method: 'GET', headers });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    if (res.ok) {
      console.log(`[imoview-proxy] OK em ${path}`);
      return data;
    }
    lastErr = `REST_${res.status} em ${lastUrl}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`;
    console.warn(`[imoview-proxy] Falhou ${path} -> ${res.status}`);
    if (res.status !== 404) throw new Error(lastErr);
  }
  throw new Error(lastErr || `Nenhum endpoint válido entre: ${paths.join(', ')}`);
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

// Paginação automática para endpoints GET que retornam { quantidade, lista }
async function getAllPages(
  path: string,
  baseParams: Record<string, any>,
  headers: Record<string, string>,
  pageSize = 20,
) {
  const primeira = await restGet(path, { ...baseParams, numeroPagina: 1, numeroRegistros: pageSize }, headers);
  const quantidade: number = Number(primeira?.quantidade ?? primeira?.lista?.length ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(quantidade / pageSize));
  if (totalPaginas <= 1) return primeira;
  const promises: Promise<any>[] = [];
  for (let p = 2; p <= totalPaginas; p++) {
    promises.push(
      restGet(path, { ...baseParams, numeroPagina: p, numeroRegistros: pageSize }, headers)
        .catch((e) => { console.error('Página', p, 'falhou:', e?.message); return { lista: [] }; })
    );
  }
  const demais = await Promise.all(promises);
  const lista = [...(primeira?.lista ?? []), ...demais.flatMap((p) => p?.lista ?? [])];
  return { ...primeira, quantidade, lista };
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

      const primeira = await restPost('/Imovel/RetornarImoveisDisponiveis',
        { ...baseBody, numeroPagina: 1, numeroRegistros: PAGE_SIZE }, headers);

      const quantidade: number = Number(primeira?.quantidade ?? primeira?.lista?.length ?? 0);
      const totalPaginas = Math.max(1, Math.ceil(quantidade / PAGE_SIZE));

      if (totalPaginas <= 1) return primeira;

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

    case 'imoveis_alterados': {
      const body = {
        codigosimoveis: params.codigosimoveis ? String(params.codigosimoveis) : '',
        numeroPagina: params.numeroPagina ?? 1,
        numeroRegistros: params.numeroRegistros ?? 20,
        dataHoraInicial: params.dataHoraInicial ?? '',
        dataHoraFinal: params.dataHoraFinal ?? '',
      };
      return await restPost('/Imovel/RetornarImoveisAlterados', body, headers);
    }

    case 'listar_atendimentos': {
      // Endpoint correto: /Atendimento/RetornarAtendimentos (sem App_)
      // Requer TODOS os parâmetros — numéricos vazios = 0, strings vazias = ""
      const PAGE_SIZE = Math.min(Number(params.numeroRegistros) || 20, 20);
      const path = '/Atendimento/RetornarAtendimentos';
      const buildQuery = (pagina: number) => ({
        numeroPagina: pagina,
        numeroRegistros: PAGE_SIZE,
        finalidade: params.finalidade ?? 1,
        situacao: params.situacao ?? 0,
        fase: params.fase ?? 0,
        codigoUnidade: params.codigoUnidade ?? 0,
        codigoCliente: params.codigoCliente ?? 0,
        codigoCorretor: params.codigoCorretor ?? 0,
        codigoMql: params.codigoMql ?? 0,
        codigoMidia: params.codigoMidia ?? 0,
        codigoTipo: params.codigoTipo ?? 0,
        dataInicial: params.dataInicial ?? '',
        dataFinal: params.dataFinal ?? '',
        opcaoAtendimento: params.opcaoAtendimento ?? 0,
        dataHoraInicialUltimaAlteracao: params.dataHoraInicialUltimaAlteracao ?? '',
        dataHoraFinalUltimaAlteracao: params.dataHoraFinalUltimaAlteracao ?? '',
      });
      const primeira = await restGet(path, buildQuery(1), headers);
      const quantidade: number = Number(primeira?.quantidade ?? primeira?.lista?.length ?? 0);
      const totalPaginas = Math.max(1, Math.ceil(quantidade / PAGE_SIZE));
      if (totalPaginas <= 1) return primeira;
      const promises: Promise<any>[] = [];
      for (let p = 2; p <= totalPaginas; p++) {
        promises.push(
          restGet(path, buildQuery(p), headers)
            .catch((e) => { console.error('Página', p, 'falhou:', e?.message); return { lista: [] }; })
        );
      }
      const demais = await Promise.all(promises);
      const lista = [...(primeira?.lista ?? []), ...demais.flatMap((p: any) => p?.lista ?? [])];
      return { ...primeira, quantidade, lista };
    }

    // detalhe_atendimento removido — o endpoint individual não existe na API Imoview.
    // Os detalhes vêm embutidos em cada item de listar_atendimentos.



    case 'imoveis_encontrados':
      return await restGet('/Atendimento/App_RetornarImoveisEncontrados', params, headers);

    case 'imoveis_carrinho':
      return await restGet('/Atendimento/App_RetornarImoveisCarrinho', params, headers);

    case 'imoveis_visita':
      return await restGet('/Atendimento/App_RetornarImoveisVisita', params, headers);

    case 'imoveis_proposta':
      return await restGet('/Atendimento/App_RetornarImoveisProposta', params, headers);

    case 'incluir_interacao':
      return await restPost('/Atendimento/App_IncluirInteracao', params, headers);

    case 'incluir_atendimento':
      return await restPost('/Atendimento/App_IncluirAtendimento', params, headers);

    case 'salvar_atendimento':
      return await restPost('/Atendimento/App_SalvarAtendimento', params, headers);

    case 'descartar_atendimento':
      return await restPost('/Atendimento/App_DescartarAtendimento', params, headers);

    case 'listar_clientes': {
      const PAGE_SIZE = Math.min(Number(params.numeroRegistros) || 20, 20);
      const { numeroPagina: _np, numeroRegistros: _nr, ...rest } = params || {};
      return await getAllPages('/Cliente/App_RetornarPessoas', rest, headers, PAGE_SIZE);
    }

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
