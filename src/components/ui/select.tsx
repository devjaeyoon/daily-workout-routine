/* eslint-disable react-refresh/only-export-components -- Radix Select 루트 프리미티브 재노출 */
import * as SelectPrimitive from '@radix-ui/react-select'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/utils'

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-[#E5E8EB] bg-white px-4 text-left text-[15px] font-semibold text-[#191F28] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6] data-[placeholder]:text-[#B0B8C1]',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-5 shrink-0 text-[#8B95A1]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          'z-50 max-h-[min(320px,70vh)] overflow-hidden rounded-2xl border border-[#E5E8EB] bg-white py-1 shadow-[0_8px_24px_rgb(0_0_0/0.12)]',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(position === 'popper' && 'p-1')}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-xl py-3 pl-3 pr-8 text-[15px] font-medium text-[#191F28] outline-none transition-colors data-[highlighted]:bg-[#F2F4F6] data-[state=checked]:text-[#3182F6]',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
