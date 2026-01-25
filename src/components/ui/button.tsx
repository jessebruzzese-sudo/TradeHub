import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',

        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80',

        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80',

        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70',

        ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',

        link: 'text-primary underline-offset-4 hover:underline',

        // ✅ TradeHub semantic variants
        // 🔴 Project Tendering
        'primary-red':
          'bg-red-500 text-white border border-red-200 hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-400',

        'secondary-red':
          'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:bg-red-200 focus-visible:ring-red-300',

        // 🟢 Jobs
        'primary-green':
          'bg-green-500 text-white border border-green-200 hover:bg-green-600 active:bg-green-700 focus-visible:ring-green-400',

        'secondary-green':
          'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:bg-green-200 focus-visible:ring-green-300',
      },

      size: {
        default: 'h-10 px-4 py-2 min-h-[44px]',
        sm: 'h-9 rounded-md px-3 min-h-[36px]',
        lg: 'h-11 rounded-md px-8 min-h-[48px]',
        icon: 'h-10 w-10 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
