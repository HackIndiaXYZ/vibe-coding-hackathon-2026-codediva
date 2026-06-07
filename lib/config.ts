const REQUIRED_ENV_VARS = ["GOOGLE_API_KEY", "MONGODB_URI", "DB_NAME"] as const;

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );

    return false;
  }

  return true;
}
