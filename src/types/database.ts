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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      actividad_log: {
        Row: {
          accion: string
          created_at: string
          entidad: string | null
          entidad_id: string | null
          id: string
          institucion_id: string
          metadata: Json | null
          persona_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          entidad?: string | null
          entidad_id?: string | null
          id?: string
          institucion_id: string
          metadata?: Json | null
          persona_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          entidad?: string | null
          entidad_id?: string | null
          id?: string
          institucion_id?: string
          metadata?: Json | null
          persona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividad_log_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_log_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
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
          apellido: string | null
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
          apellido?: string | null
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
          apellido?: string | null
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
          cerrado_at: string | null
          created_at: string
          deleted_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          institucion_id: string
          nombre: string
          publicado_at: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          cerrado_at?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id: string
          nombre: string
          publicado_at?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          cerrado_at?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
          publicado_at?: string | null
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
      asistencia_resumen: {
        Row: {
          alumno_id: string
          created_at: string
          id: string
          inasistencias_injustificadas: number
          inasistencias_justificadas: number
          institucion_id: string
          materia_id: string | null
          observacion: string | null
          periodo_id: string
          total_clases: number
          updated_at: string
        }
        Insert: {
          alumno_id: string
          created_at?: string
          id?: string
          inasistencias_injustificadas?: number
          inasistencias_justificadas?: number
          institucion_id: string
          materia_id?: string | null
          observacion?: string | null
          periodo_id: string
          total_clases?: number
          updated_at?: string
        }
        Update: {
          alumno_id?: string
          created_at?: string
          id?: string
          inasistencias_injustificadas?: number
          inasistencias_justificadas?: number
          institucion_id?: string
          materia_id?: string | null
          observacion?: string | null
          periodo_id?: string
          total_clases?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_resumen_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_resumen_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_resumen_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_resumen_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      boletin_acuses: {
        Row: {
          alumno_id: string
          confirmado_por: string | null
          confirmed_at: string
          created_at: string
          id: string
          periodo_id: string
          persona_id: string
        }
        Insert: {
          alumno_id: string
          confirmado_por?: string | null
          confirmed_at?: string
          created_at?: string
          id?: string
          periodo_id: string
          persona_id: string
        }
        Update: {
          alumno_id?: string
          confirmado_por?: string | null
          confirmed_at?: string
          created_at?: string
          id?: string
          periodo_id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletin_acuses_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletin_acuses_confirmado_por_fkey"
            columns: ["confirmado_por"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletin_acuses_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletin_acuses_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicado_confirmaciones: {
        Row: {
          comunicado_id: string
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          institucion_id: string
          persona_id: string
        }
        Insert: {
          comunicado_id: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          institucion_id: string
          persona_id: string
        }
        Update: {
          comunicado_id?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          institucion_id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicado_confirmaciones_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicado_confirmaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          autor_id: string
          contenido: string
          created_at: string
          curso_id: string
          deleted_at: string | null
          enviado_at: string | null
          id: string
          institucion_id: string
          materia_id: string | null
          titulo: string
        }
        Insert: {
          autor_id: string
          contenido: string
          created_at?: string
          curso_id: string
          deleted_at?: string | null
          enviado_at?: string | null
          id?: string
          institucion_id: string
          materia_id?: string | null
          titulo: string
        }
        Update: {
          autor_id?: string
          contenido?: string
          created_at?: string
          curso_id?: string
          deleted_at?: string | null
          enviado_at?: string | null
          id?: string
          institucion_id?: string
          materia_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      contenidos: {
        Row: {
          autor_id: string | null
          created_at: string
          deleted_at: string | null
          dimension_id: string | null
          id: string
          nota: string | null
          orden: number
          publicado: boolean
          storage_path: string | null
          tipo: string
          titulo: string
          unidad_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          deleted_at?: string | null
          dimension_id?: string | null
          id?: string
          nota?: string | null
          orden?: number
          publicado?: boolean
          storage_path?: string | null
          tipo: string
          titulo: string
          unidad_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          deleted_at?: string | null
          dimension_id?: string | null
          id?: string
          nota?: string | null
          orden?: number
          publicado?: boolean
          storage_path?: string | null
          tipo?: string
          titulo?: string
          unidad_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contenidos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contenidos_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "materias_dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contenidos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
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
      dimension_plantilla_items: {
        Row: {
          id: string
          nombre: string
          orden: number
          peso: number | null
          plantilla_id: string
        }
        Insert: {
          id?: string
          nombre: string
          orden?: number
          peso?: number | null
          plantilla_id: string
        }
        Update: {
          id?: string
          nombre?: string
          orden?: number
          peso?: number | null
          plantilla_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_plantilla_items_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "dimension_plantillas"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_plantillas: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          institucion_id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          institucion_id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_plantillas_institucion_id_fkey"
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
      evaluacion_dimensiones: {
        Row: {
          dimension_id: string
          evaluacion_id: string
        }
        Insert: {
          dimension_id: string
          evaluacion_id: string
        }
        Update: {
          dimension_id?: string
          evaluacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_dimensiones_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "materias_dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_dimensiones_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluacion_referencia_dimensiones: {
        Row: {
          dimension_id: string
          evaluacion_ref_id: string
        }
        Insert: {
          dimension_id: string
          evaluacion_ref_id: string
        }
        Update: {
          dimension_id?: string
          evaluacion_ref_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_referencia_dimensiones_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "materias_dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_referencia_dimensiones_evaluacion_ref_id_fkey"
            columns: ["evaluacion_ref_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones_referencia"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluacion_referencia_unidades: {
        Row: {
          evaluacion_ref_id: string
          unidad_id: string
        }
        Insert: {
          evaluacion_ref_id: string
          unidad_id: string
        }
        Update: {
          evaluacion_ref_id?: string
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_referencia_unidades_evaluacion_ref_id_fkey"
            columns: ["evaluacion_ref_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones_referencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_referencia_unidades_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluacion_unidades: {
        Row: {
          evaluacion_id: string
          unidad_id: string
        }
        Insert: {
          evaluacion_id: string
          unidad_id: string
        }
        Update: {
          evaluacion_id?: string
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_unidades_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_unidades_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          created_at: string
          deleted_at: string | null
          fecha: string | null
          id: string
          institucion_id: string
          materia_id: string
          nombre: string
          orden: number
          periodo_id: string
          permite_recuperatorio: boolean
          peso: number
          recuperatorio_de_evaluacion_id: string | null
          template_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fecha?: string | null
          id?: string
          institucion_id: string
          materia_id: string
          nombre: string
          orden?: number
          periodo_id: string
          permite_recuperatorio?: boolean
          peso?: number
          recuperatorio_de_evaluacion_id?: string | null
          template_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fecha?: string | null
          id?: string
          institucion_id?: string
          materia_id?: string
          nombre?: string
          orden?: number
          periodo_id?: string
          permite_recuperatorio?: boolean
          peso?: number
          recuperatorio_de_evaluacion_id?: string | null
          template_id?: string | null
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
          {
            foreignKeyName: "evaluaciones_recuperatorio_de_evaluacion_id_fkey"
            columns: ["recuperatorio_de_evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones_template"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones_referencia: {
        Row: {
          created_at: string
          deleted_at: string | null
          docente_id: string | null
          fecha: string | null
          id: string
          institucion_id: string
          materia_id: string
          nombre: string
          periodo_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          docente_id?: string | null
          fecha?: string | null
          id?: string
          institucion_id: string
          materia_id: string
          nombre: string
          periodo_id?: string | null
          tipo?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          docente_id?: string | null
          fecha?: string | null
          id?: string
          institucion_id?: string
          materia_id?: string
          nombre?: string
          periodo_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_referencia_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_referencia_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_referencia_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones_template: {
        Row: {
          created_at: string
          deleted_at: string | null
          fecha: string | null
          id: string
          institucion_id: string
          nombre: string
          orden: number
          periodo_id: string | null
          permite_recuperatorio: boolean
          peso: number
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fecha?: string | null
          id?: string
          institucion_id: string
          nombre: string
          orden?: number
          periodo_id?: string | null
          permite_recuperatorio?: boolean
          peso?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fecha?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
          orden?: number
          periodo_id?: string | null
          permite_recuperatorio?: boolean
          peso?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_template_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_template_periodo_id_fkey"
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
          logo_cuadrado_url: string | null
          logo_rectangular_url: string | null
          logo_url: string | null
          modulo_contenidos: boolean
          nombre: string
          nota_aprobacion: number | null
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
          logo_cuadrado_url?: string | null
          logo_rectangular_url?: string | null
          logo_url?: string | null
          modulo_contenidos?: boolean
          nombre: string
          nota_aprobacion?: number | null
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
          logo_cuadrado_url?: string | null
          logo_rectangular_url?: string | null
          logo_url?: string | null
          modulo_contenidos?: boolean
          nombre?: string
          nota_aprobacion?: number | null
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
      materias_dimensiones: {
        Row: {
          created_at: string
          id: string
          materia_id: string
          nombre: string
          orden: number
          peso: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_id: string
          nombre: string
          orden?: number
          peso?: number | null
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_id?: string
          nombre?: string
          orden?: number
          peso?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "materias_dimensiones_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
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
          dimension_id: string | null
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
          dimension_id?: string | null
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
          dimension_id?: string | null
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
            foreignKeyName: "notas_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "materias_dimensiones"
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
      notas_referencia: {
        Row: {
          alumno_id: string
          created_at: string
          dimension_id: string | null
          docente_id: string | null
          evaluacion_ref_id: string
          id: string
          institucion_id: string
          observacion: string | null
          valor_literal: string | null
          valor_numerico: number | null
        }
        Insert: {
          alumno_id: string
          created_at?: string
          dimension_id?: string | null
          docente_id?: string | null
          evaluacion_ref_id: string
          id?: string
          institucion_id: string
          observacion?: string | null
          valor_literal?: string | null
          valor_numerico?: number | null
        }
        Update: {
          alumno_id?: string
          created_at?: string
          dimension_id?: string | null
          docente_id?: string | null
          evaluacion_ref_id?: string
          id?: string
          institucion_id?: string
          observacion?: string | null
          valor_literal?: string | null
          valor_numerico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_referencia_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_referencia_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "materias_dimensiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_referencia_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_referencia_evaluacion_ref_id_fkey"
            columns: ["evaluacion_ref_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones_referencia"
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
          activo: boolean
          año_lectivo_id: string
          cerrado_at: string | null
          cerrado_por: string | null
          created_at: string
          deleted_at: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          institucion_id: string
          nombre: string
          orden: number
          publicado_at: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          año_lectivo_id: string
          cerrado_at?: string | null
          cerrado_por?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id: string
          nombre: string
          orden?: number
          publicado_at?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          año_lectivo_id?: string
          cerrado_at?: string | null
          cerrado_por?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id?: string
          nombre?: string
          orden?: number
          publicado_at?: string | null
          tipo?: string
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
            foreignKeyName: "periodos_cerrado_por_fkey"
            columns: ["cerrado_por"]
            isOneToOne: false
            referencedRelation: "personas"
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
          apellido: string | null
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
          apellido?: string | null
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
          apellido?: string | null
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
      unidades: {
        Row: {
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          institucion_id: string
          materia_id: string
          nombre: string
          orden: number
          publicado: boolean
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id: string
          materia_id: string
          nombre: string
          orden?: number
          publicado?: boolean
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion_id?: string
          materia_id?: string
          nombre?: string
          orden?: number
          publicado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "unidades_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_plantilla_a_curso: {
        Args: {
          p_curso_id: string
          p_institucion_id: string
          p_plantilla_id: string
        }
        Returns: number
      }
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
