/**
 * Perfis de plataformas de midia (origens de trafego).
 *
 * Cada entrada representa uma rede listada no NETWORKS da UI.
 * - crawlerUaPattern: user-agents de crawlers / agentes de review da plataforma
 * - asns: ASNs dainfra da plataforma (crawlers, escritorios, review nodes)
 * - inAppUaPattern: webview legitima do app da plataforma (usuario clicando no anuncio)
 *                  — NAO bloquear sozinha, mesmo que haja sinais fracos
 * - defaults: modo/threshold/rate limit/strictHeaders padrao para campanhas dessa rede
 *
 * User-agent patterns são usados para compor o HARD_BLOCK_UA_PATTERN central.
 * ASNs sao usadas para compor o PLATFORM_AGENT_ASNS central.
 */

const PROFILES = {
  tiktok: {
    key: 'tiktok',
    label: 'TikTok',
    match: /(tiktok|tik tok|^tt$)/i,
    crawlerUaPattern:
      /(bytespider|byte[_\s-]?spider|tiktokspider|tiktok[_\s-]?spider|bytedance[_\s-]?spider|bdspider|toutiaospider|newsarticle|tiktokbot)/i,
    inAppUaPattern: /(bytedancewebview|musical_ly|tiktok\s|tiktok\/|ttwebview|aweme)/i,
    asns: ['AS396986', 'AS138699', 'AS55967', 'AS137718'],
    defaults: {
      mode: 'Protecao com fallback agressivo',
      aggressiveByDefault: true,
      strictHeaders: true,
      rateLimitPerMinute: 12,
      lowerThreshold: (mode) =>
        mode === 'Protecao com fallback agressivo' ? 22 : 30
    }
  },

  meta: {
    key: 'meta',
    label: 'Meta / Facebook',
    match: /(meta|facebook|fb|instagram)/i,
    crawlerUaPattern:
      /(facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher)/i,
    inAppUaPattern: null,
    asns: ['AS32934'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  google: {
    key: 'google',
    label: 'Google Ads',
    match: /(google|google ads)/i,
    crawlerUaPattern:
      /(adsbot-google|google-inspectiontool|mediapartners-google|adsbot-google-mobile|storebot-google|googlebot|google-extended)/i,
    inAppUaPattern: null,
    asns: ['AS15169', 'AS36040', 'AS22577', 'AS139070'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: true,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  kwai: {
    key: 'kwai',
    label: 'Kwai',
    match: /(kwai|kuaishou)/i,
    crawlerUaPattern: /(kwaispider|kwai[_\s-]?bot|kuaishou[_\s-]?spider)/i,
    inAppUaPattern: null,
    asns: ['AS138996', 'AS140633'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: true,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  mgid: {
    key: 'mgid',
    label: 'Mgid',
    match: /(mgid)/i,
    crawlerUaPattern: /(mgidbot|mgid[_\s-]?crawler)/i,
    inAppUaPattern: null,
    asns: ['AS212238'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  taboola: {
    key: 'taboola',
    label: 'Taboola',
    match: /(taboola)/i,
    crawlerUaPattern:
      /(taboola[_\s-]?bot|taboola[_\s-]?crawler|taboola-sdk)/i,
    inAppUaPattern: null,
    asns: ['AS206813', 'AS394478'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  pinterest: {
    key: 'pinterest',
    label: 'Pinterest',
    match: /(pinterest)/i,
    crawlerUaPattern: /pinterestbot/i,
    inAppUaPattern: null,
    asns: ['AS396698'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  yandex: {
    key: 'yandex',
    label: 'Yandex',
    match: /(yandex)/i,
    crawlerUaPattern:
      /(yandexbot|yandexaccessibility|yandeximages|yandexdirectdyn|yandexmarket|yandexmetrika)/i,
    inAppUaPattern: null,
    asns: ['AS13238', 'AS25513'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  outbrain: {
    key: 'outbrain',
    label: 'Outbrain',
    match: /(outbrain)/i,
    crawlerUaPattern:
      /(outbrain[_\s-]?bot|outbrain[_\s-]?crawler|ob-crawler)/i,
    inAppUaPattern: null,
    asns: ['AS202426'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  newsbreak: {
    key: 'newsbreak',
    label: 'Newsbreak',
    match: /(newsbreak)/i,
    crawlerUaPattern: /(newsbreak[_\s-]?bot|newsbreak[_\s-]?crawler)/i,
    inAppUaPattern: null,
    asns: [],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  revcontent: {
    key: 'revcontent',
    label: 'Revcontent',
    match: /(revcontent)/i,
    crawlerUaPattern:
      /(revcontent[_\s-]?bot|revcontent[_\s-]?crawler)/i,
    inAppUaPattern: null,
    asns: ['AS20454'],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  sms: {
    key: 'sms',
    label: 'SMS',
    match: /(^sms$)/i,
    crawlerUaPattern: null,
    inAppUaPattern: null,
    asns: [],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  },

  outro: {
    key: 'outro',
    label: 'Personalizado / Outro',
    match: /(personalizado|outro|custom|other)/i,
    crawlerUaPattern: null,
    inAppUaPattern: null,
    asns: [],
    defaults: {
      mode: 'Protecao server-side',
      aggressiveByDefault: false,
      strictHeaders: false,
      rateLimitPerMinute: null,
      lowerThreshold: null
    }
  }
};

export function detectPlatformProfile(campaign) {
  const platform = String(campaign?.platform || '').trim();
  if (!platform) return PROFILES.outro;
  for (const profile of Object.values(PROFILES)) {
    if (profile.key === 'outro') continue;
    if (profile.match && profile.match.test(platform)) return profile;
  }
  return PROFILES.outro;
}

export function isTikTokProfile(profile) {
  return profile?.key === 'tiktok';
}

export { PROFILES as PLATFORM_PROFILES };
