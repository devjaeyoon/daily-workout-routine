import { formatRestLabel, formatTimer } from '../lib/format'
import { Button } from './ui/button'

type RestTimerBarProps = {
  exerciseName: string
  remaining: number
  onDismiss: () => void
}

export function RestTimerBar({
  exerciseName,
  remaining,
  onDismiss,
}: RestTimerBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E8EB] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgb(0_0_0/0.08)] backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label={`휴식 타이머 ${formatRestLabel(remaining)} 남음`}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[#8B95A1]">휴식</p>
            <p className="mt-0.5 line-clamp-1 text-[16px] font-bold text-[#191F28]">
              {exerciseName}
            </p>
          </div>
          <p className="font-mono text-[40px] font-bold leading-none tracking-tight text-[#3182F6]">
            {formatTimer(remaining)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onDismiss}
          >
            건너뛰기
          </Button>
        </div>
      </div>
    </div>
  )
}
