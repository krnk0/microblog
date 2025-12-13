import React from 'react';

/**
 * URL detection and linking
 */
function linkifyText(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0; // Reset regex state
      const cleanUrl = part.replace(/[.,;:!?）)」』】>]+$/, '');
      const trailing = part.slice(cleanUrl.length);

      return (
        <React.Fragment key={index}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline break-all"
          >
            {cleanUrl}
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return part;
  });
}

/**
 * Process inline code (`code`) in text
 * Returns array of React nodes with inline code formatted
 */
function processInlineCode(text: string): React.ReactNode[] {
  const inlineCodeRegex = /`([^`\n]+)`/g;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // Add text before the match (with linkify)
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      result.push(...linkifyText(before));
    }

    // Add the inline code (React JSX auto-escapes, no need for escapeHtml)
    result.push(
      <code
        key={`inline-${match.index}`}
        className="px-1.5 py-0.5 bg-foreground/10 rounded text-sm font-mono"
      >
        {match[1]}
      </code>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text (with linkify)
  if (lastIndex < text.length) {
    result.push(...linkifyText(text.slice(lastIndex)));
  }

  return result;
}

interface CodeBlock {
  type: 'code';
  language: string;
  content: string;
}

interface TextBlock {
  type: 'text';
  content: string;
}

type ContentBlock = CodeBlock | TextBlock;

/**
 * Parse content into code blocks and text blocks
 */
function parseCodeBlocks(content: string): ContentBlock[] {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: ContentBlock[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Add the code block
    blocks.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  return blocks;
}

/**
 * Format content with code blocks, inline code, and links
 * Main export function
 */
export function formatContent(content: string): React.ReactNode[] {
  const blocks = parseCodeBlocks(content);
  const result: React.ReactNode[] = [];

  blocks.forEach((block, index) => {
    if (block.type === 'code') {
      result.push(
        <pre
          key={`block-${index}`}
          className="my-2 p-3 bg-foreground/10 rounded-lg overflow-x-auto"
        >
          <code className={`language-${block.language} text-sm font-mono`}>
            {block.content}
          </code>
        </pre>
      );
    } else {
      // Process text: inline code + links
      const nodes = processInlineCode(block.content);
      result.push(
        <span key={`text-${index}`}>
          {nodes}
        </span>
      );
    }
  });

  return result;
}
