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
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      arenas: {
        Row: {
          address: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          starts_at: string | null
          title: string
          updated_at: string
          variant: string
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
          variant?: string
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          arena_id: string | null
          challenged_team_id: string
          challenger_team_id: string
          court_id: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          loser_team_id: string | null
          reschedule_reason: string | null
          responded_at: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          arena_id?: string | null
          challenged_team_id: string
          challenger_team_id: string
          court_id?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number
          id?: string
          loser_team_id?: string | null
          reschedule_reason?: string | null
          responded_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          arena_id?: string | null
          challenged_team_id?: string
          challenger_team_id?: string
          court_id?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          loser_team_id?: string | null
          reschedule_reason?: string | null
          responded_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_challenged_team_id_fkey"
            columns: ["challenged_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_challenger_team_id_fkey"
            columns: ["challenger_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_loser_team_id_fkey"
            columns: ["loser_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          number?: number
          updated_at?: string
        }
        Relationships: []
      }
      gallery_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          photo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          photo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          photo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_likes: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_likes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_players: {
        Row: {
          id: string
          joined_at: string
          match_id: string
          player_id: string
          status: Database["public"]["Enums"]["match_player_status"]
          team: Database["public"]["Enums"]["match_team"] | null
        }
        Insert: {
          id?: string
          joined_at?: string
          match_id: string
          player_id: string
          status?: Database["public"]["Enums"]["match_player_status"]
          team?: Database["public"]["Enums"]["match_team"] | null
        }
        Update: {
          id?: string
          joined_at?: string
          match_id?: string
          player_id?: string
          status?: Database["public"]["Enums"]["match_player_status"]
          team?: Database["public"]["Enums"]["match_team"] | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          arena_id: string | null
          created_at: string
          creator_id: string
          date: string
          end_time: string | null
          id: string
          match_type: Database["public"]["Enums"]["match_type"]
          max_players: number
          modality: Database["public"]["Enums"]["match_modality"]
          notes: string | null
          start_time: string
          status: Database["public"]["Enums"]["match_status"]
          title: string
          updated_at: string
        }
        Insert: {
          arena_id?: string | null
          created_at?: string
          creator_id: string
          date: string
          end_time?: string | null
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          max_players?: number
          modality?: Database["public"]["Enums"]["match_modality"]
          notes?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["match_status"]
          title: string
          updated_at?: string
        }
        Update: {
          arena_id?: string | null
          created_at?: string
          creator_id?: string
          date?: string
          end_time?: string | null
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          max_players?: number
          modality?: Database["public"]["Enums"]["match_modality"]
          notes?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["match_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_penalties: {
        Row: {
          challenge_id: string | null
          created_at: string
          id: string
          month: string
          points: number
          reason: Database["public"]["Enums"]["penalty_reason"]
          team_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          month: string
          points: number
          reason: Database["public"]["Enums"]["penalty_reason"]
          team_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          month?: string
          points?: number
          reason?: Database["public"]["Enums"]["penalty_reason"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_penalties_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_penalties_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          kind: string
          link_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          link_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          link_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          altura: number | null
          apelido: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          data_nascimento: string | null
          derrotas: number
          display_name: string
          genero: string | null
          id: string
          instagram: string | null
          is_suspended: boolean
          is_verified: boolean
          level: string | null
          mao_dominante: string | null
          observacoes: string | null
          pontos: number
          posicao_principal: string | null
          state: string | null
          status: string
          suspended_until: string | null
          ultimo_acesso: string | null
          updated_at: string
          username: string | null
          vitorias: number
          whatsapp: string | null
        }
        Insert: {
          altura?: number | null
          apelido?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          data_nascimento?: string | null
          derrotas?: number
          display_name?: string
          genero?: string | null
          id: string
          instagram?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          level?: string | null
          mao_dominante?: string | null
          observacoes?: string | null
          pontos?: number
          posicao_principal?: string | null
          state?: string | null
          status?: string
          suspended_until?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          username?: string | null
          vitorias?: number
          whatsapp?: string | null
        }
        Update: {
          altura?: number | null
          apelido?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          data_nascimento?: string | null
          derrotas?: number
          display_name?: string
          genero?: string | null
          id?: string
          instagram?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          level?: string | null
          mao_dominante?: string | null
          observacoes?: string | null
          pontos?: number
          posicao_principal?: string | null
          state?: string | null
          status?: string
          suspended_until?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          username?: string | null
          vitorias?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          responded_at?: string | null
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          responded_at?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          profile_id: string
          team_id: string
        }
        Insert: {
          joined_at?: string
          profile_id: string
          team_id: string
        }
        Update: {
          joined_at?: string
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_monthly_availability: {
        Row: {
          arena_id: string | null
          court_id: string | null
          created_at: string
          id: string
          is_available: boolean
          month: string
          sunday_date: string
          team_id: string
          time_end: string | null
          time_start: string | null
          updated_at: string
        }
        Insert: {
          arena_id?: string | null
          court_id?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          month: string
          sunday_date: string
          team_id: string
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
        }
        Update: {
          arena_id?: string | null
          court_id?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          month?: string
          sunday_date?: string
          team_id?: string
          time_end?: string | null
          time_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_monthly_availability_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_monthly_availability_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_monthly_availability_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string
          category: Database["public"]["Enums"]["team_category"]
          created_at: string
          current_streak: number
          gender: Database["public"]["Enums"]["team_gender"]
          id: string
          is_active: boolean
          losses: number
          name: string
          points: number
          preferred_arena_id: string | null
          rank_position: number | null
          suspended_until: string | null
          updated_at: string
          wins: number
          wo_count: number
        }
        Insert: {
          captain_id: string
          category: Database["public"]["Enums"]["team_category"]
          created_at?: string
          current_streak?: number
          gender?: Database["public"]["Enums"]["team_gender"]
          id?: string
          is_active?: boolean
          losses?: number
          name: string
          points?: number
          preferred_arena_id?: string | null
          rank_position?: number | null
          suspended_until?: string | null
          updated_at?: string
          wins?: number
          wo_count?: number
        }
        Update: {
          captain_id?: string
          category?: Database["public"]["Enums"]["team_category"]
          created_at?: string
          current_streak?: number
          gender?: Database["public"]["Enums"]["team_gender"]
          id?: string
          is_active?: boolean
          losses?: number
          name?: string
          points?: number
          preferred_arena_id?: string | null
          rank_position?: number | null
          suspended_until?: string | null
          updated_at?: string
          wins?: number
          wo_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_preferred_arena_id_fkey"
            columns: ["preferred_arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_monthly_penalties: { Args: { _month: string }; Returns: number }
      apply_previous_month_penalties: { Args: never; Returns: number }
      court_availability: {
        Args: { _date: string }
        Returns: {
          court_id: string
          court_name: string
          court_number: number
          is_free: boolean
          slot_time: string
        }[]
      }
      generate_current_month_availability: { Args: never; Returns: number }
      generate_month_availability: { Args: { _month: string }; Returns: number }
      get_sundays_of_month: {
        Args: { _month: string }
        Returns: {
          sunday_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_team_captain: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      recompute_ranks_below_podium: {
        Args: {
          _category: Database["public"]["Enums"]["team_category"]
          _gender: Database["public"]["Enums"]["team_gender"]
        }
        Returns: undefined
      }
      recompute_team_gender: { Args: { _team_id: string }; Returns: undefined }
      schedule_challenge: {
        Args: {
          _challenge_id: string
          _court_id: string
          _date: string
          _time: string
        }
        Returns: {
          arena_id: string | null
          challenged_team_id: string
          challenger_team_id: string
          court_id: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          loser_team_id: string | null
          reschedule_reason: string | null
          responded_at: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          updated_at: string
          winner_team_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "player"
      challenge_status:
        | "pending"
        | "scheduled"
        | "reschedule_requested"
        | "declined"
        | "completed"
        | "wo"
        | "awaiting_schedule"
      match_modality: "beach_volley" | "indoor_volley" | "futevolei"
      match_player_status: "confirmed" | "waiting" | "cancelled"
      match_status: "open" | "full" | "finished" | "cancelled"
      match_team: "A" | "B"
      match_type: "dupla" | "quarteto" | "sexteto"
      penalty_reason: "no_challenge_month" | "declined" | "walkover"
      team_category: "dupla" | "quarteto"
      team_gender: "M" | "F" | "X"
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
      app_role: ["admin", "moderator", "player"],
      challenge_status: [
        "pending",
        "scheduled",
        "reschedule_requested",
        "declined",
        "completed",
        "wo",
        "awaiting_schedule",
      ],
      match_modality: ["beach_volley", "indoor_volley", "futevolei"],
      match_player_status: ["confirmed", "waiting", "cancelled"],
      match_status: ["open", "full", "finished", "cancelled"],
      match_team: ["A", "B"],
      match_type: ["dupla", "quarteto", "sexteto"],
      penalty_reason: ["no_challenge_month", "declined", "walkover"],
      team_category: ["dupla", "quarteto"],
      team_gender: ["M", "F", "X"],
    },
  },
} as const
