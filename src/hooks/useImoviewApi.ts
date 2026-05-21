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

export function useImoviewAtendimentos(filtros: { numeroPagina?: number; numeroRegistros?: number; codigoUsuario?: string; status?: string }) {
  return useQuery({
    queryKey: ['imoview', 'atendimentos', filtros],
    queryFn: () => callImoview('listar_atendimentos', filtros),
    retry: false,
  });
}
