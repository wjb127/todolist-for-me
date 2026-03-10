import { Database } from '@/lib/database.types'

type Todo = Database['public']['Tables']['todos']['Row']
type Plan = Database['public']['Tables']['plans']['Row']

export interface DayCompletionRate {
  date: string
  label: string
  rate: number
  completed: number
  total: number
}

// todo.date 기준 일별 완료율 계산
export function calcTodoDailyRates(todos: Todo[], dates: string[]): DayCompletionRate[] {
  return dates.map(date => {
    const dayTodos = todos.filter(t => t.date === date)
    const total = dayTodos.length
    const completed = dayTodos.filter(t => t.completed).length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    // 요일 레이블 (월~일)
    const d = new Date(date + 'T00:00:00')
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    return { date, label: dayNames[d.getDay()], rate, completed, total }
  })
}

// plan.due_date 기준 일별 완료율 계산
export function calcPlanDailyRates(plans: Plan[], dates: string[]): DayCompletionRate[] {
  return dates.map(date => {
    const dayPlans = plans.filter(p => p.due_date === date)
    const total = dayPlans.length
    const completed = dayPlans.filter(p => p.completed).length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    const d = new Date(date + 'T00:00:00')
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    return { date, label: dayNames[d.getDay()], rate, completed, total }
  })
}
