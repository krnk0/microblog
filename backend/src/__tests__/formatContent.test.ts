import { describe, it, expect } from 'vitest';
import { render } from 'preact-render-to-string';
import { h, Fragment } from 'preact';

/**
 * Test helpers - recreate the parsing logic from post.tsx
 */

interface ContentSegment {
  type: 'text' | 'code-block' | 'inline-code' | 'link' | 'newline';
  content: string;
  language?: string;
}

function parseTextSegment(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const tokenRegex = /(`[^`\n]+`|https?:\/\/[^\s<>"']+|\n)/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const token = match[0];
    if (token === '\n') {
      segments.push({ type: 'newline', content: '\n' });
    } else if (token.startsWith('`')) {
      segments.push({
        type: 'inline-code',
        content: token.slice(1, -1),
      });
    } else {
      const cleanUrl = token.replace(/[.,;:!?）)」』】>]+$/, '');
      segments.push({
        type: 'link',
        content: cleanUrl,
      });
      const trailing = token.slice(cleanUrl.length);
      if (trailing) {
        segments.push({ type: 'text', content: trailing });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push(...parseTextSegment(content.slice(lastIndex, match.index)));
    }
    segments.push({
      type: 'code-block',
      content: match[2],
      language: match[1] || 'plaintext',
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push(...parseTextSegment(content.slice(lastIndex)));
  }

  return segments;
}

// Render content to HTML string using Preact
function renderContent(content: string): string {
  const segments = parseContent(content);

  const vnode = h(
    Fragment,
    null,
    segments.map((segment, index) => {
      switch (segment.type) {
        case 'code-block':
          return h('pre', { key: index, class: 'code-block' },
            h('code', { class: `language-${segment.language}` }, segment.content)
          );
        case 'inline-code':
          return h('code', { key: index, class: 'inline-code' }, segment.content);
        case 'link':
          return h('a', {
            key: index,
            href: segment.content,
            target: '_blank',
            rel: 'noopener noreferrer',
            class: 'link'
          }, segment.content);
        case 'newline':
          return h('br', { key: index });
        case 'text':
        default:
          return h('span', { key: index }, segment.content);
      }
    })
  );

  return render(vnode);
}

describe('Preact JSX XSS Prevention', () => {
  describe('script injection attacks', () => {
    it('should escape script tags in plain text', () => {
      const content = '<script>alert("xss")</script>';
      const result = renderContent(content);
      // < is escaped to &lt; which prevents browser from parsing as tag
      expect(result).toContain('&lt;script');
      expect(result).not.toMatch(/<script[^&]/); // No unescaped <script
    });

    it('should escape script tags in inline code', () => {
      const content = '`<script>alert("xss")</script>`';
      const result = renderContent(content);
      expect(result).toContain('&lt;script');
      expect(result).not.toMatch(/<script[^&]/);
    });

    it('should escape script tags in code blocks', () => {
      const content = '```html\n<script>alert("xss")</script>\n```';
      const result = renderContent(content);
      expect(result).toContain('&lt;script');
      expect(result).not.toMatch(/<script[^&]/);
    });

    it('should escape img tags to prevent event handlers', () => {
      const content = '<img src=x onerror=alert(1)>';
      const result = renderContent(content);
      // < is escaped, so browser won't parse as img tag
      expect(result).toContain('&lt;img');
      expect(result).not.toMatch(/<img[^&]/);
    });
  });

  describe('attribute injection attacks', () => {
    it('should escape quotes in text', () => {
      const content = '" onclick="alert(1)"';
      const result = renderContent(content);
      expect(result).toContain('&quot;');
    });

    it('should not convert javascript: to links', () => {
      const content = 'javascript:alert(1)';
      const result = renderContent(content);
      expect(result).not.toContain('href="javascript:');
    });
  });

  describe('code block language injection', () => {
    it('should not parse malicious language names as code blocks', () => {
      // The regex only matches \w* for language, so this won't match as a code block
      const content = '```"><script>\ncode\n```';
      const result = renderContent(content);
      // The malicious part is escaped as plain text
      expect(result).toContain('&lt;script');
    });
  });
});

describe('Correct Rendering', () => {
  it('should render inline code', () => {
    const content = 'Use `console.log()` for debugging';
    const result = renderContent(content);
    expect(result).toContain('<code class="inline-code">console.log()</code>');
  });

  it('should render code blocks with language', () => {
    const content = '```javascript\nconst x = 1;\n```';
    const result = renderContent(content);
    expect(result).toContain('<pre class="code-block">');
    expect(result).toContain('class="language-javascript"');
    expect(result).toContain('const x = 1;');
  });

  it('should render code blocks without language', () => {
    const content = '```\nplain text\n```';
    const result = renderContent(content);
    expect(result).toContain('class="language-plaintext"');
  });

  it('should render links', () => {
    const content = 'Check https://example.com for more';
    const result = renderContent(content);
    expect(result).toContain('<a');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('should convert newlines to br', () => {
    const content = 'line1\nline2';
    const result = renderContent(content);
    expect(result).toContain('<br');
  });

  it('should handle mixed content', () => {
    const content = 'Hello `world`!\n```js\nalert(1)\n```\nSee https://example.com';
    const result = renderContent(content);
    expect(result).toContain('<code class="inline-code">world</code>');
    expect(result).toContain('<pre class="code-block">');
    expect(result).toContain('href="https://example.com"');
  });
});
