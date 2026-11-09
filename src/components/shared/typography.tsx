import type * as React from "react";

import { cn } from "@/lib/cn";

export const typographyStyles = {
  variants: {
    heading: "font-primary",
    paragraph: "font-secondary",
  },
  sizes: {
    "7xl": "text-[clamp(2.75rem,5vw,4rem)] leading-[1.05] tracking-tight",
    "6xl": "text-[clamp(2.25rem,4vw,3rem)] leading-[1.1] tracking-tight",
    "5xl": "text-[clamp(2rem,3vw,2.625rem)] leading-[1.15]",
    "4xl": "text-4xl leading-tight",
    "3xl": "text-3xl leading-tight",
    "2xl": "text-2xl leading-snug",
    xl: "text-xl leading-snug",
    lg: "text-lg leading-relaxed",
    base: "text-base leading-relaxed",
    sm: "text-sm leading-normal",
    xs: "text-xs leading-normal",
  },
} as const;

type TypographyVariant = keyof typeof typographyStyles.variants;
type Typographysize = keyof typeof typographyStyles.sizes;

export type TypographyProps<T extends React.ElementType = "p"> = {
  as?: T;
  variant?: TypographyVariant;
  size?: Typographysize;
  className?: string;
  children: React.ReactNode;
} & Omit<
  React.ComponentPropsWithoutRef<T>,
  "as" | "variant" | "size" | "className" | "children"
>;

export default function Typogprahy<T extends React.ElementType = "p">({
  as,
  variant = "paragraph",
  size = "base",
  className,
  children,
  ...props
}: TypographyProps<T>) {
  const Component = as || "p";

  return (
    <Component
      {...props}
      className={cn(
        typographyStyles.variants[variant],
        typographyStyles.sizes[size],
        className,
      )}
    >
      {children}
    </Component>
  );
}
