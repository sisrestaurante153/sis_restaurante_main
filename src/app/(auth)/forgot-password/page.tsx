import { ForgotPasswordForm } from "@/modules/access/ui/forgot-password-form";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grow from "@mui/material/Grow";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function ForgotPasswordPage() {
  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2
      }}
    >
      <Grow in timeout={180}>
        <Card sx={{ width: "100%", maxWidth: 420, borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3}>
              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <FiberManualRecordRoundedIcon sx={{ color: "success.main", fontSize: 14 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    SIS Restaurante
                  </Typography>
                </Stack>
                <Box>
                  <Typography variant="h2">Recuperar senha</Typography>
                </Box>
              </Stack>
              <Box>
                <ForgotPasswordForm />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grow>
    </Box>
  );
}
