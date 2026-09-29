/**
 * Tipos de la base de datos, con el formato de `supabase gen types typescript`.
 * Escritos a mano a partir de supabase/migrations. Cuando el proyecto esté enlazado,
 * regenéralos con `npm run db:types` en lugar de editarlos.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          currency: string
          locale: string
          timezone: string
          onboarded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          currency?: string
          locale?: string
          timezone?: string
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          currency?: string
          locale?: string
          timezone?: string
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          emoji: string
          color: string
          position: number
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          emoji: string
          color: string
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          emoji?: string
          color?: string
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount_cents: number
          description: string | null
          note: string | null
          spent_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          category_id: string
          amount_cents: number
          description?: string | null
          note?: string | null
          spent_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount_cents?: number
          description?: string | null
          note?: string | null
          spent_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          amount_cents: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          category_id?: string | null
          amount_cents: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          amount_cents?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_user_id_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      complete_onboarding: {
        Args: { p_display_name: string | null; p_categories: Json }
        Returns: undefined
      }
      search_expenses: {
        Args: { p_query?: string | null; p_category_id?: string | null; p_limit?: number }
        Returns: {
          id: string
          amount_cents: number
          description: string | null
          note: string | null
          spent_at: string
          category_id: string
          category_name: string
          category_emoji: string
          category_color: string
          day: string
          day_total_cents: number
        }[]
      }
      spending_by_category: {
        Args: { p_from: string; p_to: string }
        Returns: {
          category_id: string
          name: string
          emoji: string
          color: string
          total_cents: number
          expense_count: number
        }[]
      }
      spending_by_month: {
        Args: { p_months?: number }
        Returns: { month: string; total_cents: number }[]
      }
      expense_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          today_cents: number
          week_cents: number
          month_cents: number
          total_cents: number
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
