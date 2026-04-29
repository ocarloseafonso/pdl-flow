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
      blog_articles: {
        Row: {
          client_id: string
          content: string | null
          created_at: string
          format: string | null
          id: string
          intent: string | null
          keyword: string | null
          position: number
          priority: number | null
          published_url: string | null
          status: string
          title: string
        }
        Insert: {
          client_id: string
          content?: string | null
          created_at?: string
          format?: string | null
          id?: string
          intent?: string | null
          keyword?: string | null
          position?: number
          priority?: number | null
          published_url?: string | null
          status?: string
          title: string
        }
        Update: {
          client_id?: string
          content?: string | null
          created_at?: string
          format?: string | null
          id?: string
          intent?: string | null
          keyword?: string | null
          position?: number
          priority?: number | null
          published_url?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          done: boolean
          event_date: string
          event_time: string | null
          id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          event_date: string
          event_time?: string | null
          id?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          event_date?: string
          event_time?: string | null
          id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          phase_id: number
          position: number
          title: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          phase_id: number
          position?: number
          title: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          phase_id?: number
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          brand_colors: string | null
          brand_notes: string | null
          briefing_data: Json | null
          briefing_submitted_at: string | null
          briefing_token: string
          company_name: string | null
          created_at: string
          current_phase_id: number
          id: string
          name: string
          notes: string | null
          phase_started_at: string
          segment: string | null
          site_generated: boolean
          site_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_colors?: string | null
          brand_notes?: string | null
          briefing_data?: Json | null
          briefing_submitted_at?: string | null
          briefing_token?: string
          company_name?: string | null
          created_at?: string
          current_phase_id?: number
          id?: string
          name: string
          notes?: string | null
          phase_started_at?: string
          segment?: string | null
          site_generated?: boolean
          site_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_colors?: string | null
          brand_notes?: string | null
          briefing_data?: Json | null
          briefing_submitted_at?: string | null
          briefing_token?: string
          company_name?: string | null
          created_at?: string
          current_phase_id?: number
          id?: string
          name?: string
          notes?: string | null
          phase_started_at?: string
          segment?: string | null
          site_generated?: boolean
          site_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_current_phase_id_fkey"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays_br: {
        Row: {
          date: string
          id: number
          name: string
        }
        Insert: {
          date: string
          id?: number
          name: string
        }
        Update: {
          date?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      phases: {
        Row: {
          description: string | null
          expected_days: number
          id: number
          name: string
          position: number
        }
        Insert: {
          description?: string | null
          expected_days?: number
          id: number
          name: string
          position: number
        }
        Update: {
          description?: string | null
          expected_days?: number
          id?: number
          name?: string
          position?: number
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          content: string
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          id: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          description: string | null
          id: string
          phase_id: number
          position: number
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          phase_id: number
          position?: number
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          phase_id?: number
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_briefing_client: {
        Args: { _token: string }
        Returns: {
          briefing_submitted_at: string
          company_name: string
          name: string
        }[]
      }
      submit_briefing: {
        Args: { _data: Json; _token: string }
        Returns: boolean
      }
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
