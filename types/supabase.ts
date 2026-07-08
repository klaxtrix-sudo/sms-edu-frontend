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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          institution_name: string | null
          status: Database["public"]["Enums"]["access_code_status"] | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          institution_name?: string | null
          status?: Database["public"]["Enums"]["access_code_status"] | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          institution_name?: string | null
          status?: Database["public"]["Enums"]["access_code_status"] | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          class_teacher_id: string | null
          created_at: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      console_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      institutional_configs: {
        Row: {
          config_key: string
          config_value: string
          created_at: string | null
          id: string
          is_active: boolean | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_configs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      master_admins: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          last_login: string | null
          password_hash: string
          role: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          password_hash: string
          role?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          password_hash?: string
          role?: string | null
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          created_at: string | null
          enc_db_connection_string: string | null
          enc_mongodb_uri: string | null
          enc_supabase_anon_key: string | null
          enc_supabase_srk: string | null
          enc_supabase_url: string | null
          id: string
          is_provisioned: boolean | null
          is_setup_completed: boolean | null
          logo_url: string | null
          name: string
          region: string | null
          subdomain: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          enc_db_connection_string?: string | null
          enc_mongodb_uri?: string | null
          enc_supabase_anon_key?: string | null
          enc_supabase_srk?: string | null
          enc_supabase_url?: string | null
          id?: string
          is_provisioned?: boolean | null
          is_setup_completed?: boolean | null
          logo_url?: string | null
          name: string
          region?: string | null
          subdomain?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          enc_db_connection_string?: string | null
          enc_mongodb_uri?: string | null
          enc_supabase_anon_key?: string | null
          enc_supabase_srk?: string | null
          enc_supabase_url?: string | null
          id?: string
          is_provisioned?: boolean | null
          is_setup_completed?: boolean | null
          logo_url?: string | null
          name?: string
          region?: string | null
          subdomain?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          admission_no: string
          class_id: string | null
          created_at: string | null
          date_of_birth: string | null
          gender: string | null
          id: string
          parent_id: string | null
          school_id: string
          user_id: string
          state_of_origin: string | null
          lga: string | null
          religion: string | null
          residential_address: string | null
          blood_group: string | null
          genotype: string | null
          medical_conditions: string | null
          previous_school: string | null
        }
        Insert: {
          admission_no: string
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          parent_id?: string | null
          school_id: string
          user_id: string
          state_of_origin?: string | null
          lga?: string | null
          religion?: string | null
          residential_address?: string | null
          blood_group?: string | null
          genotype?: string | null
          medical_conditions?: string | null
          previous_school?: string | null
        }
        Update: {
          admission_no?: string
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          parent_id?: string | null
          school_id?: string
          user_id?: string
          state_of_origin?: string | null
          lga?: string | null
          religion?: string | null
          residential_address?: string | null
          blood_group?: string | null
          genotype?: string | null
          medical_conditions?: string | null
          previous_school?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string
          student_id: string
          class_id: string
          school_id: string
          date: string
          status: "present" | "absent" | "late" | "excused"
          remarks: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          class_id: string
          school_id: string
          date: string
          status?: "present" | "absent" | "late" | "excused"
          remarks?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          class_id?: string
          school_id?: string
          date?: string
          status?: "present" | "absent" | "late" | "excused"
          remarks?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_timetables: {
        Row: {
          id: string
          school_id: string
          exam_id: string
          exam_title: string
          class_id: string
          subject_id: string
          exam_date: string
          start_time: string
          end_time: string
          room: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          exam_id: string
          exam_title: string
          class_id: string
          subject_id: string
          exam_date: string
          start_time: string
          end_time: string
          room?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          exam_id?: string
          exam_title?: string
          class_id?: string
          subject_id?: string
          exam_date?: string
          start_time?: string
          end_time?: string
          room?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_timetables_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_timetables_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          id: string
          school_id: string
          student_id: string
          fee_structure_id: string
          amount: number
          reference: string
          status: "pending" | "success" | "failed"
          channel: string | null
          paid_at: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          student_id: string
          fee_structure_id: string
          amount: number
          reference: string
          status?: "pending" | "success" | "failed"
          channel?: string | null
          paid_at?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          student_id?: string
          fee_structure_id?: string
          amount?: number
          reference?: string
          status?: "pending" | "success" | "failed"
          channel?: string | null
          paid_at?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          id: string
          school_id: string
          class_id: string
          name: string
          amount: number
          academic_year: string
          term: number
          created_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          class_id: string
          name: string
          amount: number
          academic_year: string
          term: number
          created_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          class_id?: string
          name?: string
          amount?: number
          academic_year?: string
          term?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      result_metrics: {
        Row: {
          id: string
          school_id: string
          class_id: string | null
          subject_id: string | null
          name: string
          weight: number
          is_custom: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          class_id?: string | null
          subject_id?: string | null
          name: string
          weight: number
          is_custom?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          class_id?: string | null
          subject_id?: string | null
          name?: string
          weight?: number
          is_custom?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_metrics_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_metrics_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_metrics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          id: string
          school_id: string
          student_id: string
          class_id: string
          subject_id: string
          academic_year: string
          term: number
          scores: Json
          total_score: number
          grade: string
          remark: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          student_id: string
          class_id: string
          subject_id: string
          academic_year: string
          term: number
          scores?: Json
          total_score: number
          grade: string
          remark: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          student_id?: string
          class_id?: string
          subject_id?: string
          academic_year?: string
          term?: number
          scores?: Json
          total_score?: number
          grade?: string
          remark?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          id: string
          school_id: string
          class_id: string
          subject_id: string
          teacher_id: string | null
          day_of_week: number
          start_time: string
          end_time: string
          room: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          school_id: string
          class_id: string
          subject_id: string
          teacher_id?: string | null
          day_of_week: number
          start_time: string
          end_time: string
          room?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          class_id?: string
          subject_id?: string
          teacher_id?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          room?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetables_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      access_code_status: "active" | "used" | "expired"
      user_role: "admin" | "teacher" | "student" | "parent"
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
      access_code_status: ["active", "used", "expired"],
      user_role: ["admin", "teacher", "student", "parent"],
    },
  },
} as const
