const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function parseBooleanEnv(value: string | undefined) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function getConfiguredAppUrl() {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    null
  );
}

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

export function shouldUseSecureCookies(request?: Request) {
  const forcedSecure = parseBooleanEnv(process.env.COOKIE_SECURE);

  if (forcedSecure !== null) {
    return forcedSecure;
  }

  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  if (request?.url) {
    const requestUrl = new URL(request.url);

    if (requestUrl.protocol === "https:") {
      return true;
    }

    if (isLocalHostname(requestUrl.hostname)) {
      return false;
    }
  }

  const appUrl = getConfiguredAppUrl();

  if (appUrl) {
    try {
      const url = new URL(appUrl);

      if (url.protocol === "https:") {
        return true;
      }

      if (isLocalHostname(url.hostname)) {
        return false;
      }
    } catch {
      return process.env.NODE_ENV === "production";
    }
  }

  return process.env.NODE_ENV === "production";
}
