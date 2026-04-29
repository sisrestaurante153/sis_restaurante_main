export type HealthStatus = "ok" | "degraded";
export type DatabaseHealthStatus = "reachable" | "not_configured" | "unreachable";

export interface HealthPayload {
  status: HealthStatus;
  app: {
    name: string;
    environment: string;
  };
  database: {
    status: DatabaseHealthStatus;
  };
  timestamp: string;
}
