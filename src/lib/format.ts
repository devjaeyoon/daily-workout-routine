import type { WorkoutExercise } from '../types/workout'

export function formatRestLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}초`
  if (s === 0) return `${m}분`
  return `${m}분 ${s}초`
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 기획서 3.3 GPT용 프롬프트 텍스트 */
export function buildPromptText(date: Date, logs: WorkoutExercise[]): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const header = `[${y}-${mo}-${d} 운동 기록]`

  if (logs.length === 0) {
    return `${header}\n\n기록된 운동이 없습니다.`
  }

  const blocks = logs.map((ex, idx) => {
    const lines = ex.sets.map((st) => {
      const rest = formatRestLabel(st.restTime)
      return `\t\t- ${st.setNumber}세트: ${st.weight}kg ${st.reps}회 (${st.rir}PIR, 휴식 ${rest})`
    })
    return `\t${idx + 1}. ${ex.exerciseName}\n${lines.join('\n')}`
  })

  const footer = `\n\t\t위 세트별 중량 및 반복 수 변화, RIR(PIR), 휴식 시간을 바탕으로 오늘의 근비대 훈련 볼륨과 강도 설정이 적절했는지 분석해 줘.`

  return `${header}\n\n${blocks.join('\n\n')}${footer}`
}
