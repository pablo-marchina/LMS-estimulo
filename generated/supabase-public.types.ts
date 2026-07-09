// Generated from Supabase project cfpfeavjlgheqqiaqtzv on 2026-07-08.
// Intentionally contains no application tables: internal domain schemas are not
// exposed through PostgREST. Application types come from domain/API contracts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
