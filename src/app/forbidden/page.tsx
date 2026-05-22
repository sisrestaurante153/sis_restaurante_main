import Link from "next/link";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { logoutAction } from "@/modules/access/server/auth-actions";

export default function ForbiddenPage() {
  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        bgcolor: "background.default"
      }}
    >
      <Stack spacing={3} alignItems="center" textAlign="center" sx={{ maxWidth: 560 }}>
        <LockOutlinedIcon sx={{ fontSize: 64, color: "text.secondary" }} />
        <Typography variant="h2">Acesso negado</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460 }}>
          Voce nao tem permissao para acessar esta pagina. Verifique seu perfil de acesso ou entre
          com outro usuario.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <Button component={Link} href={"/dashboard" as never} variant="contained">
            Ir ao Dashboard
          </Button>
          {/* Logout via server action — clears sis_session and sb-access-token before redirecting */}
          <form action={logoutAction}>
            <Button type="submit" variant="outlined">
              Sair e entrar com outro usuario
            </Button>
          </form>
        </Stack>
      </Stack>
    </Box>
  );
}
