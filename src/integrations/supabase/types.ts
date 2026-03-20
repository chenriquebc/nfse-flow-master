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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          is_active: boolean
          issuer: string | null
          password_encrypted: string
          serial_number: string | null
          subject: string | null
          tenant_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          is_active?: boolean
          issuer?: string | null
          password_encrypted?: string
          serial_number?: string | null
          subject?: string | null
          tenant_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          is_active?: boolean
          issuer?: string | null
          password_encrypted?: string
          serial_number?: string | null
          subject?: string | null
          tenant_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_city_code: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cnae_code: string | null
          created_at: string
          document: string
          email: string | null
          environment: number
          id: string
          is_active: boolean
          legal_name: string
          municipal_registration: string | null
          phone: string | null
          secondary_cnae_codes: string[] | null
          settings: Json | null
          state_registration: string | null
          tax_regime: number | null
          tenant_id: string
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_city_code?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnae_code?: string | null
          created_at?: string
          document: string
          email?: string | null
          environment?: number
          id?: string
          is_active?: boolean
          legal_name: string
          municipal_registration?: string | null
          phone?: string | null
          secondary_cnae_codes?: string[] | null
          settings?: Json | null
          state_registration?: string | null
          tax_regime?: number | null
          tenant_id: string
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_city_code?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnae_code?: string | null
          created_at?: string
          document?: string
          email?: string | null
          environment?: number
          id?: string
          is_active?: boolean
          legal_name?: string
          municipal_registration?: string | null
          phone?: string | null
          secondary_cnae_codes?: string[] | null
          settings?: Json | null
          state_registration?: string | null
          tax_regime?: number | null
          tenant_id?: string
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          error_code: string | null
          error_message: string | null
          event_type: Database["public"]["Enums"]["nfse_event_type"]
          id: string
          invoice_id: string
          metadata: Json | null
          request_xml: string | null
          response_xml: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type: Database["public"]["Enums"]["nfse_event_type"]
          id?: string
          invoice_id: string
          metadata?: Json | null
          request_xml?: string | null
          response_xml?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: Database["public"]["Enums"]["nfse_event_type"]
          id?: string
          invoice_id?: string
          metadata?: Json | null
          request_xml?: string | null
          response_xml?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfse_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "nfse_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_invoices: {
        Row: {
          approx_tax_mode: string | null
          base_value: number | null
          batch_number: string | null
          cnae_code: string | null
          cofins_value: number | null
          company_id: string
          competence_date: string
          conditional_discount: number | null
          created_at: string
          created_by: string | null
          csll_value: number | null
          danfse_path: string | null
          deduction_value: number | null
          discount_value: number | null
          external_reference: string | null
          id: string
          inss_value: number | null
          intermediary_city: string | null
          intermediary_city_code: string | null
          intermediary_document: string | null
          intermediary_name: string | null
          intermediary_state: string | null
          intermediary_type: string | null
          intermediary_value: number | null
          invoice_number: number | null
          ir_value: number | null
          irrf_value: number | null
          iss_rate: number | null
          iss_retained: boolean | null
          iss_value: number | null
          issqn_city: string | null
          issqn_exemption: boolean
          issqn_retained_by_taker: boolean | null
          issqn_suspended: boolean | null
          issqn_taxation: string | null
          issued_at: string | null
          metadata: Json | null
          municipal_benefit: boolean | null
          municipal_tax_code: string | null
          nbs_code: string | null
          net_value: number | null
          notes: string | null
          other_deductions: number | null
          pis_cofins_csll_retention_type: string | null
          pis_cofins_situation: string | null
          pis_value: number | null
          protocol_number: string | null
          replaced_invoice_id: string | null
          rps_number: number | null
          rps_series: string | null
          rps_type: number | null
          service_description: string
          service_value: number
          simples_nacional_rate: number | null
          social_contributions_retained: number | null
          social_security_retained: number | null
          special_tax_regime: string | null
          status: Database["public"]["Enums"]["nfse_status"]
          taker_address_city: string | null
          taker_address_city_code: string | null
          taker_address_number: string | null
          taker_address_state: string | null
          taker_address_street: string | null
          taker_address_zip: string | null
          taker_document: string
          taker_email: string | null
          taker_name: string
          taker_phone: string | null
          tax_assessment_regime: string | null
          tax_code: string
          tenant_id: string
          unconditional_discount: number | null
          updated_at: string
          verification_code: string | null
          xml_authorized: string | null
          xml_response: string | null
          xml_rps: string | null
          xml_signed: string | null
        }
        Insert: {
          approx_tax_mode?: string | null
          base_value?: number | null
          batch_number?: string | null
          cnae_code?: string | null
          cofins_value?: number | null
          company_id: string
          competence_date?: string
          conditional_discount?: number | null
          created_at?: string
          created_by?: string | null
          csll_value?: number | null
          danfse_path?: string | null
          deduction_value?: number | null
          discount_value?: number | null
          external_reference?: string | null
          id?: string
          inss_value?: number | null
          intermediary_city?: string | null
          intermediary_city_code?: string | null
          intermediary_document?: string | null
          intermediary_name?: string | null
          intermediary_state?: string | null
          intermediary_type?: string | null
          intermediary_value?: number | null
          invoice_number?: number | null
          ir_value?: number | null
          irrf_value?: number | null
          iss_rate?: number | null
          iss_retained?: boolean | null
          iss_value?: number | null
          issqn_city?: string | null
          issqn_exemption?: boolean
          issqn_retained_by_taker?: boolean | null
          issqn_suspended?: boolean | null
          issqn_taxation?: string | null
          issued_at?: string | null
          metadata?: Json | null
          municipal_benefit?: boolean | null
          municipal_tax_code?: string | null
          nbs_code?: string | null
          net_value?: number | null
          notes?: string | null
          other_deductions?: number | null
          pis_cofins_csll_retention_type?: string | null
          pis_cofins_situation?: string | null
          pis_value?: number | null
          protocol_number?: string | null
          replaced_invoice_id?: string | null
          rps_number?: number | null
          rps_series?: string | null
          rps_type?: number | null
          service_description?: string
          service_value?: number
          simples_nacional_rate?: number | null
          social_contributions_retained?: number | null
          social_security_retained?: number | null
          special_tax_regime?: string | null
          status?: Database["public"]["Enums"]["nfse_status"]
          taker_address_city?: string | null
          taker_address_city_code?: string | null
          taker_address_number?: string | null
          taker_address_state?: string | null
          taker_address_street?: string | null
          taker_address_zip?: string | null
          taker_document?: string
          taker_email?: string | null
          taker_name?: string
          taker_phone?: string | null
          tax_assessment_regime?: string | null
          tax_code?: string
          tenant_id: string
          unconditional_discount?: number | null
          updated_at?: string
          verification_code?: string | null
          xml_authorized?: string | null
          xml_response?: string | null
          xml_rps?: string | null
          xml_signed?: string | null
        }
        Update: {
          approx_tax_mode?: string | null
          base_value?: number | null
          batch_number?: string | null
          cnae_code?: string | null
          cofins_value?: number | null
          company_id?: string
          competence_date?: string
          conditional_discount?: number | null
          created_at?: string
          created_by?: string | null
          csll_value?: number | null
          danfse_path?: string | null
          deduction_value?: number | null
          discount_value?: number | null
          external_reference?: string | null
          id?: string
          inss_value?: number | null
          intermediary_city?: string | null
          intermediary_city_code?: string | null
          intermediary_document?: string | null
          intermediary_name?: string | null
          intermediary_state?: string | null
          intermediary_type?: string | null
          intermediary_value?: number | null
          invoice_number?: number | null
          ir_value?: number | null
          irrf_value?: number | null
          iss_rate?: number | null
          iss_retained?: boolean | null
          iss_value?: number | null
          issqn_city?: string | null
          issqn_exemption?: boolean
          issqn_retained_by_taker?: boolean | null
          issqn_suspended?: boolean | null
          issqn_taxation?: string | null
          issued_at?: string | null
          metadata?: Json | null
          municipal_benefit?: boolean | null
          municipal_tax_code?: string | null
          nbs_code?: string | null
          net_value?: number | null
          notes?: string | null
          other_deductions?: number | null
          pis_cofins_csll_retention_type?: string | null
          pis_cofins_situation?: string | null
          pis_value?: number | null
          protocol_number?: string | null
          replaced_invoice_id?: string | null
          rps_number?: number | null
          rps_series?: string | null
          rps_type?: number | null
          service_description?: string
          service_value?: number
          simples_nacional_rate?: number | null
          social_contributions_retained?: number | null
          social_security_retained?: number | null
          special_tax_regime?: string | null
          status?: Database["public"]["Enums"]["nfse_status"]
          taker_address_city?: string | null
          taker_address_city_code?: string | null
          taker_address_number?: string | null
          taker_address_state?: string | null
          taker_address_street?: string | null
          taker_address_zip?: string | null
          taker_document?: string
          taker_email?: string | null
          taker_name?: string
          taker_phone?: string | null
          tax_assessment_regime?: string | null
          tax_code?: string
          tenant_id?: string
          unconditional_discount?: number | null
          updated_at?: string
          verification_code?: string | null
          xml_authorized?: string | null
          xml_response?: string | null
          xml_rps?: string | null
          xml_signed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_invoices_replaced_invoice_id_fkey"
            columns: ["replaced_invoice_id"]
            isOneToOne: false
            referencedRelation: "nfse_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activated_at: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          provisioned_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          provisioned_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          provisioned_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          document: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          plan: string
          settings: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string
          email?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          plan?: string
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          plan?: string
          settings?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_tenant_for_user: {
        Args: {
          _tenant_document?: string
          _tenant_email?: string
          _tenant_name: string
        }
        Returns: string
      }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
      job_status: "pending" | "processing" | "completed" | "failed" | "retrying"
      job_type:
        | "emit"
        | "cancel"
        | "substitute"
        | "query_batch"
        | "query_status"
      nfse_event_type:
        | "created"
        | "xml_generated"
        | "xml_signed"
        | "submitted"
        | "protocol_received"
        | "batch_queried"
        | "authorized"
        | "rejected"
        | "cancelled"
        | "substituted"
        | "error"
      nfse_status:
        | "draft"
        | "processing"
        | "authorized"
        | "rejected"
        | "cancelled"
        | "substituted"
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
    Enums: {
      app_role: ["admin", "operator", "viewer"],
      job_status: ["pending", "processing", "completed", "failed", "retrying"],
      job_type: ["emit", "cancel", "substitute", "query_batch", "query_status"],
      nfse_event_type: [
        "created",
        "xml_generated",
        "xml_signed",
        "submitted",
        "protocol_received",
        "batch_queried",
        "authorized",
        "rejected",
        "cancelled",
        "substituted",
        "error",
      ],
      nfse_status: [
        "draft",
        "processing",
        "authorized",
        "rejected",
        "cancelled",
        "substituted",
      ],
    },
  },
} as const
