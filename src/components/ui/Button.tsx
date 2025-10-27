import * as React from "react";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
    const variantClass =
      variant === "primary"
        ? "bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-[color:var(--ring)]"
        : variant === "outline"
          ? "border border-border bg-background text-foreground hover:bg-muted"
          : "bg-transparent text-foreground hover:bg-muted";
    const sizeClass =
      size === "sm" ? "h-8 px-3 text-sm" : size === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-sm";
    return (
      <button ref={ref} className={`${base} ${variantClass} ${sizeClass} ${className}`} {...props} />
    );
  },
);
Button.displayName = "Button";


