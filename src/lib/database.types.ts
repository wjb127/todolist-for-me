export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string
          title: string
          description: string | null
          items: TemplateItem[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          items: TemplateItem[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          items?: TemplateItem[]
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