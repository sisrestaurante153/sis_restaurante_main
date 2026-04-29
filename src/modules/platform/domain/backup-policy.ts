const DEFAULT_BACKUP_RETENTION_DAYS = 7;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function buildBackupFilename(now = new Date()) {
  return (
    "sis-restaurante-" +
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z.dump`
  );
}

export function parseBackupRetentionDays(value: string | undefined) {
  if (!value || value.trim().length === 0) {
    return DEFAULT_BACKUP_RETENTION_DAYS;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("BACKUP_RETENTION_DAYS deve ser maior que zero.");
  }

  return parsed;
}
