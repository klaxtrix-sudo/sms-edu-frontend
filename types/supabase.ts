/**
 * Supabase Database type definitions
 * Regenerate with: npx supabase gen types typescript --project-id <your-project-id>
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          logo_url: string | null;
          academic_year: string;
          current_term: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schools']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['schools']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          school_id: string;
          full_name: string;
          role: 'admin' | 'teacher' | 'student' | 'parent';
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      classes: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          class_teacher_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['classes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['classes']['Insert']>;
      };
      subjects: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          code: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
      };
      students: {
        Row: {
          id: string;
          user_id: string;
          school_id: string;
          class_id: string;
          admission_no: string;
          date_of_birth: string | null;
          gender: 'male' | 'female' | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
      };
      results: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          class_id: string;
          term: number;
          academic_year: string;
          ca1_score: number | null;
          ca2_score: number | null;
          exam_score: number | null;
          total: number | null;
          grade: string | null;
          published: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['results']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['results']['Insert']>;
      };
      fee_structures: {
        Row: {
          id: string;
          school_id: string;
          title: string;
          amount: number;
          term: number;
          academic_year: string;
          due_date: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fee_structures']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['fee_structures']['Insert']>;
      };
      fee_payments: {
        Row: {
          id: string;
          student_id: string;
          fee_structure_id: string;
          amount_paid: number;
          reference: string;
          gateway: 'paystack' | 'flutterwave';
          status: 'pending' | 'success' | 'failed';
          paid_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fee_payments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['fee_payments']['Insert']>;
      };
    };
  };
};
