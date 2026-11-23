"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="ghost"
      className="justify-start text-brand-foreground hover:bg-brand-hover"
      isPending={pending}
      isDisabled={pending}
      onPress={async () => {
        setPending(true);
        try {
          await authClient.signOut();
          router.push("/login");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      Sign out
    </Button>
  );
}
