import { Target, Star, Award, Zap, Trophy, Crown, Gem, Shield, Rocket, Sparkles } from 'lucide-react'

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

// Todo 일간 레벨 시스템 (하루 완료 개수 기준)
export const todoDailyLevels: LevelData[] = [
  { level: 1, title: "새벽", icon: Target, color: "text-gray-500", description: "하루를 시작했습니다", xpRequired: 0 },
  { level: 2, title: "아침", icon: Star, color: "text-blue-400", description: "활기찬 아침을 맞이했습니다", xpRequired: 3 },
  { level: 3, title: "오전", icon: Award, color: "text-green-400", description: "오전을 알차게 보냈습니다", xpRequired: 5 },
  { level: 4, title: "점심", icon: Zap, color: "text-yellow-500", description: "반나절을 완주했습니다", xpRequired: 8 },
  { level: 5, title: "오후", icon: Trophy, color: "text-orange-500", description: "오후도 열심히 달렸습니다", xpRequired: 12 },
  { level: 6, title: "저녁", icon: Crown, color: "text-purple-500", description: "저녁까지 최선을 다했습니다", xpRequired: 16 },
  { level: 7, title: "밤", icon: Gem, color: "text-pink-500", description: "하루를 완벽히 마무리했습니다", xpRequired: 20 },
  { level: 8, title: "자정", icon: Shield, color: "text-indigo-500", description: "놀라운 생산성입니다", xpRequired: 25 },
  { level: 9, title: "불야성", icon: Rocket, color: "text-amber-500", description: "멈추지 않는 실행력!", xpRequired: 30 },
  { level: 10, title: "전설", icon: Sparkles, color: "text-violet-500", description: "오늘의 전설이 되었습니다", xpRequired: 40 }
]

// Todo 주간 레벨 시스템 (일주일 완료 개수 기준)
export const todoWeeklyLevels: LevelData[] = [
  { level: 1, title: "월요병", icon: Target, color: "text-gray-500", description: "한 주를 시작했습니다", xpRequired: 0 },
  { level: 2, title: "화수목", icon: Star, color: "text-blue-400", description: "일주일의 리듬을 찾았습니다", xpRequired: 15 },
  { level: 3, title: "주중전사", icon: Award, color: "text-green-400", description: "꾸준히 실행하고 있습니다", xpRequired: 30 },
  { level: 4, title: "금요일", icon: Zap, color: "text-yellow-500", description: "주말이 보이기 시작합니다", xpRequired: 50 },
  { level: 5, title: "주말러", icon: Trophy, color: "text-orange-500", description: "일주일을 알차게 보냈습니다", xpRequired: 70 },
  { level: 6, title: "일주완", icon: Crown, color: "text-purple-500", description: "일주일 내내 최선을 다했습니다", xpRequired: 90 },
  { level: 7, title: "위클리킹", icon: Gem, color: "text-pink-500", description: "한 주의 달인입니다", xpRequired: 110 },
  { level: 8, title: "7일천하", icon: Shield, color: "text-indigo-500", description: "일주일을 정복했습니다", xpRequired: 130 },
  { level: 9, title: "주간전설", icon: Rocket, color: "text-amber-500", description: "전설적인 한 주였습니다", xpRequired: 150 },
  { level: 10, title: "주신", icon: Sparkles, color: "text-violet-500", description: "한 주의 신화가 되었습니다", xpRequired: 180 }
]

// Todo 월간 레벨 시스템 (한 달 완료 개수 기준)
export const todoMonthlyLevels: LevelData[] = [
  { level: 1, title: "초하루", icon: Target, color: "text-gray-500", description: "한 달을 시작했습니다", xpRequired: 0 },
  { level: 2, title: "초순", icon: Star, color: "text-blue-400", description: "한 달의 첫 발을 내딛었습니다", xpRequired: 50 },
  { level: 3, title: "중순", icon: Award, color: "text-green-400", description: "한 달의 중반을 넘어섰습니다", xpRequired: 100 },
  { level: 4, title: "하순", icon: Zap, color: "text-yellow-500", description: "한 달의 마무리가 보입니다", xpRequired: 180 },
  { level: 5, title: "월말정산", icon: Trophy, color: "text-orange-500", description: "한 달을 성실히 보냈습니다", xpRequired: 280 },
  { level: 6, title: "월간왕", icon: Crown, color: "text-purple-500", description: "한 달 내내 최선을 다했습니다", xpRequired: 380 },
  { level: 7, title: "30일챌린지", icon: Gem, color: "text-pink-500", description: "한 달의 달인입니다", xpRequired: 480 },
  { level: 8, title: "월드클래스", icon: Shield, color: "text-indigo-500", description: "놀라운 한 달이었습니다", xpRequired: 600 },
  { level: 9, title: "월간전설", icon: Rocket, color: "text-amber-500", description: "전설적인 한 달이었습니다", xpRequired: 750 },
  { level: 10, title: "월신", icon: Sparkles, color: "text-violet-500", description: "한 달의 신화가 되었습니다", xpRequired: 900 }
]

