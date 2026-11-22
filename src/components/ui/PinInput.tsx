"use client";

import { forwardRef } from "react";

export const PinInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode">
>(function PinInput(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      pattern="[0-9]{4,6}"
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "");
        event.target.value = digits;
        props.onChange?.(event);
      }}
    />
  );
});
