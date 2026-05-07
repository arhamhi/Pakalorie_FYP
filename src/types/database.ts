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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          messages: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          messages?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          messages?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          food_data: Json
          id: string
          is_combination: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          food_data: Json
          id?: string
          is_combination?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          food_data?: Json
          id?: string
          is_combination?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          calories: number
          carbs: number | null
          created_at: string | null
          fat: number | null
          id: string
          image_path: string | null
          is_synced: boolean | null
          meal_type: string
          name: string
          protein: number | null
          user_id: string
        }
        Insert: {
          calories: number
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          image_path?: string | null
          is_synced?: boolean | null
          meal_type: string
          name: string
          protein?: number | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: string
          image_path?: string | null
          is_synced?: boolean | null
          meal_type?: string
          name?: string
          protein?: number | null
          user_id?: string
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          count: number | null
          created_at: string | null
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          id?: string
          log_date: string
          user_id: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          daily_calories: number | null
          dietary_preferences: Json | null
          display_name: string | null
          email: string
          gender: string | null
          height: number | null
          id: string
          updated_at: string | null
          weight: number | null
          year_of_birth: number | null
          is_onboarded: boolean | null
          activity_level: string | null
          goal: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          daily_calories?: number | null
          dietary_preferences?: Json | null
          display_name?: string | null
          email: string
          gender?: string | null
          height?: number | null
          id: string
          updated_at?: string | null
          weight?: number | null
          year_of_birth?: number | null
          is_onboarded?: boolean | null
          activity_level?: string | null
          goal?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          daily_calories?: number | null
          dietary_preferences?: Json | null
          display_name?: string | null
          email?: string
          gender?: string | null
          height?: number | null
          id?: string
          updated_at?: string | null
          weight?: number | null
          year_of_birth?: number | null
          is_onboarded?: boolean | null
          activity_level?: string | null
          goal?: string | null
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
            created_at: string | null
            id: string
            logged_at: string | null
            user_id: string
            weight_kg: number
          }
          Insert: {
            created_at?: string | null
            id?: string
            logged_at?: string | null
            user_id: string
            weight_kg: number
          }
          Update: {
            created_at?: string | null
            id?: string
            logged_at?: string | null
            user_id?: string
            weight_kg?: number
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

type PublicSchema = Database[Extract<keyof Database, "public">]
export type ValidSchema = Exclude<keyof Database, "__InternalSupabase">


export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: ValidSchema },
  TableName extends PublicTableNameOrOptions extends { schema: ValidSchema }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: ValidSchema }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: ValidSchema },
  TableName extends PublicTableNameOrOptions extends { schema: ValidSchema }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: ValidSchema }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: ValidSchema },
  TableName extends PublicTableNameOrOptions extends { schema: ValidSchema }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: ValidSchema }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: ValidSchema },
  EnumName extends PublicEnumNameOrOptions extends { schema: ValidSchema }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: ValidSchema }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: ValidSchema },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: ValidSchema
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: ValidSchema }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

// Type aliases for easier use
export type FoodLog = Tables<'food_logs'>;
export type HydrationLog = Tables<'hydration_logs'>;
export type WeightLog = Tables<'weight_logs'>;
export type Profile = Tables<'profiles'>;
