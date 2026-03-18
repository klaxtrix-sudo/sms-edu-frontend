export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  internal: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
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
      results: {
        Row: {
          academic_year: string
          ca1: number | null
          ca2: number | null
          created_at: string | null
          exam: number | null
          grade: string | null
          id: string
          remark: string | null
          school_id: string
          student_id: string
          subject_id: string
          term: number
          total: number | null
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          ca1?: number | null
          ca2?: number | null
          created_at?: string | null
          exam?: number | null
          grade?: string | null
          id?: string
          remark?: string | null
          school_id: string
          student_id: string
          subject_id: string
          term: number
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          ca1?: number | null
          ca2?: number | null
          created_at?: string | null
          exam?: number | null
          grade?: string | null
          id?: string
          remark?: string | null
          school_id?: string
          student_id?: string
          subject_id?: string
          term?: number
          total?: number | null
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
            foreignKeyName: "results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          academic_year: string
          address: string | null
          created_at: string | null
          current_term: number | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          academic_year?: string
          address?: string | null
          created_at?: string | null
          current_term?: number | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          address?: string | null
          created_at?: string | null
          current_term?: number | null
          id?: string
          logo_url?: string | null
          name?: string
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
          school_id: string
          user_id: string
        }
        Insert: {
          admission_no: string
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          admission_no?: string
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          school_id?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "admin" | "teacher" | "student" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
