import { uuid4 } from "@sentry/core";

const DSN =
  "https://dc994f4b9856875779b68e6b3e354a2b@o4509291383750656.ingest.us.sentry.io/4509291391025152";

interface SentryOptions {
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  };
  level?: "fatal" | "error" | "warning" | "info" | "debug";
}

export async function captureException(
  error: Error,
  options: SentryOptions = {},
) {
  const {
    environment = error.stack?.includes("/Arcs_dev/")
      ? "development"
      : "production",
    release,
    tags,
    user,
    level = "error",
  } = options;

  const match = DSN.match(/^https:\/\/(.+)@(.+)\/(.+)$/);
  if (!match) return;

  const [, publicKey, host, projectId] = match;
  return fetch(`https://${host}/api/${projectId}/store/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=ttpg-fetch/1.0`,
    },
    body: JSON.stringify({
      event_id: uuid4(),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level,
      environment,
      ...(release && { release }),
      ...(tags && { tags }),
      ...(user && { user }),
      exception: {
        values: [
          {
            type: error.name,
            value: error.message,
            stacktrace: {
              frames: parseStackTrace(error.stack),
            },
          },
        ],
      },
    }),
  });
}

function parseStackTrace(stack?: string) {
  if (!stack) return [];

  return stack
    .split("\n")
    .slice(1)
    .map((line) => {
      // Handle various stack trace formats
      const match =
        line.match(
          /^\s*at\s+.*?(.+?)\s+\(.*?\/Packages\/(.+?):(\d+):(\d+)\)$/,
        ) || line.match(/^\s*at\s+.*?\/Packages\/(.+?):(\d+):(\d+)$/);

      if (!match) return null;

      if (match.length === 5) {
        const [, fn, filename, lineno, colno] = match;
        return {
          function: fn,
          filename,
          lineno: +lineno,
          colno: +colno,
          in_app: !filename.includes("node_modules"),
        };
      } else {
        const [, filename, lineno, colno] = match;
        return {
          filename,
          lineno: +lineno,
          colno: +colno,
          in_app: !filename.includes("node_modules"),
        };
      }
    })
    .filter(Boolean)
    .reverse(); // Sentry expects frames in reverse order
}
