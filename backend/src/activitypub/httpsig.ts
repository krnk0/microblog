/**
 * HTTP Signature verification for ActivityPub inbox
 * Implements draft-cavage-http-signatures verification
 */

const SIGNATURE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

interface SignatureParams {
  keyId: string;
  algorithm: string;
  headers: string;
  signature: string;
}

interface VerificationResult {
  valid: boolean;
  actorId?: string;
  error?: string;
}

/**
 * Parse the Signature header into components
 * Format: keyId="...",algorithm="...",headers="...",signature="..."
 */
export function parseSignatureHeader(header: string | null): SignatureParams | null {
  if (!header) return null;

  const params: Record<string, string> = {};
  for (const part of header.split(',')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) continue;
    const key = part.slice(0, eqIndex).trim();
    let value = part.slice(eqIndex + 1).trim();
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    params[key] = value;
  }

  if (!params.keyId || !params.signature || !params.headers) {
    return null;
  }

  return {
    keyId: params.keyId,
    algorithm: params.algorithm || 'rsa-sha256',
    headers: params.headers,
    signature: params.signature,
  };
}

/**
 * Convert PEM public key to CryptoKey for verification
 */
async function pemToPublicKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/[\r\n\s]/g, '');

  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'spki',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Fetch an actor and extract their public key
 */
async function fetchActorPublicKey(
  keyId: string
): Promise<{ publicKey: CryptoKey; actorId: string } | null> {
  // keyId is usually like "https://example.com/users/foo#main-key"
  // We need to fetch the actor URL (without the fragment)
  const actorUrl = keyId.split('#')[0];

  try {
    const response = await fetch(actorUrl, {
      headers: {
        Accept: 'application/activity+json, application/ld+json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch actor ${actorUrl}: ${response.status}`);
      return null;
    }

    const actor = (await response.json()) as {
      type?: string;
      id?: string;
      owner?: string;
      publicKeyPem?: string;
      publicKey?: {
        id?: string;
        publicKeyPem?: string;
      };
    };

    // Handle different key formats
    let publicKeyPem: string | undefined;
    let actorId: string | undefined;

    if (actor.type === 'Key') {
      // Key is a separate object
      publicKeyPem = actor.publicKeyPem;
      actorId = actor.owner;
    } else if (actor.publicKey?.publicKeyPem) {
      // Key is embedded in actor
      publicKeyPem = actor.publicKey.publicKeyPem;
      actorId = actor.id;
    }

    if (!publicKeyPem || !actorId) {
      console.error('No public key found in actor');
      return null;
    }

    const publicKey = await pemToPublicKey(publicKeyPem);
    return { publicKey, actorId };
  } catch (error) {
    console.error(`Error fetching actor public key:`, error);
    return null;
  }
}

/**
 * Build the signed string from request headers
 */
function buildSignedString(
  signedHeaders: string,
  method: string,
  path: string,
  headers: Headers
): { signedString: string; date: Date | null } {
  const lines: string[] = [];
  let signatureDate: Date | null = null;

  for (const headerName of signedHeaders.split(' ')) {
    if (headerName === '(request-target)') {
      lines.push(`(request-target): ${method.toLowerCase()} ${path}`);
    } else if (headerName === '(created)' || headerName === '(expires)') {
      // These are signature metadata, not actual headers
      // Skip for now as we primarily use date header
      continue;
    } else {
      const value = headers.get(headerName);
      if (value) {
        lines.push(`${headerName}: ${value}`);
        if (headerName === 'date') {
          signatureDate = new Date(value);
        }
      }
    }
  }

  return {
    signedString: lines.join('\n'),
    date: signatureDate,
  };
}

/**
 * Verify the HTTP signature of an incoming request
 */
export async function verifyHttpSignature(
  request: Request,
  body: string
): Promise<VerificationResult> {
  const signatureHeader = request.headers.get('Signature');
  const sigParams = parseSignatureHeader(signatureHeader);

  if (!sigParams) {
    return { valid: false, error: 'Missing or invalid Signature header' };
  }

  // Check algorithm
  if (!['rsa-sha256', 'hs2019'].includes(sigParams.algorithm)) {
    return { valid: false, error: `Unsupported algorithm: ${sigParams.algorithm}` };
  }

  // Fetch the actor's public key
  const keyResult = await fetchActorPublicKey(sigParams.keyId);
  if (!keyResult) {
    return { valid: false, error: 'Failed to fetch actor public key' };
  }

  const { publicKey, actorId } = keyResult;

  // Build the signed string
  const url = new URL(request.url);
  const { signedString, date } = buildSignedString(
    sigParams.headers,
    request.method,
    url.pathname,
    request.headers
  );

  // Check signature age
  if (date) {
    const age = Date.now() - date.getTime();
    if (age > SIGNATURE_MAX_AGE_MS) {
      return { valid: false, error: 'Signature expired' };
    }
    if (age < -SIGNATURE_MAX_AGE_MS) {
      return { valid: false, error: 'Signature date in future' };
    }
  }

  // Verify digest if present
  if (sigParams.headers.includes('digest')) {
    const digestHeader = request.headers.get('Digest');
    if (digestHeader) {
      const bodyBytes = new TextEncoder().encode(body);
      const hashBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
      const expectedDigest =
        'SHA-256=' + btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

      if (digestHeader !== expectedDigest) {
        return { valid: false, error: 'Digest mismatch' };
      }
    }
  }

  // Verify the signature
  try {
    const signatureBytes = Uint8Array.from(atob(sigParams.signature), (c) =>
      c.charCodeAt(0)
    );
    const signedStringBytes = new TextEncoder().encode(signedString);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBytes,
      signedStringBytes
    );

    if (isValid) {
      return { valid: true, actorId };
    } else {
      return { valid: false, error: 'Signature verification failed' };
    }
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
