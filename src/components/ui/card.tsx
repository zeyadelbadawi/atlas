import * as React from 'react';

import { cn } from '../../lib/utils';
const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'rounded-lg border bg-card text-card-foreground shadow-sm',
            className
        )}
        {...props}
    />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

/**
 * The card's heading.
 *
 * `as` sets the heading LEVEL without touching the look, because the
 * right level depends on where the card sits and a primitive cannot know
 * that. It defaults to `h3`, which is what this component always emitted,
 * so every existing call site is unchanged.
 *
 * Why it needed to become a choice: a page whose own title is an `h1`
 * and whose cards are its top-level sections was announcing `h1` then
 * `h3`, skipping a level — and a card that also contains `h3`
 * subsections was giving its title and its subsections the same rank.
 * Screen-reader users navigate by that structure. Changing the DEFAULT to
 * `h2` would have been the wrong fix: cards nested inside an `h2` section
 * are correct at `h3` today, and 77 files use this.
 */
type CardTitleLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const CardTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement> & { as?: CardTitleLevel }
>(({ className, as: Heading = 'h3', ...props }, ref) => (
    <Heading
        ref={ref}
        className={cn(
            'text-2xl font-semibold leading-none tracking-tight',
            className
        )}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
};
