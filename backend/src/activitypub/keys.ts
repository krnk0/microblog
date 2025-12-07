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
