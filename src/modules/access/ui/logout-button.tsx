"use client";

import { useRouter } from "next/navigation";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import Button from "@mui/material/Button";
import { withBasePath } from "@/modules/platform/lib/base-path";

interface LogoutButtonProps {
  fullWidth?: boolean;
}

export function LogoutButton({ fullWidth = false }: LogoutButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outlined"
      color="inherit"
      fullWidth={fullWidth}
      startIcon={<LogoutRoundedIcon />}
      sx={{
        justifyContent: "flex-start",
        borderColor: "divider",
        color: "text.primary",
        "&:hover": {
          borderColor: "primary.light",
          bgcolor: "primary.50"
        }
      }}
      onClick={async () => {
        await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Sair
    </Button>
  );
}
