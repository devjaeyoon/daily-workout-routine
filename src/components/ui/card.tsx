import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[24px] bg-white p-5 shadow-[0_2px_12px_rgb(0_0_0/0.06)]',
        className,
      )}
      {...props}
    />
  );
}
