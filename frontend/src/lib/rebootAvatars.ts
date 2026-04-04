const GQL_URL = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";
const STORAGE_URL = "https://learn.reboot01.com/api/storage";
const AVATAR_CACHE_KEY = "taskflow.reboot.avatarCache";

let cachedToken = "";
let cachedEventIds: number[] | null = null;
let cachedEventIdsPromise: Promise<number[]> | null = null;
const avatarCache = new Map<string, string>();
const inflightAvatarRequests = new Map<string, Promise<Record<string, string>>>();

function parseAttrs(attrs: any): any {
  if (!attrs) return null;
  if (typeof attrs === "string") {
    try {
      return JSON.parse(attrs);
    } catch {
      return null;
    }
  }
  return attrs;
}

function normalizeLogin(login: string) {
  return String(login || "").trim().toLowerCase();
}

function hydrateCache(token: string) {
  if (cachedToken === token) return;
  cachedToken = token;
  cachedEventIds = null;
  cachedEventIdsPromise = null;
  avatarCache.clear();
  inflightAvatarRequests.clear();

  try {
    const raw = sessionStorage.getItem(AVATAR_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { token?: string; avatars?: Record<string, string> };
    if (parsed?.token !== token || !parsed?.avatars || typeof parsed.avatars !== "object") return;
    Object.entries(parsed.avatars).forEach(([login, url]) => {
      if (typeof url === "string" && url) {
        avatarCache.set(normalizeLogin(login), url);
      }
    });
  } catch {
    // Ignore cache hydration issues.
  }
}

function persistCache() {
  try {
    sessionStorage.setItem(
      AVATAR_CACHE_KEY,
      JSON.stringify({
        token: cachedToken,
        avatars: Object.fromEntries(avatarCache.entries()),
      })
    );
  } catch {
    // Ignore storage issues.
  }
}

export function getCachedRebootAvatar(login: string): string {
  const token = (localStorage.getItem("jwt") || "").trim();
  if (!token) return "";
  hydrateCache(token);
  return avatarCache.get(normalizeLogin(login)) || "";
}

export function findAvatarInAttrs(attrs: any): string {
  const parsed = parseAttrs(attrs);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";
  return String(parsed["pro-picUploadId"] || "").trim();
}

async function fetchCohortEventIds(token: string): Promise<number[]> {
  if (cachedEventIds && cachedToken === token) {
    return cachedEventIds;
  }
  if (cachedEventIdsPromise && cachedToken === token) {
    return cachedEventIdsPromise;
  }

  const query = `
    query cohorts {
      event(order_by: {createdAt: asc}, where: {object: {name: {_eq: "Module"}}}) {
        id
      }
    }
  `;

  cachedEventIdsPromise = (async () => {
    const res = await fetch(GQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: {} }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || json?.errors?.length) {
      throw new Error(json?.errors?.[0]?.message || "Failed to load cohort events.");
    }

    const ids = (json?.data?.event || [])
      .map((row: any) => Number(row?.id))
      .filter((value: number) => Number.isFinite(value));
    cachedEventIds = ids;
    return ids;
  })();

  try {
    return await cachedEventIdsPromise;
  } finally {
    cachedEventIdsPromise = null;
  }
}

export async function fetchRebootAvatars(logins: string[]): Promise<Record<string, string>> {
  const token = (localStorage.getItem("jwt") || "").trim();
  if (!token || logins.length === 0) return {};
  hydrateCache(token);

  const uniqueLogins = Array.from(new Set(logins.map((login) => normalizeLogin(login)).filter(Boolean)));
  if (uniqueLogins.length === 0) return {};
  const cachedResults: Record<string, string> = {};
  const missingLogins = uniqueLogins.filter((login) => {
    const cached = avatarCache.get(login);
    if (cached) {
      cachedResults[login] = cached;
      return false;
    }
    return true;
  });

  if (missingLogins.length === 0) {
    return cachedResults;
  }

  const requestKey = missingLogins.slice().sort().join("|");
  if (inflightAvatarRequests.has(requestKey)) {
    const pending = await inflightAvatarRequests.get(requestKey)!;
    return { ...cachedResults, ...pending };
  }

  const eventIds = await fetchCohortEventIds(token);
  if (eventIds.length === 0) return cachedResults;

  const query = `
    query student_avatars($eventIds: [Int!]!, $logins: [String!]!) {
      event_user(
        distinct_on: userId
        order_by: [{ userId: asc }, { level: desc }]
        where: {
          eventId: { _in: $eventIds }
          user: {
            login: { _in: $logins }
            _not: {
              records: {
                _and: [
                  { typeName: { _in: ["blocked-long", "expelled"] } }
                  { endAt: { _is_null: true } }
                ]
              }
            }
          }
        }
      ) {
        user {
          login
          email
          attrs
        }
      }
    }
  `;

  const request = (async () => {
    const res = await fetch(GQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { eventIds, logins: missingLogins },
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || json?.errors?.length) {
      throw new Error(json?.errors?.[0]?.message || "Failed to load Reboot avatars.");
    }

    const map: Record<string, string> = {};
    for (const row of json?.data?.event_user || []) {
      const login = normalizeLogin(row?.user?.login || "");
      const fileId = findAvatarInAttrs(row?.user?.attrs);
      if (login && fileId) {
        map[login] = `${STORAGE_URL}?token=${encodeURIComponent(token)}&fileId=${encodeURIComponent(fileId)}`;
      }
    }

    Object.entries(map).forEach(([login, url]) => {
      avatarCache.set(login, url);
    });
    persistCache();
    return map;
  })();

  inflightAvatarRequests.set(requestKey, request);

  try {
    const fetchedResults = await request;
    return { ...cachedResults, ...fetchedResults };
  } finally {
    inflightAvatarRequests.delete(requestKey);
  }
}

export async function fetchRebootAvatar(login: string): Promise<string> {
  const cleanLogin = normalizeLogin(login);
  if (!cleanLogin) return "";
  const cached = getCachedRebootAvatar(cleanLogin);
  if (cached) return cached;
  const avatars = await fetchRebootAvatars([cleanLogin]);
  return avatars[cleanLogin] || "";
}
