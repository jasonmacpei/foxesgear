import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none ring-0 transition placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] ${className}`}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";


