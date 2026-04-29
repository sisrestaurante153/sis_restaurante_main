"use client";

import type { ButtonProps } from "@mui/material/Button";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useFormStatus } from "react-dom";

export function FormSubmitButton(props: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      startIcon={
        pending ? <CircularProgress color="inherit" size={16} thickness={5} /> : props.startIcon
      }
    >
      {props.children}
    </Button>
  );
}
