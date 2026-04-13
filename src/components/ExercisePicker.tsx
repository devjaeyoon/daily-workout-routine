import * as Dialog from '@radix-ui/react-dialog'
import { useMemo, useState } from 'react'
import { EXERCISE_CATALOG, EXERCISE_CATEGORIES } from '../data/exercises'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

type ExercisePickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  alreadyAdded: Set<string>
  onPick: (name: string, category: string) => void
}

export function ExercisePicker({
  open,
  onOpenChange,
  alreadyAdded,
  onPick,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('전체')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EXERCISE_CATALOG.filter((e) => {
      if (category !== '전체' && e.category !== category) return false
      if (!q) return true
      return e.name.toLowerCase().includes(q)
    })
  }, [query, category])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-x-4 top-[8vh] z-50 mx-auto flex max-h-[min(640px,84vh)] max-w-lg flex-col rounded-[28px] bg-white p-5 shadow-[0_16px_48px_rgb(0_0_0/0.18)] focus:outline-none md:inset-x-auto md:left-1/2 md:w-full md:-translate-x-1/2"
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-[22px] font-bold tracking-tight text-[#191F28]">
                운동 추가
              </Dialog.Title>
              <p className="mt-1 text-[14px] text-[#8B95A1]">
                검색하거나 부위로 좁혀서 선택하세요.
              </p>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" className="shrink-0 rounded-full">
                닫기
              </Button>
            </Dialog.Close>
          </div>

          <div className="mb-3 space-y-2">
            <Label htmlFor="ex-search">검색</Label>
            <Input
              id="ex-search"
              placeholder="운동 이름"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="mb-4 space-y-2">
            <Label htmlFor="ex-category">부위</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="ex-category" aria-label="부위 필터">
                <SelectValue placeholder="부위 선택" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ul
            className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1 pb-1"
            role="listbox"
            aria-label="운동 목록"
          >
            {filtered.length === 0 ? (
              <li className="rounded-2xl bg-[#F9FAFB] px-4 py-8 text-center text-[15px] text-[#8B95A1]">
                검색 결과가 없습니다.
              </li>
            ) : (
              filtered.map((ex) => {
                const disabled = alreadyAdded.has(ex.name)
                return (
                  <li key={ex.name}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onPick(ex.name, ex.category)
                        onOpenChange(false)
                        setQuery('')
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#EEF1F4] bg-[#F9FAFB] px-4 py-3.5 text-left text-[15px] font-semibold text-[#191F28] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#F2F4F6]"
                    >
                      <span>{ex.name}</span>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-[#3182F6]">
                        {ex.category}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
