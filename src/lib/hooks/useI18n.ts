import { useState, useEffect } from 'react';

type Locale = 'en' | 'zh' | 'ja' | 'ko';

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
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.blog': 'ブログ',
    'nav.guide': 'ガイド',
    'nav.about': '概要',
    'nav.faq': 'よくある質問',
    'home.title': 'Sora 招待コード',
    'home.subtitle': '今すぐSoraアクセスを取得',
    'home.description': 'RedditとTwitterからリアルタイムで更新されるSora招待コード。OpenAIのビデオ生成プラットフォームに即座にアクセス。',
    'home.liveUpdates': 'ライブ更新 • リアルタイム収集',
    'home.browseCodes': 'コードを閲覧',
    'home.howToUse': '使い方',
    'codes.latestCodes': '最新の招待コード',
    'codes.loading': '読み込み中...',
    'codes.noCodesFound': 'コードが見つかりません',
    'codes.searchPlaceholder': '招待コードを検索...',
    'codes.copyCode': '完全なコードをコピー',
    'codes.copied': 'コピーしました！',
    'codes.copying': 'コピー中...',
    'stats.activeCodes': '有効なコード',
    'stats.totalCopies': '総コピー数',
    'stats.autoMonitoring': '自動監視'
  },
  ko: {
    'nav.home': '홈',
    'nav.blog': '블로그',
    'nav.guide': '가이드',
    'nav.about': '소개',
    'nav.faq': '자주 묻는 질문',
    'home.title': 'Sora 초대 코드',
    'home.subtitle': '지금 Sora 액세스 권한 받기',
    'home.description': 'Reddit 및 Twitter에서 실시간으로 업데이트되는 Sora 초대 코드. OpenAI의 비디오 생성 플랫폼에 즉시 액세스하세요.',
    'home.liveUpdates': '라이브 업데이트 • 실시간 수집',
    'home.browseCodes': '코드 둘러보기',
    'home.howToUse': '사용 방법',
    'codes.latestCodes': '최신 초대 코드',
    'codes.loading': '로딩 중...',
    'codes.noCodesFound': '코드를 찾을 수 없습니다',
    'codes.searchPlaceholder': '초대 코드 검색...',
    'codes.copyCode': '전체 코드 복사',
    'codes.copied': '복사됨!',
    'codes.copying': '복사 중...',
    'stats.activeCodes': '활성 코드',
    'stats.totalCopies': '총 복사 수',
    'stats.autoMonitoring': '자동 모니터링'
  }
};

export function useI18n() {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // Detect locale from URL
    const path = window.location.pathname;
    let detectedLocale: Locale = 'en';
    if (path.startsWith('/zh')) {
      detectedLocale = 'zh';
    } else if (path.startsWith('/ja')) {
      detectedLocale = 'ja';
    } else if (path.startsWith('/ko')) {
      detectedLocale = 'ko';
    }
    setLocale(detectedLocale);
  }, []);

  const t = (key: string): string => {
    return translations[locale][key as keyof typeof translations['en']] || key;
  };

  return { t, locale };
}
