import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white border-transparent hover:bg-accent/90",
  secondary: "bg-surface text-secondary border-field-border hover:bg-field",
  danger: "bg-danger text-white border-transparent hover:bg-danger/90",
};

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-control border " +
          "px-4 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 " +
          "disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
