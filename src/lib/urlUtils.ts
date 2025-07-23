/**
 * 文字列がURLかどうかを判定する
 */
export const isUrl = (text: string): boolean => {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * URLを安全に開くためのターゲット設定
 */
export const getUrlTarget = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const currentDomain = window.location.hostname;
    
    // 同じドメインの場合は同じタブで開く
    if (urlObj.hostname === currentDomain) {
      return '_self';
    }
    
    // 外部ドメインの場合は新しいタブで開く
    return '_blank';
  } catch {
    return '_blank';
  }
};
