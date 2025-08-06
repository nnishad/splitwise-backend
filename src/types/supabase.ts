// Supabase Database Types
// This will be auto-generated when you run: npx supabase gen types typescript --project-id skyiigpuhwsjmqpwmktt

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar: string | null
          preferred_currency: string
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          avatar?: string | null
          preferred_currency?: string
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar?: string | null
          preferred_currency?: string
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          default_currency: string
          preferred_currency: string | null
          max_members: number | null
          is_archived: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
          owner_id: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          default_currency?: string
          preferred_currency?: string | null
          max_members?: number | null
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          default_currency?: string
          preferred_currency?: string | null
          max_members?: number | null
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          owner_id?: string
        }
      }
      expenses: {
        Row: {
          id: string
          title: string
          description: string | null
          amount: string
          currency: string
          exchange_rate: string | null
          original_currency: string | null
          converted_amount: string | null
          date: string
          location: string | null
          is_archived: boolean
          archived_at: string | null
          is_recurring: boolean
          recurring_pattern: string | null
          next_recurring_date: string | null
          created_at: string
          updated_at: string
          group_id: string
          created_by_id: string
          category_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          amount: string
          currency?: string
          exchange_rate?: string | null
          original_currency?: string | null
          converted_amount?: string | null
          date?: string
          location?: string | null
          is_archived?: boolean
          archived_at?: string | null
          is_recurring?: boolean
          recurring_pattern?: string | null
          next_recurring_date?: string | null
          created_at?: string
          updated_at?: string
          group_id: string
          created_by_id: string
          category_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          amount?: string
          currency?: string
          exchange_rate?: string | null
          original_currency?: string | null
          converted_amount?: string | null
          date?: string
          location?: string | null
          is_archived?: boolean
          archived_at?: string | null
          is_recurring?: boolean
          recurring_pattern?: string | null
          next_recurring_date?: string | null
          created_at?: string
          updated_at?: string
          group_id?: string
          created_by_id?: string
          category_id?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          user_id: string
          group_id: string | null
          old_data: Json | null
          new_data: Json | null
          metadata: Json | null
          version: number
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: string
          user_id: string
          group_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          metadata?: Json | null
          version?: number
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: string
          user_id?: string
          group_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          metadata?: Json | null
          version?: number
          created_at?: string
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
      group_role: 'OWNER' | 'ADMIN' | 'MEMBER'
      invite_type: 'EMAIL' | 'PHONE' | 'LINK'
      recurring_pattern: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM'
      split_type: 'EQUAL' | 'PERCENTAGE' | 'AMOUNT' | 'SHARES'
      expense_action: 'CREATED' | 'UPDATED' | 'DELETED' | 'ARCHIVED' | 'RESTORED' | 'SPLIT_CHANGED' | 'PAYER_CHANGED' | 'CATEGORY_CHANGED' | 'TAGS_CHANGED'
      settlement_status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
      settlement_type: 'FULL' | 'PARTIAL'
      settlement_action: 'CREATED' | 'UPDATED' | 'COMPLETED' | 'CANCELLED'
      reminder_frequency: 'OFF' | 'DAILY' | 'WEEKLY'
    }
  }
} 