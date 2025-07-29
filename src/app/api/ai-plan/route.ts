import { NextRequest, NextResponse } from 'next/server'

// AI 결과물에서 AI티나는 요소들을 제거하고 가독성을 개선하는 함수
function cleanAiResponse(text: string): string {
  return text
    // 이모지 제거 (유니코드 이모지 패턴)
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // ** 강조 표시 제거
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // * 강조 표시 제거
    .replace(/\*(.*?)\*/g, '$1')
    // ~~ 취소선 제거
    .replace(/~~(.*?)~~/g, '$1')
    // 물결표 제거
    .replace(/~/g, '')
    // 섹션 제목 뒤에 빈 줄 추가 (액션플랜:, 추천 일정:, 주의사항: 등)
    .replace(/(액션플랜|추천\s*일정|주의사항|고려사항|권장사항):\s*/g, '$1:\n\n')
    // 숫자 목록 앞에 빈 줄 추가 (연속되지 않은 경우)
    .replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2')
    // 대시 목록(-) 앞에 빈 줄 추가 (연속되지 않은 경우)
    .replace(/([^\n])\n(-\s)/g, '$1\n\n$2')
    // 긴 문장을 적당한 길이로 줄바꿈 (문장 끝에서만)
    .replace(/([.!?])\s+(\S)/g, '$1\n$2')
    // 연속된 공백 정리
    .replace(/[ \t]+/g, ' ')
    // 연속된 줄바꿈 정리 (3개 이상을 2개로)
    .replace(/\n{3,}/g, '\n\n')
    // 앞뒤 공백 제거
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, dueDate, priority } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: '계획 제목이 필요합니다.' },
        { status: 400 }
      )
    }

    const prompt = `다음 계획을 작은 단위의 액션플랜으로 나누어 주세요:

계획 제목: ${title}
${description ? `계획 설명: ${description}` : ''}
${dueDate ? `마감일: ${dueDate}` : ''}
우선순위: ${priority === 'high' ? '높음' : priority === 'medium' ? '보통' : '낮음'}

요구사항:
1. 구체적이고 실행 가능한 작은 단위로 나누어 주세요
2. 각 액션은 명확하고 측정 가능해야 합니다
3. 시간 순서나 논리적 순서를 고려해 주세요
4. 한국어로 답변해 주세요
5. 이모지, 강조 표시(별표, 물결표 등), AI스러운 표현은 사용하지 마세요
6. 다음 형식으로 답변해 주세요:

액션플랜:

1. [첫 번째 액션 항목]
2. [두 번째 액션 항목]
3. [세 번째 액션 항목]
...

추천 일정:
- [시간 배분이나 순서에 대한 조언]

주의사항:
- [계획 실행 시 고려할 점들]`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 계획 수립과 프로젝트 관리 전문가입니다. 사용자의 계획을 구체적이고 실행 가능한 작은 단위로 나누어 체계적인 액션플랜을 제공합니다. 이모지, 강조표시, AI스러운 표현을 사용하지 말고 자연스럽고 실용적인 조언을 해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`)
    }

    const data = await response.json()
    let aiSuggestion = data.choices[0]?.message?.content

    if (!aiSuggestion) {
      throw new Error('AI 응답을 받을 수 없습니다.')
    }

    // AI 응답을 정제
    aiSuggestion = cleanAiResponse(aiSuggestion)

    return NextResponse.json({ suggestion: aiSuggestion })

  } catch (error) {
    console.error('AI 계획 생성 오류:', error)
    return NextResponse.json(
      { error: 'AI 도움 기능에 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}