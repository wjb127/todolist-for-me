import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/dashboard/stats?startDate=2024-01-01&endDate=2024-01-31
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
    }

    // Pagination을 사용하여 모든 todos 가져오기
    let allTodos: unknown[] = []
    let todosPage = 0
    const pageSize = 1000
    let hasTodosMore = true

    while (hasTodosMore) {
      const { data: todosData, error: todosError } = await supabaseAdmin
        .from('todos')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .range(todosPage * pageSize, (todosPage + 1) * pageSize - 1)

      if (todosError) {
        console.error('Error fetching todos:', todosError)
        break
      }

      if (todosData && todosData.length > 0) {
        allTodos = [...allTodos, ...todosData]
        hasTodosMore = todosData.length === pageSize
        todosPage++
      } else {
        hasTodosMore = false
      }
    }

    // Pagination을 사용하여 모든 plans 가져오기
    let allPlans: unknown[] = []
    let plansPage = 0
    let hasPlansMore = true

    while (hasPlansMore) {
      const { data: plansData, error: plansError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .range(plansPage * pageSize, (plansPage + 1) * pageSize - 1)

      if (plansError) {
        console.error('Error fetching plans:', plansError)
        break
      }

      if (plansData && plansData.length > 0) {
        allPlans = [...allPlans, ...plansData]
        hasPlansMore = plansData.length === pageSize
        plansPage++
      } else {
        hasPlansMore = false
      }
    }

    return NextResponse.json({ todos: allTodos, plans: allPlans })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
