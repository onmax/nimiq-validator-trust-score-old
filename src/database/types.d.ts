export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      events_validators: {
        Row: {
          event_id: number
          hash: string
          id: number
          timestamp: string
          validator_id: number
        }
        Insert: {
          event_id: number
          hash?: string
          id?: number
          timestamp?: string
          validator_id: number
        }
        Update: {
          event_id?: number
          hash?: string
          id?: number
          timestamp?: string
          validator_id?: number
        }
      }
      validators: {
        Row: {
          address: string
          genesis: boolean
          id: number
          name: string | null
          tracked: boolean
          updated_at: string | null
        }
        Insert: {
          address?: string
          genesis?: boolean
          id?: number
          name?: string | null
          tracked?: boolean
          updated_at?: string | null
        }
        Update: {
          address?: string
          genesis?: boolean
          id?: number
          name?: string | null
          tracked?: boolean
          updated_at?: string | null
        }
      }
      validator_score: {
        Row: {
          computed_at: string
          id: number
          score: number
          score_age: number
          score_size: number
          score_uptime: number
          validator: number
        }
        Insert: {
          computed_at?: string
          id?: number
          score: number
          score_age: number
          score_size: number
          score_uptime: number
          validator: number
        }
        Update: {
          computed_at?: string
          id?: number
          score?: number
          score_age?: number
          score_size?: number
          score_uptime?: number
          validator?: number
        }
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
