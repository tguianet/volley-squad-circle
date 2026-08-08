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
          score_challenged: number | null
          score_challenger: number | null
          score_confirmed_at: string | null
          score_confirmed_by: string | null
          score_admin_review_requested_at: string | null
          score_admin_review_requested_by: string | null
          score_registered_at: string | null
          score_registered_by: string | null
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
          score_challenged?: number | null
          score_challenger?: number | null
          score_confirmed_at?: string | null
          score_confirmed_by?: string | null
          score_admin_review_requested_at?: string | null
          score_admin_review_requested_by?: string | null
          score_registered_at?: string | null
          score_registered_by?: string | null
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
          score_challenged?: number | null
          score_challenger?: number | null
          score_confirmed_at?: string | null
          score_confirmed_by?: string | null
          score_admin_review_requested_at?: string | null
          score_admin_review_requested_by?: string | null
          score_registered_at?: string | null
          score_registered_by?: string | null
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
            foreignKeyName: "challenges_score_confirmed_by_fkey"
            columns: ["score_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_score_registered_by_fkey"
            columns: ["score_registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          court_number: number | null
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
          court_number?: number | null
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
          court_number?: number | null
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
          event_key: string | null
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
          event_key?: string | null
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
          event_key?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          link_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follows_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_links: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["link_status"]
          target_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["link_status"]
          target_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["link_status"]
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_links_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_links_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          user_id?: string
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
      tournament_registrations: {
        Row: {
          id: string
          registered_at: string
          status: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          registered_at?: string
          status?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          registered_at?: string
          status?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          arena_id: string | null
          category_label: string
          created_at: string
          created_by: string | null
          entry_fee_cents: number
          event_date: string
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          image_url: string | null
          is_featured: boolean
          max_teams: number
          start_time: string
          status: Database["public"]["Enums"]["tournament_status"]
          title: string
          updated_at: string
        }
        Insert: {
          arena_id?: string | null
          category_label: string
          created_at?: string
          created_by?: string | null
          entry_fee_cents?: number
          event_date: string
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_teams?: number
          start_time: string
          status?: Database["public"]["Enums"]["tournament_status"]
          title: string
          updated_at?: string
        }
        Update: {
          arena_id?: string | null
          category_label?: string
          created_at?: string
          created_by?: string | null
          entry_fee_cents?: number
          event_date?: string
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_teams?: number
          start_time?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_arena_id_fkey"
            columns: ["arena_id"]
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
      add_gallery_comment: {
        Args: { p_content: string; p_photo_id: string }
        Returns: string
      }
      can_challenge_by_rank: {
        Args: { my_position: number; opponent_position: number }
        Returns: boolean
      }
      check_court_availability: {
        Args: {
          p_arena_id?: string
          p_court_number?: number
          p_end_time: string
          p_match_date: string
          p_start_time: string
        }
        Returns: boolean
      }
      confirm_challenge_score: {
        Args: { _challenge_id: string }
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
          score_challenged: number | null
          score_challenger: number | null
          score_confirmed_at: string | null
          score_confirmed_by: string | null
          score_registered_at: string | null
          score_registered_by: string | null
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
      follow_profile: { Args: { p_profile_id: string }; Returns: Json }
      generate_current_month_availability: { Args: never; Returns: number }
      generate_month_availability: { Args: { _month: string }; Returns: number }
      get_available_sundays: {
        Args: { p_arena_id?: string }
        Returns: {
          free_slots_count: number
          match_date: string
        }[]
      }
      get_player_ranking_details: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_profile_follow_status: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_public_profile_by_username: {
        Args: { p_username: string }
        Returns: {
          altura: number
          apelido: string
          avatar_url: string
          banner_url: string
          bio: string
          city: string
          derrotas: number
          display_name: string
          genero: string
          id: string
          instagram: string
          level: string
          mao_dominante: string
          pontos: number
          posicao_principal: string
          state: string
          status: string
          username: string
          vitorias: number
        }[]
      }
      get_sundays_of_month: {
        Args: { _month: string }
        Returns: {
          sunday_date: string
        }[]
      }
      get_team_ranking_details: { Args: { p_team_id: string }; Returns: Json }
      create_team_with_invites: {
        Args: {
          p_category: Database["public"]["Enums"]["team_category"]
          p_gender: Database["public"]["Enums"]["team_gender"]
          p_invitee_ids: string[]
          p_name: string
        }
        Returns: string
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
      is_team_ranking_complete: {
        Args: { p_category: string; p_member_count: number }
        Returns: boolean
      }
      delete_own_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      leave_team: { Args: { p_team_id: string }; Returns: string }
      list_followed_profiles_feed: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          description: string
          id: string
          profile_apelido: string
          profile_avatar_url: string
          profile_id: string
          profile_name: string
          profile_username: string
          title: string
          type: string
        }[]
      }
      list_my_followed_profiles: {
        Args: never
        Returns: {
          apelido: string
          avatar_url: string
          category: string
          display_name: string
          follow_id: string
          followed_at: string
          last_updated_at: string
          profile_id: string
          username: string
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      list_my_profile_links: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_requester: boolean
          linked_user_apelido: string
          linked_user_avatar_url: string
          linked_user_city: string
          linked_user_id: string
          linked_user_name: string
          linked_user_username: string
          status: Database["public"]["Enums"]["link_status"]
        }[]
      }
      respond_to_team_invitation: {
        Args: { p_invitation_id: string; p_status: string }
        Returns: undefined
      }
      list_pending_link_requests: {
        Args: never
        Returns: {
          created_at: string
          id: string
          requester_apelido: string
          requester_avatar_url: string
          requester_city: string
          requester_id: string
          requester_name: string
          requester_username: string
        }[]
      }
      list_public_profile_follows: {
        Args: { p_limit?: number; p_profile_id: string }
        Returns: {
          apelido: string
          avatar_url: string
          category: string
          display_name: string
          profile_id: string
          username: string
        }[]
      }
      list_public_profile_gallery: {
        Args: { p_limit?: number; p_profile_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          image_url: string
        }[]
      }
      list_public_profile_updates: {
        Args: { p_limit?: number; p_profile_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          title: string
          type: string
        }[]
      }
      list_scheduled_challenges_public: {
        Args: never
        Returns: {
          arena_id: string
          arena_name: string
          challenged_id: string
          challenged_name: string
          challenged_rank: number
          challenger_id: string
          challenger_name: string
          challenger_rank: number
          id: string
          scheduled_date: string
          scheduled_time: string
        }[]
      }
      recompute_ranks_below_podium: {
        Args: {
          _category: Database["public"]["Enums"]["team_category"]
          _gender: Database["public"]["Enums"]["team_gender"]
        }
        Returns: undefined
      }
      recompute_team_gender: { Args: { _team_id: string }; Returns: undefined }
      cancel_tournament_registration: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      register_for_tournament: {
        Args: { p_tournament_id: string }
        Returns: string
      }
      register_challenge_score: {
        Args: {
          _challenge_id: string
          _score_challenged: number
          _score_challenger: number
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
          score_challenged: number | null
          score_challenger: number | null
          score_confirmed_at: string | null
          score_confirmed_by: string | null
          score_registered_at: string | null
          score_registered_by: string | null
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
      reject_challenge_score: {
        Args: { _challenge_id: string }
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
          score_challenged: number | null
          score_challenger: number | null
          score_confirmed_at: string | null
          score_confirmed_by: string | null
          score_registered_at: string | null
          score_registered_by: string | null
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
      respond_to_profile_link_request: {
        Args: {
          p_link_id: string
          p_status: Database["public"]["Enums"]["link_status"]
        }
        Returns: Json
      }
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
          score_challenged: number | null
          score_challenger: number | null
          score_confirmed_at: string | null
          score_confirmed_by: string | null
          score_registered_at: string | null
          score_registered_by: string | null
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
      search_profiles: {
        Args: { exclude_id?: string; search_term: string }
        Returns: {
          apelido: string
          avatar_url: string
          city: string
          display_name: string
          id: string
          username: string
          whatsapp: string
        }[]
      }
      share_gallery_post: {
        Args: { p_comment?: string; p_original_post_id: string }
        Returns: string
      }
      send_profile_link_request: {
        Args: { p_target_id: string }
        Returns: Json
      }
      toggle_gallery_like: { Args: { p_photo_id: string }; Returns: boolean }
      unfollow_profile: { Args: { p_profile_id: string }; Returns: Json }
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
        | "awaiting_confirmation"
      link_status: "pending" | "accepted" | "rejected"
      match_modality: "beach_volley" | "indoor_volley" | "futevolei"
      match_player_status: "confirmed" | "waiting" | "cancelled"
      match_status: "open" | "full" | "finished" | "cancelled"
      match_team: "A" | "B"
      match_type: "dupla" | "quarteto" | "sexteto"
      penalty_reason: "no_challenge_month" | "declined" | "walkover"
      team_category: "dupla" | "quarteto"
      team_gender: "M" | "F" | "X"
      tournament_format: "ready_teams" | "team_draw"
      tournament_status:
        | "draft"
        | "coming_soon"
        | "open"
        | "featured"
        | "last_spots"
        | "closed"
        | "finished"
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
        "awaiting_confirmation",
      ],
      link_status: ["pending", "accepted", "rejected"],
      match_modality: ["beach_volley", "indoor_volley", "futevolei"],
      match_player_status: ["confirmed", "waiting", "cancelled"],
      match_status: ["open", "full", "finished", "cancelled"],
      match_team: ["A", "B"],
      match_type: ["dupla", "quarteto", "sexteto"],
      penalty_reason: ["no_challenge_month", "declined", "walkover"],
      team_category: ["dupla", "quarteto"],
      team_gender: ["M", "F", "X"],
      tournament_format: ["ready_teams", "team_draw"],
      tournament_status: [
        "draft",
        "coming_soon",
        "open",
        "featured",
        "last_spots",
        "closed",
        "finished",
      ],
    },
  },
} as const
