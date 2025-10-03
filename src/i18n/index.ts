type Locale = 'en' | 'zh';

// Translation dictionary
const translations = {
  en: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.guide': 'Guide',
    'nav.about': 'About',
    'nav.faq': 'FAQ',
    'home.title': 'Sora2 Invite Code',
    'home.subtitle': 'Get Sora2 Access Now',
    'home.description': "Real-time updated Sora2 invite codes from Reddit & Twitter. Access OpenAI's video generation platform instantly.",
    'home.liveUpdates': 'Live Updates • Real-time Collection',
    'home.browseCodes': 'Browse Codes',
    'home.howToUse': 'How to Use',
    'codes.latestCodes': 'Latest Sora2 Invite Codes',
    'codes.loading': 'Loading...',
    'codes.noCodesFound': 'No codes found',
    'codes.searchPlaceholder': 'Search sora2 invite codes...',
    'codes.copyCode': 'Copy Full Code',
    'codes.copied': 'Copied!',
    'codes.copying': 'Copying...',
    'stats.activeCodes': 'Active Codes',
    'stats.totalCopies': 'Total Copies',
    'stats.autoMonitoring': 'Auto Monitoring',
    'footer.description': "Providing the latest and most accurate Sora invite codes to help you gain access to OpenAI's video generation platform.",
    'footer.quickLinks': 'Quick Links',
    'footer.soraGuides': 'Sora Guides',
    'footer.howToUse': 'How to Use',
    'footer.contactUs': 'Contact Us',
    'footer.email': 'Email',
    'footer.termsOfService': 'Terms of Service',
    'footer.privacyPolicy': 'Privacy Policy',
    'footer.copyright': '© 2024 Sora2Code.com. This site is not affiliated with OpenAI. Sora2 is a trademark of OpenAI.'
  },
  zh: {
    'nav.home': '首页',
    'nav.blog': '博客',
    'nav.guide': '指南',
    'nav.about': '关于',
    'nav.faq': '常见问题',
    'home.title': 'Sora2 邀请码',
    'home.subtitle': '立即获取 Sora2 访问权限',
    'home.description': '实时从 Reddit 和 Twitter 更新 Sora2 邀请码。立即访问 OpenAI 的视频生成平台。',
    'home.liveUpdates': '实时更新 • 即时收集',
    'home.browseCodes': '浏览邀请码',
    'home.howToUse': '使用方法',
    'codes.latestCodes': '最新邀请码',
    'codes.loading': '加载中...',
    'codes.noCodesFound': '未找到邀请码',
    'codes.searchPlaceholder': '搜索Sora2邀请码...',
    'codes.copyCode': '复制完整代码',
    'codes.copied': '已复制！',
    'codes.copying': '复制中...',
    'stats.activeCodes': '活跃代码',
    'stats.totalCopies': '总复制次数',
    'stats.autoMonitoring': '自动监控',
    'footer.description': '提供最新、最准确的 Sora2 邀请码，帮助您获得 OpenAI 视频生成平台的访问权限。',
    'footer.quickLinks': '快速链接',
    'footer.soraGuides': 'Sora 指南',
    'footer.howToUse': '使用方法',
    'footer.contactUs': '联系我们',
    'footer.email': '邮箱',
    'footer.termsOfService': '服务条款',
    'footer.privacyPolicy': '隐私政策',
    'footer.copyright': '© 2025 Sora2Code.com。本站与 OpenAI 无关联。Sora2 是 OpenAI 的商标。'
  }
};

// Helper function to get locale from path
export function getLocaleFromPath(pathname: string): Locale {
  if (pathname.startsWith('/zh')) {
    return 'zh';
  }
  return 'en';
}

// Helper function to translate
export function t(key: string, locale: Locale = 'en'): string {
  return translations[locale][key as keyof typeof translations['en']] || key;
}

// Helper function to get localized path
export function localizeUrl(path: string, locale: Locale): string {
  if (locale === 'zh') {
    // 如果路径已经以/zh开头，直接返回
    if (path.startsWith('/zh')) {
      return path;
    }
    // 添加/zh前缀
    return `/zh${path}`;
  }
  // 英文默认路径
  return path;
}
