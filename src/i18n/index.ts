type Locale = 'en' | 'zh' | 'ja' | 'ko';

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
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.blog': 'ブログ',
    'nav.guide': 'ガイド',
    'nav.about': '私たちについて',
    'nav.faq': 'よくある質問',
    'home.title': 'Sora2 招待コード',
    'home.subtitle': '今すぐ Sora2 アクセスを取得',
    'home.description': 'Reddit と Twitter から Sora2 招待コードをリアルタイムで更新。OpenAI のビデオ生成プラットフォームに即座にアクセスできます。',
    'home.liveUpdates': 'ライブ更新 • リアルタイム収集',
    'home.browseCodes': 'コードを閲覧',
    'home.howToUse': '使い方',
    'codes.latestCodes': '最新の Sora2 招待コード',
    'codes.loading': '読み込み中...',
    'codes.noCodesFound': 'コードが見つかりません',
    'codes.searchPlaceholder': 'Sora2 招待コードを検索...',
    'codes.copyCode': '完全なコードをコピー',
    'codes.copied': 'コピーしました！',
    'codes.copying': 'コピー中...',
    'stats.activeCodes': '有効なコード',
    'stats.totalCopies': '総コピー数',
    'stats.autoMonitoring': '自動監視',
    'footer.description': '最新で最も正確な Sora 招待コードを提供し、OpenAI のビデオ生成プラットフォームへのアクセスを支援します。',
    'footer.quickLinks': 'クイックリンク',
    'footer.soraGuides': 'Sora ガイド',
    'footer.howToUse': '使い方',
    'footer.contactUs': 'お問い合わせ',
    'footer.email': 'メール',
    'footer.termsOfService': '利用規約',
    'footer.privacyPolicy': 'プライバシーポリシー',
    'footer.copyright': '© 2025 Sora2Code.com。このサイトは OpenAI と提携していません。Sora2 は OpenAI の商標です。'
  },
  ko: {
    'nav.home': '홈',
    'nav.blog': '블로그',
    'nav.guide': '가이드',
    'nav.about': '소개',
    'nav.faq': '자주 묻는 질문',
    'home.title': 'Sora2 초대 코드',
    'home.subtitle': '지금 Sora2 액세스 받기',
    'home.description': 'Reddit과 Twitter에서 실시간으로 Sora2 초대 코드를 업데이트합니다. OpenAI의 비디오 생성 플랫폼에 즉시 액세스하세요.',
    'home.liveUpdates': '실시간 업데이트 • 실시간 수집',
    'home.browseCodes': '코드 찾아보기',
    'home.howToUse': '사용 방법',
    'codes.latestCodes': '최신 Sora2 초대 코드',
    'codes.loading': '로딩 중...',
    'codes.noCodesFound': '코드를 찾을 수 없습니다',
    'codes.searchPlaceholder': 'Sora2 초대 코드 검색...',
    'codes.copyCode': '전체 코드 복사',
    'codes.copied': '복사 완료!',
    'codes.copying': '복사 중...',
    'stats.activeCodes': '활성 코드',
    'stats.totalCopies': '총 복사 수',
    'stats.autoMonitoring': '자동 모니터링',
    'footer.description': '가장 최신의 정확한 Sora 초대 코드를 제공하여 OpenAI의 비디오 생성 플랫폼에 액세스할 수 있도록 돕습니다.',
    'footer.quickLinks': '빠른 링크',
    'footer.soraGuides': 'Sora 가이드',
    'footer.howToUse': '사용 방법',
    'footer.contactUs': '문의하기',
    'footer.email': '이메일',
    'footer.termsOfService': '서비스 약관',
    'footer.privacyPolicy': '개인정보 보호정책',
    'footer.copyright': '© 2025 Sora2Code.com. 이 사이트는 OpenAI와 제휴하지 않습니다. Sora2는 OpenAI의 상표입니다.'
  }
};

// Helper function to get locale from path
export function getLocaleFromPath(pathname: string): Locale {
  if (pathname.startsWith('/zh')) {
    return 'zh';
  }
  if (pathname.startsWith('/ja')) {
    return 'ja';
  }
  if (pathname.startsWith('/ko')) {
    return 'ko';
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
  if (locale === 'ja') {
    // 如果路径已经以/ja开头，直接返回
    if (path.startsWith('/ja')) {
      return path;
    }
    // 添加/ja前缀
    return `/ja${path}`;
  }
  if (locale === 'ko') {
    // 如果路径已经以/ko开头，直接返回
    if (path.startsWith('/ko')) {
      return path;
    }
    // 添加/ko前缀
    return `/ko${path}`;
  }
  // 英文默认路径
  return path;
}
