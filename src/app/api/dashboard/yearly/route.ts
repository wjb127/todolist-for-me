import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { format, startOfYear, endOfYear } from 'date-fns'

// GET /api/dashboard/yearly?year=2025&type=todos|plans|all
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const type = searchParams.get('type') || 'all'

    const startDate = format(startOfYear(new Date(parseInt(year), 0, 1)), 'yyyy-MM-dd')
    const endDate = format(endOfYear(new Date(parseInt(year), 0, 1)), 'yyyy-MM-dd')

    const result: {
      todos?: Array<{ date: string; completed: boolean }>
      plans?: Array<{ due_date: string | null; completed: boolean }>
    } = {}

    // Fetch todos for the year (if type is 'todos' or 'all')
    if (type === 'todos' || type === 'all') {
      let allTodos: Array<{ date: string; completed: boolean }> = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: todosData, error: todosError } = await supabaseAdmin
          .from('todos')
          .select('date, completed')
          .gte('date', startDate)
          .lte('date', endDate)
          .eq('completed', true)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (todosError) {
          console.error('Error fetching todos:', todosError)
          break
        }

        if (todosData && todosData.length > 0) {
          allTodos = [...allTodos, ...todosData]
          hasMore = todosData.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      result.todos = allTodos
    }

    // Fetch plans for the year (if type is 'plans' or 'all')
    if (type === 'plans' || type === 'all') {
      let allPlans: Array<{ due_date: string | null; completed: boolean }> = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: plansData, error: plansError } = await supabaseAdmin
          .from('plans')
          .select('due_date, completed')
          .eq('completed', true)
          .not('due_date', 'is', null)
          .gte('due_date', startDate)
          .lte('due_date', endDate)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (plansError) {
          console.error('Error fetching plans:', plansError)
          break
        }

        if (plansData && plansData.length > 0) {
          allPlans = [...allPlans, ...plansData]
          hasMore = plansData.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      result.plans = allPlans
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching yearly dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch yearly dashboard data' }, { status: 500 })
  }
}
