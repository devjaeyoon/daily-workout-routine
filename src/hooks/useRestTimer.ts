import { useCallback, useEffect, useState } from 'react'

type ActiveTimer = {
  remaining: number
  exerciseName: string
}

function notifyRestComplete() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 40, 30])
    }
  } catch {
    /* ignore */
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('휴식 완료', { body: '다음 세트를 시작하세요.' })
  }
}

export function useRestTimer() {
  const [active, setActive] = useState<ActiveTimer | null>(null)

  const start = useCallback((seconds: number, exerciseName: string) => {
    if (seconds <= 0) return
    setActive({ remaining: seconds, exerciseName })
  }, [])

  const dismiss = useCallback(() => {
    setActive(null)
  }, [])

  useEffect(() => {
    if (!active || active.remaining <= 0) return

    const id = window.setTimeout(() => {
      setActive((prev) => {
        if (!prev) return null
        const next = prev.remaining - 1
        if (next <= 0) {
          notifyRestComplete()
          return null
        }
        return { ...prev, remaining: next }
      })
    }, 1000)

    return () => clearTimeout(id)
  }, [active])

  return { active, start, dismiss }
}
