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
          premium_comp: boolean
          welcome_offer_started_at: string | null
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
          account_id: string
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
          account_id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
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
      subscriptions: {
        Row: {
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          status: string | null
          price_id: string | null
          billing_interval: string | null
          trial_end: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          trial_used: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          status?: string | null
          price_id?: string | null
          billing_interval?: string | null
          trial_end?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_used?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          status?: string | null
          price_id?: string | null
          billing_interval?: string | null
          trial_end?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          trial_used?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: { id: string; type: string; processed_at: string }
        Insert: { id: string; type: string; processed_at?: string }
        Update: { id?: string; type?: string; processed_at?: string }
        Relationships: []
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
      recurring_incomes: {
        Row: {
          id: string
          user_id: string
          description: string
          amount_cents: number
          day_of_month: number
          active: boolean
          starts_on: string
          last_period: string | null
          account_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          description: string
          amount_cents: number
          day_of_month: number
          active?: boolean
          starts_on?: string
          last_period?: string | null
          created_at?: string
          account_id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          id?: string
          user_id?: string
          description?: string
          amount_cents?: number
          day_of_month?: number
          active?: boolean
          starts_on?: string
          last_period?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          id: string
          user_id: string
          description: string
          amount_cents: number
          received_at: string
          recurring_id: string | null
          period: string | null
          account_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          description: string
          amount_cents: number
          received_at?: string
          recurring_id?: string | null
          period?: string | null
          created_at?: string
          account_id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          id?: string
          user_id?: string
          description?: string
          amount_cents?: number
          received_at?: string
          recurring_id?: string | null
          period?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_recurring_id_user_id_fkey"
            columns: ["recurring_id", "user_id"]
            isOneToOne: false
            referencedRelation: "recurring_incomes"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      split_buckets: {
        Row: {
          id: string
          user_id: string
          recurring_id: string
          name: string
          emoji: string
          percent: number
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          recurring_id: string
          name: string
          emoji: string
          percent: number
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recurring_id?: string
          name?: string
          emoji?: string
          percent?: number
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          user_id: string | null
          kind: string
          message: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          kind: string
          message: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          kind?: string
          message?: string
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: { id: boolean; beta_open: boolean; updated_at: string }
        Insert: { id?: boolean; beta_open?: boolean; updated_at?: string }
        Update: { id?: boolean; beta_open?: boolean; updated_at?: string }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          emoji: string
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
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      save_split: {
        Args: { p_recurring_id: string; p_buckets: Json }
        Returns: undefined
      }
      split_status: {
        Args: { p_recurring_id: string; p_from: string; p_to: string }
        Returns: {
          id: string
          name: string
          emoji: string
          percent: number
          target_cents: number
          spent_cents: number
          category_ids: string[]
        }[]
      }
      apply_recurring_incomes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      account_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          id: string
          name: string
          emoji: string
          spent_cents: number
          income_cents: number
        }[]
      }
      default_account_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      income_total: {
        Args: { p_from: string; p_to: string; p_account_id?: string | null }
        Returns: number
      }
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
          p_account_id?: string | null
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
          account_id: string
        }[]
      }
      is_premium: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      start_welcome_offer: {
        Args: Record<PropertyKey, never>
        Returns: string
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
          p_account_id?: string | null
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
        Args: { p_from: string; p_to: string; p_account_id?: string | null }
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
        Args: { p_months?: number; p_account_id?: string | null }
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