// Plans 일간 레벨 시스템 (하루 완료 개수 기준)
export const planDailyLevels: LevelData[] = [
  { level: 1, title: "계획자", icon: Target, color: "text-gray-500", description: "오늘의 계획을 세웠습니다", xpRequired: 0 },
  { level: 2, title: "실행가", icon: Star, color: "text-blue-400", description: "계획을 실행에 옮겼습니다", xpRequired: 1 },
  { level: 3, title: "도전자", icon: Award, color: "text-green-400", description: "더 많은 도전을 시작했습니다", xpRequired: 2 },
  { level: 4, title: "달성자", icon: Zap, color: "text-yellow-500", description: "목표를 착실히 달성했습니다", xpRequired: 3 },
  { level: 5, title: "완수자", icon: Trophy, color: "text-orange-500", description: "오늘의 목표를 완수했습니다", xpRequired: 5 },
  { level: 6, title: "초월자", icon: Crown, color: "text-purple-500", description: "기대를 초월했습니다", xpRequired: 7 },
  { level: 7, title: "마스터", icon: Gem, color: "text-pink-500", description: "계획 달성의 달인입니다", xpRequired: 10 },
  { level: 8, title: "에이스", icon: Shield, color: "text-indigo-500", description: "놀라운 실행력입니다", xpRequired: 13 },
  { level: 9, title: "챔피언", icon: Rocket, color: "text-amber-500", description: "오늘의 챔피언입니다", xpRequired: 16 },
  { level: 10, title: "히어로", icon: Sparkles, color: "text-violet-500", description: "오늘의 영웅이 되었습니다", xpRequired: 20 }
]

// Plans 주간 레벨 시스템 (일주일 완료 개수 기준)
export const planWeeklyLevels: LevelData[] = [
  { level: 1, title: "기획자", icon: Target, color: "text-gray-500", description: "일주일의 계획을 세웠습니다", xpRequired: 0 },
  { level: 2, title: "추진자", icon: Star, color: "text-blue-400", description: "계획을 추진하고 있습니다", xpRequired: 5 },
  { level: 3, title: "진행자", icon: Award, color: "text-green-400", description: "순조롭게 진행 중입니다", xpRequired: 10 },
  { level: 4, title: "완성자", icon: Zap, color: "text-yellow-500", description: "계획들을 완성하고 있습니다", xpRequired: 18 },
  { level: 5, title: "달성왕", icon: Trophy, color: "text-orange-500", description: "목표 달성의 고수입니다", xpRequired: 28 },
  { level: 6, title: "주간왕", icon: Crown, color: "text-purple-500", description: "한 주를 완벽히 소화했습니다", xpRequired: 40 },
  { level: 7, title: "프로", icon: Gem, color: "text-pink-500", description: "프로페셔널한 실행력입니다", xpRequired: 55 },
  { level: 8, title: "그랜드마스터", icon: Shield, color: "text-indigo-500", description: "최고 수준의 달성률입니다", xpRequired: 70 },
  { level: 9, title: "레전드", icon: Rocket, color: "text-amber-500", description: "전설적인 한 주였습니다", xpRequired: 85 },
  { level: 10, title: "갓", icon: Sparkles, color: "text-violet-500", description: "신의 경지에 도달했습니다", xpRequired: 100 }
]

// Plans 월간 레벨 시스템 (한 달 완료 개수 기준)
export const planMonthlyLevels: LevelData[] = [
  { level: 1, title: "목표설정", icon: Target, color: "text-gray-500", description: "한 달의 목표를 세웠습니다", xpRequired: 0 },
  { level: 2, title: "목표추진", icon: Star, color: "text-blue-400", description: "목표를 향해 나아갑니다", xpRequired: 15 },
  { level: 3, title: "계획왕", icon: Award, color: "text-green-400", description: "계획 실행의 고수입니다", xpRequired: 35 },
  { level: 4, title: "성취자", icon: Zap, color: "text-yellow-500", description: "많은 것을 성취했습니다", xpRequired: 60 },
  { level: 5, title: "월간강자", icon: Trophy, color: "text-orange-500", description: "한 달 내내 강력했습니다", xpRequired: 90 },
  { level: 6, title: "월간제왕", icon: Crown, color: "text-purple-500", description: "한 달을 지배했습니다", xpRequired: 130 },
  { level: 7, title: "월간마스터", icon: Gem, color: "text-pink-500", description: "한 달 달성의 달인입니다", xpRequired: 180 },
  { level: 8, title: "월간그랜드", icon: Shield, color: "text-indigo-500", description: "그랜드 슬램을 달성했습니다", xpRequired: 240 },
  { level: 9, title: "월간레전드", icon: Rocket, color: "text-amber-500", description: "전설적인 한 달이었습니다", xpRequired: 310 },
  { level: 10, title: "월간불멸", icon: Sparkles, color: "text-violet-500", description: "불멸의 업적을 남겼습니다", xpRequired: 400 }
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
