export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allowed_users: {
        Row: {
          classificacao: string
          created_at: string
          email: string
          id: string
          is_admin: boolean
          nome: string
        }
        Insert: {
          classificacao?: string
          created_at?: string
          email: string
          id?: string
          is_admin?: boolean
          nome?: string
        }
        Update: {
          classificacao?: string
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          nome?: string
        }
        Relationships: []
      }
      atendimento_historico: {
        Row: {
          atendimento_id: string | null
          conteudo: string
          corretor_email: string | null
          created_at: string | null
          id: string
          tipo: string | null
        }
        Insert: {
          atendimento_id?: string | null
          conteudo: string
          corretor_email?: string | null
          created_at?: string | null
          id?: string
          tipo?: string | null
        }
        Update: {
          atendimento_id?: string | null
          conteudo?: string
          corretor_email?: string | null
          created_at?: string | null
          id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_historico_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_imoveis: {
        Row: {
          atendimento_id: string | null
          created_at: string | null
          id: string
          imovel_id: string | null
          status: string | null
        }
        Insert: {
          atendimento_id?: string | null
          created_at?: string | null
          id?: string
          imovel_id?: string | null
          status?: string | null
        }
        Update: {
          atendimento_id?: string | null
          created_at?: string | null
          id?: string
          imovel_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_imoveis_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_imoveis_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          area_min: number | null
          bairros_interesse: string[] | null
          cidade_interesse: string | null
          cliente_id: string | null
          codigo: string | null
          corretor_email: string | null
          created_at: string | null
          etapa: string | null
          finalidade_interesse: string | null
          id: string
          imovel_origem_id: string | null
          notas: string | null
          quartos_min: number | null
          status: string | null
          tipo_interesse: string[] | null
          updated_at: string | null
          vagas_min: number | null
          valor_max: number | null
          valor_min: number | null
        }
        Insert: {
          area_min?: number | null
          bairros_interesse?: string[] | null
          cidade_interesse?: string | null
          cliente_id?: string | null
          codigo?: string | null
          corretor_email?: string | null
          created_at?: string | null
          etapa?: string | null
          finalidade_interesse?: string | null
          id?: string
          imovel_origem_id?: string | null
          notas?: string | null
          quartos_min?: number | null
          status?: string | null
          tipo_interesse?: string[] | null
          updated_at?: string | null
          vagas_min?: number | null
          valor_max?: number | null
          valor_min?: number | null
        }
        Update: {
          area_min?: number | null
          bairros_interesse?: string[] | null
          cidade_interesse?: string | null
          cliente_id?: string | null
          codigo?: string | null
          corretor_email?: string | null
          created_at?: string | null
          etapa?: string | null
          finalidade_interesse?: string | null
          id?: string
          imovel_origem_id?: string | null
          notas?: string | null
          quartos_min?: number | null
          status?: string | null
          tipo_interesse?: string[] | null
          updated_at?: string | null
          vagas_min?: number | null
          valor_max?: number | null
          valor_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_imovel_origem_id_fkey"
            columns: ["imovel_origem_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          corretor_email: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          estado_civil: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          profissao: string | null
          renda: number | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          corretor_email?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          estado_civil?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          profissao?: string | null
          renda?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          corretor_email?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          estado_civil?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          profissao?: string | null
          renda?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      imoveis: {
        Row: {
          andar: number | null
          area_externa: number | null
          area_interna: number | null
          area_lote: number | null
          bairro: string | null
          banheiros: number | null
          cep: string | null
          cidade: string | null
          codigo: string | null
          complemento: string | null
          condominio: number | null
          corretor_email: string | null
          created_at: string | null
          descricao: string | null
          destinacao: string[] | null
          endereco: string | null
          estado: string | null
          finalidade: string | null
          financiamento: string | null
          fotos: string[] | null
          id: string
          iptu: number | null
          lazer: string[] | null
          nome_proprietario: string | null
          numero: string | null
          quartos: number | null
          salas: number | null
          status: string | null
          suites: number | null
          telefone_proprietario: string | null
          tipo: string | null
          tipo_vaga: string | null
          updated_at: string | null
          vagas: number | null
          valor: number | null
          varandas: number | null
        }
        Insert: {
          andar?: number | null
          area_externa?: number | null
          area_interna?: number | null
          area_lote?: number | null
          bairro?: string | null
          banheiros?: number | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          condominio?: number | null
          corretor_email?: string | null
          created_at?: string | null
          descricao?: string | null
          destinacao?: string[] | null
          endereco?: string | null
          estado?: string | null
          finalidade?: string | null
          financiamento?: string | null
          fotos?: string[] | null
          id?: string
          iptu?: number | null
          lazer?: string[] | null
          nome_proprietario?: string | null
          numero?: string | null
          quartos?: number | null
          salas?: number | null
          status?: string | null
          suites?: number | null
          telefone_proprietario?: string | null
          tipo?: string | null
          tipo_vaga?: string | null
          updated_at?: string | null
          vagas?: number | null
          valor?: number | null
          varandas?: number | null
        }
        Update: {
          andar?: number | null
          area_externa?: number | null
          area_interna?: number | null
          area_lote?: number | null
          bairro?: string | null
          banheiros?: number | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          condominio?: number | null
          corretor_email?: string | null
          created_at?: string | null
          descricao?: string | null
          destinacao?: string[] | null
          endereco?: string | null
          estado?: string | null
          finalidade?: string | null
          financiamento?: string | null
          fotos?: string[] | null
          id?: string
          iptu?: number | null
          lazer?: string[] | null
          nome_proprietario?: string | null
          numero?: string | null
          quartos?: number | null
          salas?: number | null
          status?: string | null
          suites?: number | null
          telefone_proprietario?: string | null
          tipo?: string | null
          tipo_vaga?: string | null
          updated_at?: string | null
          vagas?: number | null
          valor?: number | null
          varandas?: number | null
        }
        Relationships: []
      }
      sent_records: {
        Row: {
          acao: string
          created_at: string
          dados: Json
          id: string
          status: string
          tipo: string
          titulo: string
          usuario_email: string
        }
        Insert: {
          acao: string
          created_at?: string
          dados?: Json
          id?: string
          status?: string
          tipo: string
          titulo: string
          usuario_email: string
        }
        Update: {
          acao?: string
          created_at?: string
          dados?: Json
          id?: string
          status?: string
          tipo?: string
          titulo?: string
          usuario_email?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
