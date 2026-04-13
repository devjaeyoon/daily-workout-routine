import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3182F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F2F4F6]',
  {
    variants: {
      variant: {
        primary:
          'rounded-3xl bg-[#3182F6] px-5 py-3.5 text-[15px] text-white shadow-sm hover:bg-[#1B64DA]',
        secondary:
          'rounded-3xl bg-[#E8F3FF] px-5 py-3.5 text-[15px] text-[#3182F6] hover:bg-[#D3E6FF]',
        outline:
          'rounded-3xl border border-[#E5E8EB] bg-white px-5 py-3.5 text-[15px] text-[#191F28] hover:bg-[#F9FAFB]',
        ghost:
          'rounded-2xl px-3 py-2 text-[14px] text-[#4E5968] hover:bg-black/5',
        icon: 'size-11 shrink-0 rounded-2xl border border-[#E5E8EB] bg-white text-[#191F28] hover:bg-[#F9FAFB]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant }), className)} {...props} />
  )
}
