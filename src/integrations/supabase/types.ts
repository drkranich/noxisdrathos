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
      admin_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          level: string
          publish_at: string
          title: string
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          level?: string
          publish_at?: string
          title: string
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          level?: string
          publish_at?: string
          title?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          content_id: string
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          content_id: string
          created_at: string
          id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          content_id: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          content_id?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          banner_bucket: string | null
          banner_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_featured: boolean
          publish_at: string | null
          required_plan_id: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_bucket: string | null
          thumbnail_path: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          banner_bucket?: string | null
          banner_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          required_plan_id?: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_bucket?: string | null
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          banner_bucket?: string | null
          banner_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          required_plan_id?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_bucket?: string | null
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          content_id: string
          created_at: string
          id: string
          is_hidden: boolean
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          content_id: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          attachment_paths: Json
          banner_bucket: string | null
          banner_path: string | null
          body_md: string | null
          category_id: string | null
          content_kind: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          external_url: string | null
          id: string
          is_featured: boolean
          media_metadata: Json
          preview_md: string | null
          publish_at: string | null
          reading_minutes: number | null
          required_plan_id: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          storage_bucket: string | null
          storage_path: string | null
          subtitle: string | null
          tags: string[]
          thumbnail_bucket: string
          thumbnail_url: string | null
          title: string
          trailer_bucket: string | null
          trailer_path: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Insert: {
          attachment_paths?: Json
          banner_bucket?: string | null
          banner_path?: string | null
          body_md?: string | null
          category_id?: string | null
          content_kind?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          media_metadata?: Json
          preview_md?: string | null
          publish_at?: string | null
          reading_minutes?: number | null
          required_plan_id?: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          subtitle?: string | null
          tags?: string[]
          thumbnail_bucket?: string
          thumbnail_url?: string | null
          title: string
          trailer_bucket?: string | null
          trailer_path?: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Update: {
          attachment_paths?: Json
          banner_bucket?: string | null
          banner_path?: string | null
          body_md?: string | null
          category_id?: string | null
          content_kind?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          media_metadata?: Json
          preview_md?: string | null
          publish_at?: string | null
          reading_minutes?: number | null
          required_plan_id?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket?: string | null
          storage_path?: string | null
          subtitle?: string | null
          tags?: string[]
          thumbnail_bucket?: string
          thumbnail_url?: string | null
          title?: string
          trailer_bucket?: string | null
          trailer_path?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["content_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "content_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          provider: string
          provider_invoice_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_invoice_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          provider?: string
          provider_invoice_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          asset_role: string
          bucket: string
          content_id: string | null
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          metadata: Json
          mime_type: string
          path: string
          size_bytes: number
          status: string
          updated_at: string
        }
        Insert: {
          asset_role?: string
          bucket: string
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          metadata?: Json
          mime_type: string
          path: string
          size_bytes?: number
          status?: string
          updated_at?: string
        }
        Update: {
          asset_role?: string
          bucket?: string
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          metadata?: Json
          mime_type?: string
          path?: string
          size_bytes?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          cancel_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          payload: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          payload?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          body: string
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          digest_enabled: boolean
          digest_frequency: string
          notify_announcements: boolean
          notify_new_content: boolean
          notify_reminders: boolean
          notify_replies: boolean
          notify_trending: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_enabled?: boolean
          digest_frequency?: string
          notify_announcements?: boolean
          notify_new_content?: boolean
          notify_reminders?: boolean
          notify_replies?: boolean
          notify_trending?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_enabled?: boolean
          digest_frequency?: string
          notify_announcements?: boolean
          notify_new_content?: boolean
          notify_reminders?: boolean
          notify_replies?: boolean
          notify_trending?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          completed: boolean
          content_id: string
          id: string
          last_seen_at: string
          progress_seconds: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          content_id: string
          id?: string
          last_seen_at?: string
          progress_seconds?: number
          user_id: string
        }
        Update: {
          completed?: boolean
          content_id?: string
          id?: string
          last_seen_at?: string
          progress_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_storage_object: {
        Args: { _bucket: string; _path: string }
        Returns: boolean
      }
      current_user_plan: { Args: { _user_id: string }; Returns: string }
      has_active_membership: { Args: { _user_id: string }; Returns: boolean }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_content_access: {
        Args: {
          _required_plan_id?: string
          _user_id: string
          _visibility: Database["public"]["Enums"]["content_visibility"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      plan_rank: { Args: { _plan: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "member"
      content_status: "draft" | "scheduled" | "published" | "archived"
      content_type: "video" | "pdf" | "audio" | "article"
      content_visibility: "public" | "members" | "premium"
      membership_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "inactive"
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
      app_role: ["admin", "member"],
      content_status: ["draft", "scheduled", "published", "archived"],
      content_type: ["video", "pdf", "audio", "article"],
      content_visibility: ["public", "members", "premium"],
      membership_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "inactive",
      ],
    },
  },
} as const
