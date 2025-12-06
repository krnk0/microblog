import { describe, it, expect } from 'vitest';
import { escapeXml } from '../lib/xml';

describe('escapeXml', () => {
  it('should escape ampersands', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less-than', () => {
    expect(escapeXml('5 < 10')).toBe('5 &lt; 10');
  });

  it('should escape greater-than', () => {
    expect(escapeXml('10 > 5')).toBe('10 &gt; 5');
  });

  it('should escape double quotes', () => {
    expect(escapeXml('He said "Hello"')).toBe('He said &quot;Hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeXml("It's fine")).toBe('It&apos;s fine');
  });

  it('should escape multiple special characters', () => {
    expect(escapeXml('<script>alert("XSS & more")</script>'))
      .toBe('&lt;script&gt;alert(&quot;XSS &amp; more&quot;)&lt;/script&gt;');
  });

  it('should not modify plain text', () => {
    expect(escapeXml('Hello World')).toBe('Hello World');
  });

  it('should handle empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should prevent XSS in RSS feed', () => {
    const malicious = '<img src=x onerror="alert(\'XSS\')">';
    const escaped = escapeXml(malicious);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toBe('&lt;img src=x onerror=&quot;alert(&apos;XSS&apos;)&quot;&gt;');
  });
});
