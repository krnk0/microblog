import { describe, it, expect } from 'vitest';
import { parseSignatureHeader, verifyHttpSignature } from '../activitypub/httpsig';
import { signRequest } from '../activitypub/keys';

describe('parseSignatureHeader', () => {
  it('should parse valid signature header', () => {
    const header =
      'keyId="https://example.com/actor#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="abc123=="';

    const result = parseSignatureHeader(header);

    expect(result).not.toBeNull();
    expect(result?.keyId).toBe('https://example.com/actor#main-key');
    expect(result?.algorithm).toBe('rsa-sha256');
    expect(result?.headers).toBe('(request-target) host date digest');
    expect(result?.signature).toBe('abc123==');
  });

  it('should return null for empty header', () => {
    expect(parseSignatureHeader(null)).toBeNull();
    expect(parseSignatureHeader('')).toBeNull();
  });

  it('should return null for header missing required fields', () => {
    const header = 'keyId="https://example.com/actor#main-key"';
    expect(parseSignatureHeader(header)).toBeNull();
  });

  it('should default algorithm to rsa-sha256', () => {
    const header =
      'keyId="https://example.com/actor#main-key",headers="date",signature="abc=="';

    const result = parseSignatureHeader(header);
    expect(result?.algorithm).toBe('rsa-sha256');
  });
});

describe('HTTP Signature round-trip', () => {
  it('should sign and verify a request', async () => {
    // Generate a key pair for testing
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );

    const targetUrl = 'https://example.com/inbox';
    const body = JSON.stringify({ type: 'Follow', actor: 'https://test.com/user' });
    const keyId = 'https://test.com/actor#main-key';

    // Sign the request
    const signedHeaders = await signRequest(
      targetUrl,
      body,
      keyPair.privateKey,
      keyId
    );

    // Verify the signature was created
    const signatureHeader = signedHeaders.get('Signature');
    expect(signatureHeader).not.toBeNull();
    expect(signatureHeader).toContain('keyId=');
    expect(signatureHeader).toContain('algorithm=');
    expect(signatureHeader).toContain('headers=');
    expect(signatureHeader).toContain('signature=');

    // Parse the signature
    const sigParams = parseSignatureHeader(signatureHeader);
    expect(sigParams).not.toBeNull();
    expect(sigParams?.keyId).toBe(keyId);
    expect(sigParams?.algorithm).toBe('rsa-sha256');

    // Verify the signature manually (since we have the public key)
    const url = new URL(targetUrl);
    const signedString = [
      `(request-target): post ${url.pathname}`,
      `host: ${signedHeaders.get('Host')}`,
      `date: ${signedHeaders.get('Date')}`,
      `digest: ${signedHeaders.get('Digest')}`,
    ].join('\n');

    const signatureBytes = Uint8Array.from(atob(sigParams!.signature), (c) =>
      c.charCodeAt(0)
    );
    const signedStringBytes = new TextEncoder().encode(signedString);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      keyPair.publicKey,
      signatureBytes,
      signedStringBytes
    );

    expect(isValid).toBe(true);
  });
});

describe('verifyHttpSignature', () => {
  it('should reject request without Signature header', async () => {
    const request = new Request('https://example.com/inbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/activity+json',
      },
    });

    const result = await verifyHttpSignature(request, '{}');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Missing or invalid Signature header');
  });

  it('should reject request with unsupported algorithm', async () => {
    const request = new Request('https://example.com/inbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/activity+json',
        Signature:
          'keyId="https://example.com/actor#main-key",algorithm="ed25519",headers="date",signature="abc=="',
      },
    });

    const result = await verifyHttpSignature(request, '{}');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported algorithm');
  });
});
