"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      isIconOnly
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onPress={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden="true" className="size-4.5" /> : <Moon aria-hidden="true" className="size-4.5" />}
    </Button>
  );
}
