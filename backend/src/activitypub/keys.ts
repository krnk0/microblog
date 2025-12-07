/**
 * RSA key utilities for ActivityPub
 * Converts JWK format (stored in D1) to PEM format (used in Actor publicKey)
 */

export async function jwkToPem(jwk: JsonWebKey): Promise<string> {
  // Import JWK as CryptoKey
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['verify']
  );

  // Export as SPKI format
  const spki = (await crypto.subtle.exportKey('spki', key)) as ArrayBuffer;

  // Convert to base64
  const base64 = btoa(String.fromCharCode(...new Uint8Array(spki)));

  // Format as PEM (64 characters per line)
  const lines = base64.match(/.{1,64}/g) || [base64];

  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

export interface AccountKey {
  id: number;
  user_id: string;
  rsa_public_key: string;
  rsa_private_key: string;
  created_at: string;
}

/**
 * Generate a new RSA key pair and store in D1
 */
export async function generateAndStoreKeyPair(
  db: D1Database,
  userId: string
): Promise<void> {
  // Generate RSA key pair
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;

  // Export as JWK
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  // Store in D1
  await db
    .prepare(
      `INSERT INTO account_keys (user_id, rsa_public_key, rsa_private_key, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(
      userId,
      JSON.stringify(publicJwk),
      JSON.stringify(privateJwk),
      new Date().toISOString()
    )
    .run();
}

/**
 * Get the public key PEM for a user
 */
export async function getPublicKeyPem(db: D1Database, userId: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT rsa_public_key FROM account_keys WHERE user_id = ?')
    .bind(userId)
    .first<{ rsa_public_key: string }>();

  if (!row) {
    return null;
  }

  const jwk = JSON.parse(row.rsa_public_key);
  return jwkToPem(jwk);
}

/**
 * Get the private key as CryptoKey for signing
 */
export async function getPrivateKey(db: D1Database, userId: string): Promise<CryptoKey | null> {
  const row = await db
    .prepare('SELECT rsa_private_key FROM account_keys WHERE user_id = ?')
    .bind(userId)
    .first<{ rsa_private_key: string }>();

  if (!row) {
    return null;
  }

  const jwk = JSON.parse(row.rsa_private_key);
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

/**
 * Sign an HTTP request for ActivityPub delivery
 * Implements draft-cavage-http-signatures
 */
export async function signRequest(
  targetUrl: string,
  body: string,
  privateKey: CryptoKey,
  keyId: string
): Promise<Headers> {
  const url = new URL(targetUrl);
  const headers = new Headers();

  // 1. Set required headers
  headers.set('Host', url.host);
  headers.set('Date', new Date().toUTCString());
  headers.set('Content-Type', 'application/activity+json');

  // 2. Calculate body digest
  const bodyBytes = new TextEncoder().encode(body);
  const digestBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
  const digestBase64 = arrayBufferToBase64(digestBuffer);
  headers.set('Digest', `SHA-256=${digestBase64}`);

  // 3. Build signature string
  const signedHeaders = ['(request-target)', 'host', 'date', 'digest'];
  const signatureString = [
    `(request-target): post ${url.pathname}`,
    `host: ${url.host}`,
    `date: ${headers.get('Date')}`,
    `digest: ${headers.get('Digest')}`,
  ].join('\n');

  // 4. Sign
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureString)
  );
  const signatureBase64 = arrayBufferToBase64(signatureBuffer);

  // 5. Build Signature header
  const signatureHeader = [
    `keyId="${keyId}"`,
    `algorithm="rsa-sha256"`,
    `headers="${signedHeaders.join(' ')}"`,
    `signature="${signatureBase64}"`,
  ].join(',');
  headers.set('Signature', signatureHeader);

  return headers;
}
