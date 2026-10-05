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
      alumno_inscripciones: {
        Row: {
          activo: boolean
          alumno_id: string
          created_at: string
          curso_id: string
          deleted_at: string | null
          id: string
          institucion_id: string
        }
        Insert: {
          activo?: boolean
          alumno_id: string
          created_at?: string
          curso_id: string
          deleted_at?: string | null
          id?: string
          institucion_id: string
        }
        Update: {
          activo?: boolean
          alumno_id?: string
          created_at?: string
          curso_id?: string
          deleted_at?: string | null
          id?: string
          institucion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumno_inscripciones_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumno_inscripciones_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumno_inscripciones_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      alumno_responsables: {
        Row: {
          alumno_id: string
          created_at: string
          institucion_id: string
          persona_id: string
          relacion: string | null
        }
        Insert: {
          alumno_id: string
          created_at?: string
          institucion_id: string
          persona_id: string
          relacion?: string | null
        }
        Update: {
          alumno_id?: string
          created_at?: string
          institucion_id?: string
          persona_id?: string
          relacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumno_responsables_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumno_responsables_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumno_responsables_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      alumnos: {
        Row: {
          activo: boolean
          created_at: string
          deleted_at: string | null
          direccion: string | null
          dni: string | null
          email: string | null
          fecha_nacimiento: string | null
          id: string
          institucion_id: string
          nombre: string
          persona_id: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          dni?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          institucion_id: string
          nombre: string
          persona_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          dni?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
          persona_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumnos_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      años_lectivos: {
        Row: {
          activo: boolean
          created_at: string
          deleted_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          institucion_id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "años_lectivos_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          año_lectivo_id: string
          created_at: string
          deleted_at: string | null
          escala_id: string | null
          id: string
          institucion_id: string
          nivel: string | null
          nombre: string
          turno: string | null
          updated_at: string
        }
        Insert: {
          año_lectivo_id: string
          created_at?: string
          deleted_at?: string | null
          escala_id?: string | null
          id?: string
          institucion_id: string
          nivel?: string | null
          nombre: string
          turno?: string | null
          updated_at?: string
        }
        Update: {
          año_lectivo_id?: string
          created_at?: string
          deleted_at?: string | null
          escala_id?: string | null
          id?: string
          institucion_id?: string
          nivel?: string | null
          nombre?: string
          turno?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cursos_año_lectivo_id_fkey"
            columns: ["año_lectivo_id"]
            isOneToOne: false
            referencedRelation: "años_lectivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cursos_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      escala_valores: {
        Row: {
          codigo: string
          created_at: string
          descripcion: string | null
          escala_id: string
          id: string
          orden: number
        }
        Insert: {
          codigo: string
          created_at?: string
          descripcion?: string | null
          escala_id: string
          id?: string
          orden: number
        }
        Update: {
          codigo?: string
          created_at?: string
          descripcion?: string | null
          escala_id?: string
          id?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "escala_valores_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          institucion_id: string
          max_valor: number | null
          min_valor: number | null
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          institucion_id: string
          max_valor?: number | null
          min_valor?: number | null
          nombre: string
          tipo: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          institucion_id?: string
          max_valor?: number | null
          min_valor?: number | null
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          institucion_id: string
          materia_id: string
          nombre: string
          orden: number
          periodo_id: string
          peso: number
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          institucion_id: string
          materia_id: string
          nombre: string
          orden?: number
          periodo_id: string
          peso?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          institucion_id?: string
          materia_id?: string
          nombre?: string
          orden?: number
          periodo_id?: string
          peso?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      instituciones: {
        Row: {
          activa: boolean
          created_at: string
          deleted_at: string | null
          direccion: string | null
          email: string | null
          id: string
          logo_url: string | null
          nombre: string
          slug: string
          telefono: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nombre: string
          slug: string
          telefono?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nombre?: string
          slug?: string
          telefono?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      materia_docentes: {
        Row: {
          created_at: string
          institucion_id: string
          materia_id: string
          persona_id: string
        }
        Insert: {
          created_at?: string
          institucion_id: string
          materia_id: string
          persona_id: string
        }
        Update: {
          created_at?: string
          institucion_id?: string
          materia_id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materia_docentes_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materia_docentes_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materia_docentes_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      materia_horarios: {
        Row: {
          aula: string | null
          created_at: string
          deleted_at: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: string
          institucion_id: string
          materia_id: string
        }
        Insert: {
          aula?: string | null
          created_at?: string
          deleted_at?: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: string
          institucion_id: string
          materia_id: string
        }
        Update: {
          aula?: string | null
          created_at?: string
          deleted_at?: string | null
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
          institucion_id?: string
          materia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materia_horarios_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materia_horarios_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          catalogo_id: string
          created_at: string
          curso_id: string
          deleted_at: string | null
          escala_id: string | null
          id: string
          institucion_id: string
          updated_at: string
        }
        Insert: {
          catalogo_id: string
          created_at?: string
          curso_id: string
          deleted_at?: string | null
          escala_id?: string | null
          id?: string
          institucion_id: string
          updated_at?: string
        }
        Update: {
          catalogo_id?: string
          created_at?: string
          curso_id?: string
          deleted_at?: string | null
          escala_id?: string | null
          id?: string
          institucion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materias_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "materias_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escalas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      materias_catalogo: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          institucion_id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          institucion_id: string
          nombre: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "materias_catalogo_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          institucion_id: string
          persona_id: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          institucion_id: string
          persona_id: string
          rol: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          institucion_id?: string
          persona_id?: string
          rol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          alumno_id: string
          created_at: string
          deleted_at: string | null
          docente_id: string
          evaluacion_id: string
          fecha_carga: string
          id: string
          institucion_id: string
          observacion: string | null
          updated_at: string
          valor_literal: string | null
          valor_numerico: number | null
        }
        Insert: {
          alumno_id: string
          created_at?: string
          deleted_at?: string | null
          docente_id: string
          evaluacion_id: string
          fecha_carga?: string
          id?: string
          institucion_id: string
          observacion?: string | null
          updated_at?: string
          valor_literal?: string | null
          valor_numerico?: number | null
        }
        Update: {
          alumno_id?: string
          created_at?: string
          deleted_at?: string | null
          docente_id?: string
          evaluacion_id?: string
          fecha_carga?: string
          id?: string
          institucion_id?: string
          observacion?: string | null
          updated_at?: string
          valor_literal?: string | null
          valor_numerico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_historial: {
        Row: {
          accion: string
          docente_id: string
          id: string
          modificado_at: string
          nota_id: string
          observacion: string | null
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          accion?: string
          docente_id: string
          id?: string
          modificado_at?: string
          nota_id: string
          observacion?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          accion?: string
          docente_id?: string
          id?: string
          modificado_at?: string
          nota_id?: string
          observacion?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_historial_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_historial_nota_id_fkey"
            columns: ["nota_id"]
            isOneToOne: false
            referencedRelation: "notas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          contenido: string | null
          created_at: string
          enviado_email: boolean
          id: string
          institucion_id: string
          leido: boolean
          metadata: Json | null
          persona_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          contenido?: string | null
          created_at?: string
          enviado_email?: boolean
          id?: string
          institucion_id: string
          leido?: boolean
          metadata?: Json | null
          persona_id: string
          tipo: string
          titulo: string
        }
        Update: {
          contenido?: string | null
          created_at?: string
          enviado_email?: boolean
          id?: string
          institucion_id?: string
          leido?: boolean
          metadata?: Json | null
          persona_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos: {
        Row: {
          año_lectivo_id: string
          created_at: string
          deleted_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          institucion_id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          año_lectivo_id: string
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          año_lectivo_id?: string
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_año_lectivo_id_fkey"
            columns: ["año_lectivo_id"]
            isOneToOne: false
            referencedRelation: "años_lectivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          direccion: string | null
          dni: string | null
          email: string
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          dni?: string | null
          email: string
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          dni?: string | null
          email?: string
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_persona_id: { Args: never; Returns: string }
      get_personas_login_status: {
        Args: { p_ids: string[] }
        Returns: {
          has_logged_in: boolean
          persona_id: string
        }[]
      }
      has_any_role: {
        Args: { inst_id: string; roles: string[] }
        Returns: boolean
      }
      has_role: {
        Args: { inst_id: string; required_rol: string }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
