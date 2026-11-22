"use client";

import { forwardRef, useEffect, useState } from "react";

const grouping = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function clean(value: string): string {
  return value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
}

export const AmountInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
    value: string;
    onValueChange?: (value: string) => void;
  }
>(function AmountInput({ value, onValueChange, onBlur, ...props }, ref) {
  const [display, setDisplay] = useState(value);

  useEffect(() => setDisplay(value), [value]);

  return (
    <input
      {...props}
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      value={display}
      onChange={(event) => {
        const next = clean(event.target.value);
        if (/^\d{0,10}(\.\d{0,2})?$/.test(next)) {
          setDisplay(next);
          onValueChange?.(next);
        }
      }}
      onBlur={(event) => {
        if (display && !Number.isNaN(Number(display))) {
          setDisplay(grouping.format(Number(display)));
        }
        onBlur?.(event);
      }}
      onFocus={() => setDisplay(clean(display))}
    />
  );
});
