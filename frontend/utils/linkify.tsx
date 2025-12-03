import React from 'react';

/**
 * テキスト内のURLを検出してリンクに変換する
 */
export function linkifyContent(content: string): React.ReactNode[] {
  // URL検出の正規表現（http/https）
  const urlRegex = /(https?:\/\/[^\s<>\"\']+)/g;

  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // URLの末尾の句読点を除去（よくあるケース）
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
