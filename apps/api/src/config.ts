const REQUIRED_API_ENVIRONMENT = [
  'DATABASE_URL',
  'REDIS_URL',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'SECRETS_ENCRYPTION_KEY',
  'WEB_ORIGIN',
  'WORKER_VERSION',
  'METADATA_RETENTION_DAYS',
  'PRODUCTION_MAX_REQUESTS_PER_MINUTE',
  'PRODUCTION_MAX_CONCURRENCY',
] as const;

const POSITIVE_NUMERIC_ENVIRONMENT = [
  'PORT',
  'METADATA_RETENTION_DAYS',
  'PRODUCTION_MAX_REQUESTS_PER_MINUTE',
  'PRODUCTION_MAX_CONCURRENCY',
] as const;

export function validateApiEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): void {
  for (const name of REQUIRED_API_ENVIRONMENT) {
    if (environment[name] === undefined || environment[name]?.trim() === '') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
  for (const name of POSITIVE_NUMERIC_ENVIRONMENT) {
    const rawValue = environment[name];
    if (
      rawValue !== undefined &&
      (!Number.isFinite(Number(rawValue)) || Number(rawValue) <= 0)
    ) {
      throw new Error(`${name} must be a positive number`);
    }
  }
  const key = Buffer.from(environment.SECRETS_ENCRYPTION_KEY ?? '', 'base64');
  if (key.length !== 32) {
    throw new Error('SECRETS_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
}
