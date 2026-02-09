import { Shield, Star, Trophy, Gem, Crown, Sparkles } from 'lucide-react'

// 레벨별 정보 인터페이스
export interface LevelData {
  level: number
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
  xpRequired: number
}

export interface UserLevel {
  level: number
  currentXP: number
  xpToNext: number
  title: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

// ===== Todo 레벨 시스템 (6단계 랭크) =====

// Todo 일간 (하루 완료 개수 기준)
export const todoDailyLevels: LevelData[] = [
  { level: 1, title: "브론즈", icon: Shield, color: "text-amber-700", description: "오늘 하루를 시작했습니다", xpRequired: 0 },
  { level: 2, title: "실버", icon: Star, color: "text-gray-400", description: "꾸준히 해내고 있습니다", xpRequired: 5 },
  { level: 3, title: "골드", icon: Trophy, color: "text-yellow-500", description: "절반 이상 완료했습니다", xpRequired: 12 },
  { level: 4, title: "플래티넘", icon: Gem, color: "text-sky-400", description: "대부분 완료했습니다", xpRequired: 24 },
  { level: 5, title: "다이아", icon: Crown, color: "text-violet-500", description: "거의 다 해냈습니다", xpRequired: 36 },
  { level: 6, title: "챔피언", icon: Sparkles, color: "text-red-500", description: "오늘의 챔피언!", xpRequired: 45 },
]

// Todo 주간 (일주일 완료 개수 기준)
export const todoWeeklyLevels: LevelData[] = [
  { level: 1, title: "브론즈", icon: Shield, color: "text-amber-700", description: "한 주를 시작했습니다", xpRequired: 0 },
  { level: 2, title: "실버", icon: Star, color: "text-gray-400", description: "리듬을 찾고 있습니다", xpRequired: 35 },
  { level: 3, title: "골드", icon: Trophy, color: "text-yellow-500", description: "주간 목표의 절반 달성", xpRequired: 84 },
  { level: 4, title: "플래티넘", icon: Gem, color: "text-sky-400", description: "높은 달성률입니다", xpRequired: 168 },
  { level: 5, title: "다이아", icon: Crown, color: "text-violet-500", description: "이번 주의 강자입니다", xpRequired: 252 },
  { level: 6, title: "챔피언", icon: Sparkles, color: "text-red-500", description: "이번 주의 챔피언!", xpRequired: 315 },
]

// Todo 월간 (한 달 완료 개수 기준)
export const todoMonthlyLevels: LevelData[] = [
  { level: 1, title: "브론즈", icon: Shield, color: "text-amber-700", description: "한 달을 시작했습니다", xpRequired: 0 },
  { level: 2, title: "실버", icon: Star, color: "text-gray-400", description: "꾸준히 쌓아가는 중", xpRequired: 150 },
  { level: 3, title: "골드", icon: Trophy, color: "text-yellow-500", description: "월간 목표의 절반 달성", xpRequired: 360 },
  { level: 4, title: "플래티넘", icon: Gem, color: "text-sky-400", description: "놀라운 한 달입니다", xpRequired: 720 },
  { level: 5, title: "다이아", icon: Crown, color: "text-violet-500", description: "이번 달의 강자입니다", xpRequired: 1080 },
  { level: 6, title: "챔피언", icon: Sparkles, color: "text-red-500", description: "이번 달의 챔피언!", xpRequired: 1350 },
]

// ===== 계획 레벨 시스템 (6단계 랭크) =====

// Plans 일간 (하루 완료 개수 기준)
export const planDailyLevels: LevelData[] = [
  { level: 1, title: "브론즈", icon: Shield, color: "text-amber-700", description: "오늘의 계획을 세웠습니다", xpRequired: 0 },
  { level: 2, title: "실버", icon: Star, color: "text-gray-400", description: "실행에 옮겼습니다", xpRequired: 1 },
  { level: 3, title: "골드", icon: Trophy, color: "text-yellow-500", description: "목표를 달성하고 있습니다", xpRequired: 3 },
  { level: 4, title: "플래티넘", icon: Gem, color: "text-sky-400", description: "높은 실행력입니다", xpRequired: 5 },
  { level: 5, title: "다이아", icon: Crown, color: "text-violet-500", description: "오늘의 강자입니다", xpRequired: 8 },
  { level: 6, title: "챔피언", icon: Sparkles, color: "text-red-500", description: "오늘의 챔피언!", xpRequired: 12 },
]

// Plans 주간 (일주일 완료 개수 기준)
export const planWeeklyLevels: LevelData[] = [
  { level: 1, title: "브론즈", icon: Shield, color: "text-amber-700", description: "한 주의 계획을 세웠습니다", xpRequired: 0 },
  { level: 2, title: "실버", icon: Star, color: "text-gray-400", description: "계획을 추진 중입니다", xpRequired: 5 },
  { level: 3, title: "골드", icon: Trophy, color: "text-yellow-500", description: "착실히 달성 중입니다", xpRequired: 12 },
  { level: 4, title: "플래티넘", icon: Gem, color: "text-sky-400", description: "높은 달성률입니다", xpRequired: 24 },
  { level: 5, title: "다이아", icon: Crown, color: "text-violet-500", description: "이번 주의 강자입니다", xpRequired: 36 },
  { level: 6, title: "챔피언", icon: Sparkles, color: "text-red-500", description: "이번 주의 챔피언!", xpRequired: 48 },
]

// Plans 월간 (한 달 완료 개수 기준)
export const planMonthlyLevels: LevelData[] = [
  { level: 1, title: "브론즈", icon: Shield, color: "text-amber-700", description: "한 달의 목표를 세웠습니다", xpRequired: 0 },
  { level: 2, title: "실버", icon: Star, color: "text-gray-400", description: "목표를 향해 나아갑니다", xpRequired: 20 },
  { level: 3, title: "골드", icon: Trophy, color: "text-yellow-500", description: "착실히 성취하고 있습니다", xpRequired: 50 },
  { level: 4, title: "플래티넘", icon: Gem, color: "text-sky-400", description: "놀라운 한 달입니다", xpRequired: 100 },
  { level: 5, title: "다이아", icon: Crown, color: "text-violet-500", description: "이번 달의 강자입니다", xpRequired: 150 },
  { level: 6, title: "챔피언", icon: Sparkles, color: "text-red-500", description: "이번 달의 챔피언!", xpRequired: 200 },
]

// 레벨 정보 계산 함수
export function getLevelInfo(xp: number, levelSystem: LevelData[]): UserLevel {
  // 현재 레벨 찾기
  let currentLevelData = levelSystem[0]
  for (let i = levelSystem.length - 1; i >= 0; i--) {
    if (xp >= levelSystem[i].xpRequired) {
      currentLevelData = levelSystem[i]
      break
    }
  }

  // 다음 레벨 정보
  const nextLevelIndex = Math.min(currentLevelData.level, levelSystem.length - 1)
  const nextLevel = levelSystem[nextLevelIndex]
  const nextLevelXP = nextLevel ? nextLevel.xpRequired : currentLevelData.xpRequired

  const currentXP = xp - currentLevelData.xpRequired
  const xpToNext = nextLevelXP - xp

  return {
    level: currentLevelData.level,
    currentXP: Math.max(0, currentXP),
    xpToNext: Math.max(0, xpToNext),
    title: currentLevelData.title,
    color: currentLevelData.color,
    icon: currentLevelData.icon,
    description: currentLevelData.description
  }
}
