import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input({
  className,
  type = 'text',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'w-full rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] px-4 py-3.5 text-[17px] font-medium text-[#191F28] transition-colors placeholder:text-[#B0B8C1] focus-visible:border-[#3182F6] focus-visible:bg-white focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
}
