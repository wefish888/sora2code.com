import { useState, useEffect } from 'react';

type Locale = 'en' | 'zh';

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.guide': 'Guide',
    'nav.about': 'About',
    'nav.faq': 'FAQ',
    'home.title': 'Sora Invite Codes',
    'home.subtitle': 'Get Sora Access Now',
    'home.description': "Real-time updated Sora invite codes from Reddit & Twitter. Access OpenAI's video generation platform instantly.",
    'home.liveUpdates': 'Live Updates • Real-time Collection',
    'home.browseCodes': 'Browse Codes',
    'home.howToUse': 'How to Use',
    'codes.latestCodes': 'Latest Invite Codes',
    'codes.loading': 'Loading...',
    'codes.noCodesFound': 'No codes found',
    'codes.searchPlaceholder': 'Search invite codes...',
    'codes.copyCode': 'Copy Full Code',
    'codes.copied': 'Copied!',
    'codes.copying': 'Copying...',
    'stats.activeCodes': 'Active Codes',
    'stats.totalCopies': 'Total Copies',
    'stats.autoMonitoring': 'Auto Monitoring'
  },
  zh: {
    'nav.home': '首页',
    'nav.blog': '博客',
    'nav.guide': '指南',
    'nav.about': '关于',
    'nav.faq': '常见问题',
    'home.title': 'Sora 邀请码',
    'home.subtitle': '立即获取 Sora 访问权限',
    'home.description': '实时从 Reddit 和 Twitter 更新 Sora 邀请码。立即访问 OpenAI 的视频生成平台。',
    'home.liveUpdates': '实时更新 • 即时收集',
    'home.browseCodes': '浏览邀请码',
    'home.howToUse': '使用方法',
    'codes.latestCodes': '最新邀请码',
    'codes.loading': '加载中...',
    'codes.noCodesFound': '未找到邀请码',
    'codes.searchPlaceholder': '搜索邀请码...',
    'codes.copyCode': '复制完整代码',
    'codes.copied': '已复制！',
    'codes.copying': '复制中...',
    'stats.activeCodes': '活跃代码',
    'stats.totalCopies': '总复制次数',
    'stats.autoMonitoring': '自动监控'
  }
};

export function useI18n() {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // Detect locale from URL
    const path = window.location.pathname;
    const detectedLocale = path.startsWith('/zh') ? 'zh' : 'en';
    setLocale(detectedLocale);
  }, []);

  const t = (key: string): string => {
    return translations[locale][key as keyof typeof translations['en']] || key;
  };

  return { t, locale };
}
