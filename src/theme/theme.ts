import type {} from "@mui/x-data-grid/themeAugmentation";
import { alpha, createTheme } from "@mui/material/styles";

interface CustomPaletteScale {
  ficha: string;
  item: string;
  custo: string;
  pendencia: string;
  auditoria: string;
}

declare module "@mui/material/styles" {
  interface Palette {
    custom: CustomPaletteScale;
  }

  interface PaletteOptions {
    custom?: CustomPaletteScale;
  }
}

const customPalette: CustomPaletteScale = {
  ficha: "#3F51B5",
  item: "#1976D2",
  custo: "#16A34A",
  pendencia: "#D97706",
  auditoria: "#7C3AED"
};

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976D2",
      light: "#42A5F5",
      dark: "#1565C0",
      contrastText: "#FFFFFF"
    },
    secondary: {
      main: "#3F51B5",
      light: "#7986CB",
      dark: "#303F9F",
      contrastText: "#FFFFFF"
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF"
    },
    text: {
      primary: "#1A1A2E",
      secondary: "#64748B",
      disabled: "#94A3B8"
    },
    divider: "#E2E8F0",
    success: {
      main: "#16A34A",
      light: "#DCFCE7",
      dark: "#15803D"
    },
    warning: {
      main: "#D97706",
      light: "#FEF3C7",
      dark: "#B45309"
    },
    error: {
      main: "#DC2626",
      light: "#FEE2E2",
      dark: "#B91C1C"
    },
    info: {
      main: "#0284C7",
      light: "#E0F2FE",
      dark: "#0369A1"
    },
    custom: customPalette
  },
  shape: {
    borderRadius: 10
  },
  spacing: 8,
  typography: {
    fontFamily: 'var(--font-plus-jakarta-sans), "Segoe UI", sans-serif',
    h1: {
      fontSize: "1.75rem",
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: "-0.01em"
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 700,
      lineHeight: 1.35
    },
    h3: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.4
    },
    h4: {
      fontSize: "1.1rem",
      fontWeight: 600,
      lineHeight: 1.4
    },
    subtitle1: {
      fontSize: "0.95rem",
      fontWeight: 500,
      color: "#64748B"
    },
    subtitle2: {
      fontSize: "0.85rem",
      fontWeight: 500,
      color: "#64748B",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    },
    body1: {
      fontSize: "0.9rem",
      fontWeight: 400,
      lineHeight: 1.6
    },
    body2: {
      fontSize: "0.8rem",
      fontWeight: 400,
      lineHeight: 1.5
    },
    caption: {
      fontSize: "0.75rem",
      fontWeight: 400,
      color: "#94A3B8"
    },
    overline: {
      fontSize: "0.7rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em"
    },
    button: {
      textTransform: "none",
      fontWeight: 600
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "light"
        },
        html: {
          scrollBehavior: "smooth"
        },
        body: {
          minHeight: "100vh",
          backgroundColor: "#F8F9FA",
          color: "#1A1A2E",
          textRendering: "optimizeLegibility"
        },
        a: {
          color: "inherit",
          textDecoration: "none"
        },
        "::selection": {
          backgroundColor: alpha("#42A5F5", 0.22)
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #E2E8F0",
          boxShadow: "none",
          borderRadius: 12,
          backgroundImage: "none",
          "&:hover": {
            borderColor: "#CBD5E1"
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          border: "1px solid #E2E8F0",
          backgroundImage: "none"
        },
        elevation1: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
          padding: "8px 20px"
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none"
          }
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined"
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#F1F5F9",
          "& .MuiTableCell-head": {
            fontWeight: 600,
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#64748B"
          }
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderColor: "#E2E8F0"
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none"
        }
      }
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          borderColor: "#E2E8F0",
          borderRadius: 12,
          backgroundColor: "#FFFFFF"
        },
        columnHeaders: {
          backgroundColor: "#F1F5F9",
          borderBottomColor: "#E2E8F0"
        },
        columnHeaderTitle: {
          fontWeight: 600,
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em"
        }
      }
    }
  }
});
