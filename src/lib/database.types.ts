export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string
          title: string
          description: string | null
          items: TemplateItem[]
          is_active: boolean
          applied_from_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          items: TemplateItem[]
          is_active?: boolean
          applied_from_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          items?: TemplateItem[]
          is_active?: boolean
          applied_from_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      todos: {
        Row: {
          id: string
          template_id: string | null
          date: string
          title: string
          description: string | null
          completed: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          date: string
          title: string
          description?: string | null
          completed?: boolean
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string | null
          date?: string
          title?: string
          description?: string | null
          completed?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          title: string
          description: string | null
          due_date: string | null
          completed: boolean
          priority: 'low' | 'medium' | 'high'
          order_index: number
          parent_id: string | null
          depth: number
          is_expanded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          due_date?: string | null
          completed?: boolean
          priority?: 'low' | 'medium' | 'high'
          order_index?: number
          parent_id?: string | null
          depth?: number
          is_expanded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          completed?: boolean
          priority?: 'low' | 'medium' | 'high'
          order_index?: number
          parent_id?: string | null
          depth?: number
          is_expanded?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bucketlist: {
        Row: {
          id: string
          parent_id: string | null
          title: string
          description: string | null
          category: string
          target_date: string | null
          completed: boolean
          completed_at: string | null
          priority: 'low' | 'medium' | 'high'
          depth: number
          order_index: number
          is_expanded: boolean
          notes: string | null
          tags: string[] | null
          progress: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id?: string | null
          title: string
          description?: string | null
          category?: string
          target_date?: string | null
          completed?: boolean
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high'
          depth?: number
          order_index?: number
          is_expanded?: boolean
          notes?: string | null
          tags?: string[] | null
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_id?: string | null
          title?: string
          description?: string | null
          category?: string
          target_date?: string | null
          completed?: boolean
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high'
          depth?: number
          order_index?: number
          is_expanded?: boolean
          notes?: string | null
          tags?: string[] | null
          progress?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export interface TemplateItem {
  id: string
  title: string
  description?: string
  order_index: number
}