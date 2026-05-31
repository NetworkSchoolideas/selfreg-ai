/**
 * GigaChat Token Manager
 * 
 * Handles OAuth flow for GigaChat API:
 * 1. User provides Authorization Key (Client ID:Client Secret base64)
 * 2. We get Access Token via /oauth endpoint
 * 3. Token cached for 25 minutes (GigaChat tokens expire after 30 min)
 */

const TOKEN_CACHE_KEY = 'gigachat_access_token';
const TOKEN_CACHE_EXPIRY = 25 * 60 * 1000; // 25 minutes in ms

interface CachedToken {
  token: string;
  expiry: number;
}

/**
 * Get cached token if valid, otherwise fetch new one
 */
export async function getGigaChatAccessToken(authorizationKey: string): Promise<string> {
  // Check cache first
  const cached = getCachedToken();
  if (cached && cached.expiry > Date.now()) {
    console.log('[GigaChat] Using cached access token');
    return cached.token;
  }

  // Fetch new token
  console.log('[GigaChat] Fetching new access token...');
  const newToken = await fetchAccessToken(authorizationKey);
  
  // Cache it
  cacheToken(newToken);
  
  return newToken;
}

/**
 * Fetch fresh access token from GigaChat OAuth endpoint
 */
async function fetchAccessToken(authorizationKey: string): Promise<string> {
  const AUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
  
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authorizationKey}`,
      'RqUID': crypto.randomUUID(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: 'scope=GIGACHAT_API_PERS'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GigaChat OAuth failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error('GigaChat OAuth response missing access_token');
  }

  console.log('[GigaChat] Access token obtained successfully');
  return data.access_token;
}

/**
 * Get token from localStorage cache
 */
function getCachedToken(): CachedToken | null {
  try {
    const cached = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!cached) return null;
    
    return JSON.parse(cached) as CachedToken;
  } catch (err) {
    console.warn('[GigaChat] Failed to read cached token:', err);
    return null;
  }
}

/**
 * Cache token to localStorage with expiry
 */
function cacheToken(token: string): void {
  try {
    const cache: CachedToken = {
      token,
      expiry: Date.now() + TOKEN_CACHE_EXPIRY
    };
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
    console.log('[GigaChat] Token cached for 25 minutes');
  } catch (err) {
    console.warn('[GigaChat] Failed to cache token:', err);
  }
}

/**
 * Clear cached token (useful for logout or key change)
 */
export function clearGigaChatToken(): void {
  localStorage.removeItem(TOKEN_CACHE_KEY);
  console.log('[GigaChat] Cached token cleared');
}

/**
 * Validate GigaChat Authorization Key format
 */
export function validateGigaChatKey(key: string): boolean {
  // Basic validation: should be base64 encoded string
  try {
    // Try to decode base64
    const decoded = atob(key.trim());
    // Should contain exactly one colon (ClientID:ClientSecret)
    const parts = decoded.split(':');
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  } catch {
    return false;
  }
}
