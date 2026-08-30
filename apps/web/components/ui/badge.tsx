import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground font-bold shadow-sm',
        secondary: 'border-border bg-secondary text-foreground',
        outline: 'text-foreground border-border bg-transparent',
        success: 'border-success/30 bg-success/15 text-success font-medium',
        'success-solid':
          'border-transparent bg-success text-success-foreground font-bold',
        destructive:
          'border-destructive/30 bg-destructive/15 text-destructive font-medium',
        'destructive-solid':
          'border-transparent bg-destructive text-destructive-foreground font-bold',
        warning: 'border-warning/30 bg-warning/15 text-warning font-medium',
        'warning-solid':
          'border-transparent bg-warning text-warning-foreground font-bold',
        cancelled:
          'border-cancelled/30 bg-cancelled/20 text-cancelled font-medium',
        muted: 'border-border/60 bg-secondary/60 text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({
  className,
  variant,
  ...props
}: BadgeProps): React.ReactElement {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
