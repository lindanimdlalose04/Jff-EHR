import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Entered data is read back more often than it is typed, so controls use the
 * body step rather than the small step. The focus state is a solid two-pixel
 * accent outline drawn inside the control: crisper than a soft ring, and it
 * does not shift layout.
 */
const fieldBase =
  "w-full rounded-control border border-field-border bg-field px-2.5 text-base text-primary " +
  "transition placeholder:text-muted disabled:opacity-60 " +
  "focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-accent";

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
