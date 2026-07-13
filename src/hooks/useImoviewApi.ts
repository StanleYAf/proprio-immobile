import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export async function callImoview<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('imoview-proxy', {
    body: { action, params },
  });
  if (error) throw error;
  if (!data?.success) {
    const err: any = new Error(data?.message || data?.error || 'Erro na API Imoview');
    err.code = data?.error;
    throw err;
  }
  return data.data as T;
}

export type ImoveisFiltros = {
  numeroPagina?: number;
  numeroRegistros?: number;
  status?: string;
  finalidade?: string;
  tipo?: string;
  bairro?: string;
  cidade?: string;
};

export function useImoviewImoveis(filtros: ImoveisFiltros) {
  return useQuery({
    queryKey: ['imoview', 'imoveis', filtros],
    queryFn: () => callImoview('listar_imoveis', filtros),
    retry: false,
  });
}

export function useImoviewImovelDetalhe(codigoImovel?: string | number | null) {
  return useQuery({
    queryKey: ['imoview', 'imovel', codigoImovel],
    queryFn: () => callImoview('detalhe_imovel', { codigoImovel }),
    enabled: !!codigoImovel,
    retry: false,
  });
}

export function useImoviewImoveisAlterados(codigoImovel?: string | number | null) {
  return useQuery({
    queryKey: ['imoview', 'imoveis-alterados', codigoImovel],
    queryFn: () => callImoview('imoveis_alterados', {
      codigosimoveis: String(codigoImovel),
      numeroPagina: 1,
      numeroRegistros: 20,
    }),
    enabled: !!codigoImovel,
    retry: false,
  });
}

export type AtendimentosFiltros = {
  codigoUsuario?: string | number;
  status?: string;
};

export function useImoviewAtendimentos(filtros: AtendimentosFiltros = {}) {
  return useQuery({
    queryKey: ['imoview', 'atendimentos', filtros],
    queryFn: () => callImoview('listar_atendimentos', filtros),
    retry: false,
  });
}

// detalhe_atendimento removido: o endpoint individual não existe na API Imoview.
// Os detalhes vêm embutidos em cada item de listar_atendimentos.


export function useImoviewImoveisEncontrados(codigoAtendimento?: string | number | null) {
  return useQuery({
    queryKey: ['imoview', 'atendimento-encontrados', codigoAtendimento],
    queryFn: () => callImoview('imoveis_encontrados', { codigoAtendimento }),
    enabled: !!codigoAtendimento,
    retry: false,
  });
}

export function useImoviewImoveisCarrinho(codigoAtendimento?: string | number | null) {
  return useQuery({
    queryKey: ['imoview', 'atendimento-carrinho', codigoAtendimento],
    queryFn: () => callImoview('imoveis_carrinho', { codigoAtendimento }),
    enabled: !!codigoAtendimento,
    retry: false,
  });
}

export function useImoviewImoveisVisita(codigoAtendimento?: string | number | null) {
  return useQuery({
    queryKey: ['imoview', 'atendimento-visita', codigoAtendimento],
    queryFn: () => callImoview('imoveis_visita', { codigoAtendimento }),
    enabled: !!codigoAtendimento,
    retry: false,
  });
}

export function useImoviewImoveisProposta(codigoAtendimento?: string | number | null) {
  return useQuery({
    queryKey: ['imoview', 'atendimento-proposta', codigoAtendimento],
    queryFn: () => callImoview('imoveis_proposta', { codigoAtendimento }),
    enabled: !!codigoAtendimento,
    retry: false,
  });
}
