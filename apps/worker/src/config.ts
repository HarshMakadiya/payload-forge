const REQUIRED_WORKER_ENVIRONMENT = [
  'DATABASE_URL',
  'REDIS_URL',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'SECRETS_ENCRYPTION_KEY',
  'WORKER_RUN_CONCURRENCY',
  'MAX_CAPTURED_BODY_BYTES',
  'CAPTURE_BODIES',
  'WORKER_VERSION',
] as const;

const POSITIVE_NUMERIC_ENVIRONMENT = [
  'WORKER_RUN_CONCURRENCY',
  'MAX_CAPTURED_BODY_BYTES',
] as const;

export function validateWorkerEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): void {
  for (const name of REQUIRED_WORKER_ENVIRONMENT) {
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
