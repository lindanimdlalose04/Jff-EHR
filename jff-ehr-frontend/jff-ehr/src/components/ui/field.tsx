import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-control border border-field-border bg-field px-2.5 text-sm text-primary " +
  "outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 " +
  "placeholder:text-muted disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-[38px]", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-[54px] resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "h-[38px]", className)} {...props} />
  ),
);
Select.displayName = "Select";
