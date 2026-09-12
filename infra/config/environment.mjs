// Infrastructure preflight only (SEC-04, OPS-02). No SDK, I/O, secret values in output.
export function validateBackendEnvironment(env) {
  const issues = [];
  const services = {};
  const value = (key) => typeof env[key] === "string" ? env[key] : "";
  const issue = (variable, message) => issues.push({ variable, message });
  const required = (key) => {
    if (!value(key).trim()) issue(key, "required when this service is selected");
  };
  const flag = (key) => {
    const raw = value(key);
    if (raw && raw !== "true" && raw !== "false") issue(key, "must be true or false");
    return raw === "true";
  };
  const integer = (key, min, max) => {
    const raw = value(key);
    if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max) {
      issue(key, `must be an integer between ${min} and ${max}`);
    }
  };
  const validLabels = (raw) => raw.length <= 253 && raw.split(".").every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  const host = (key) => {
    if (!validLabels(value(key))) {
      issue(key, "must be a hostname without credentials, protocol or port");
    }
  };
  const httpsUrl = (key, raw = value(key)) => {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
        throw new Error();
      }
      return url;
    } catch {
      issue(key, "must be an HTTPS URL without credentials, query or fragment");
      return null;
    }
  };

  if (value("NODE_TLS_REJECT_UNAUTHORIZED") === "0") {
    issue("NODE_TLS_REJECT_UNAUTHORIZED", "TLS verification must stay enabled");
  }
  httpsUrl("API_PUBLIC_URL");
  const origins = value("APP_ORIGINS").split(",").map((origin) => origin.trim());
  for (const origin of origins) {
    const url = httpsUrl("APP_ORIGINS", origin);
    if (url && url.pathname !== "/") issue("APP_ORIGINS", "origins must not contain a path");
  }

  services.postgres = flag("POSTGRES_ENABLED");
  if (!services.postgres) issue("POSTGRES_ENABLED", "must be true: PostgreSQL is required by this backend profile");
  if (services.postgres) {
    host("PGHOST");
    integer("PGPORT", 1, 65535);
    for (const key of ["PGDATABASE", "PGUSER", "PGPASSWORD"]) required(key);
    if (value("PGSSLMODE") !== "verify-full") issue("PGSSLMODE", "must be verify-full for the remote database");
  }

  services.mongodb = flag("MONGODB_ENABLED");
  if (services.mongodb) {
    host("MONGODB_HOST");
    integer("MONGODB_PORT", 1, 65535);
    for (const key of ["MONGODB_DATABASE", "MONGODB_USERNAME", "MONGODB_PASSWORD", "MONGODB_AUTH_SOURCE"]) required(key);
    if (value("MONGODB_TLS") !== "true") issue("MONGODB_TLS", "must be true");
    for (const key of ["MONGODB_TLS_ALLOW_INVALID_CERTIFICATES", "MONGODB_TLS_ALLOW_INVALID_HOSTNAMES"]) {
      if (value(key) && value(key) !== "false") issue(key, "must be false or unset");
    }
  }

  services.s3 = flag("S3_ENABLED");
  if (services.s3) {
    flag("S3_FORCE_PATH_STYLE");
    const endpoint = httpsUrl("S3_ENDPOINT_URL");
    if (endpoint && endpoint.pathname !== "/") issue("S3_ENDPOINT_URL", "must be a regional service endpoint without a path");
    for (const key of ["S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) required(key);
    const bucket = value("S3_BUCKET");
    if (bucket.length < 3 || bucket.length > 63 || !/^[a-z0-9.-]+$/.test(bucket) || !validLabels(bucket) || /^\d+\.\d+\.\d+\.\d+$/.test(bucket)) {
      issue("S3_BUCKET", "must be a 3-63 character lowercase bucket name with valid DNS labels, not an IP address");
    }
    if (endpoint && bucket && endpoint.hostname.startsWith(`${bucket}.`)) {
      issue("S3_ENDPOINT_URL", "use the service endpoint; S3_BUCKET already supplies the bucket name");
    }
    integer("S3_SIGNED_URL_TTL_SECONDS", 1, 900);
  }

  services.kyc = flag("KYC_ENABLED");
  if (services.kyc) {
    if (value("KYC_PROVIDER") !== "didit") issue("KYC_PROVIDER", "this preparation only describes the Didit candidate");
    httpsUrl("DIDIT_API_BASE_URL");
    httpsUrl("DIDIT_WEBHOOK_URL");
    for (const key of ["DIDIT_API_KEY", "DIDIT_WORKFLOW_ID", "DIDIT_WEBHOOK_SECRET"]) required(key);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value("DIDIT_WORKFLOW_ID"))) {
      issue("DIDIT_WORKFLOW_ID", "must be a published workflow UUID");
    }
  }

  services.mail = flag("MAIL_ENABLED");
  if (services.mail) {
    httpsUrl("MAIL_API_BASE_URL");
    for (const key of ["MAIL_API_TOKEN", "MAIL_API_AUTH_HEADER", "MAIL_API_SEND_PATH"]) required(key);
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(value("MAIL_API_AUTH_HEADER"))) {
      issue("MAIL_API_AUTH_HEADER", "must be the header name from the verified API contract");
    }
    if (!/^\/(?!\/)[^\s?#\\]*$/.test(value("MAIL_API_SEND_PATH"))) {
      issue("MAIL_API_SEND_PATH", "must be a relative endpoint path from the verified API contract");
    }
  }

  return { valid: issues.length === 0, services, issues };
}
