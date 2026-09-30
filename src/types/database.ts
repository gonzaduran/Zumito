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
          place_id: string | null
          mood: string | null
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
          place_id?: string | null
          mood?: string | null
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
          place_id?: string | null
          mood?: string | null
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
          {
            foreignKeyName: "expenses_place_id_user_id_fkey"
            columns: ["place_id", "user_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      places: {
        Row: { id: string; user_id: string; name: string; created_at: string }
        Insert: { id?: string; user_id?: string; name: string; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      people: {
        Row: { id: string; user_id: string; name: string; created_at: string }
        Insert: { id?: string; user_id?: string; name: string; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      expense_people: {
        Row: { expense_id: string; person_id: string; user_id: string }
        Insert: { expense_id: string; person_id: string; user_id?: string }
        Update: { expense_id?: string; person_id?: string; user_id?: string }
        Relationships: [
          {
            foreignKeyName: "expense_people_expense_id_user_id_fkey"
            columns: ["expense_id", "user_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "expense_people_person_id_user_id_fkey"
            columns: ["person_id", "user_id"]
            isOneToOne: false
            referencedRelation: "people"
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
        Args: {
          p_query?: string | null
          p_category_id?: string | null
          p_place_id?: string | null
          p_person_id?: string | null
          p_min_cents?: number | null
          p_max_cents?: number | null
          p_limit?: number
        }
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
          place_id: string | null
          place_name: string | null
          mood: string | null
          people: Json
          day: string
          day_total_cents: number
        }[]
      }
      save_expense: {
        Args: {
          p_id: string
          p_category_id: string
          p_amount_cents: number
          p_spent_at: string
          p_description?: string | null
          p_note?: string | null
          p_place?: string | null
          p_mood?: string | null
          p_person_ids?: string[]
          p_new_people?: string[]
        }
        Returns: undefined
      }
      places_by_frequency: {
        Args: { p_limit?: number }
        Returns: { id: string; name: string; uses: number }[]
      }
      people_by_frequency: {
        Args: { p_limit?: number }
        Returns: { id: string; name: string; uses: number }[]
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
      set_budgets: {
        Args: { p_budgets: Json }
        Returns: undefined
      }
      budget_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          category_id: string | null
          name: string | null
          emoji: string | null
          amount_cents: number
          spent_cents: number
        }[]
      }
      reorder_categories: {
        Args: { p_ids: string[] }
        Returns: undefined
      }
      delete_my_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
