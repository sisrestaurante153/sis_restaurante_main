"use client";

import { useEffect, useState } from "react";
import Alert, { type AlertColor } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

interface PageFeedbackSnackbarProps {
  message?: string | null;
  severity?: AlertColor;
}

export function PageFeedbackSnackbar({
  message,
  severity = "success"
}: PageFeedbackSnackbarProps) {
  const [open, setOpen] = useState(Boolean(message));

  useEffect(() => {
    setOpen(Boolean(message));
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={4500}
      onClose={(_event, reason) => {
        if (reason !== "clickaway") {
          setOpen(false);
        }
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert onClose={() => setOpen(false)} severity={severity} variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
