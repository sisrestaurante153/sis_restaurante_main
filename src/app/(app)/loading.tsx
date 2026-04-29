import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function AppLoading() {
  return (
    <Stack spacing={4}>
      <Stack spacing={1.5}>
        <Skeleton variant="text" width={180} height={24} />
        <Skeleton variant="text" width={320} height={48} />
        <Skeleton variant="text" width="60%" height={28} />
      </Stack>

      <Grid container spacing={3}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Grid key={index} size={{ xs: 12, md: 4 }}>
            <Stack
              spacing={2}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider"
              }}
            >
              <Skeleton variant="rounded" width={96} height={28} />
              <Skeleton variant="text" width="70%" height={36} />
              <Skeleton variant="text" width="45%" height={22} />
              <Skeleton variant="rounded" width="100%" height={180} />
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
