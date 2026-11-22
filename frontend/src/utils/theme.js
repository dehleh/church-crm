// frontend/src/utils/theme.js

export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 29, g: 78, b: 216 };
  let c = hex.trim().replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return { r: 29, g: 78, b: 216 };
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 29, g: 78, b: 216 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function mix(rgb1, rgb2, weight) {
  const w = Math.max(0, Math.min(1, weight));
  return {
    r: rgb1.r * w + rgb2.r * (1 - w),
    g: rgb1.g * w + rgb2.g * (1 - w),
    b: rgb1.b * w + rgb2.b * (1 - w),
  };
}

export function generatePalette(primaryHex, accentHex) {
  const base = hexToRgb(primaryHex || '#1d4ed8');
  const accent = hexToRgb(accentHex || '#3b82f6');
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  const s50  = mix(base, white, 0.07);
  const s100 = mix(base, white, 0.15);
  const s200 = mix(base, white, 0.28);
  const s300 = mix(base, white, 0.46);
  const s400 = mix(base, white, 0.68);
  const s500 = mix(base, white, 0.85);
  const s600 = base;
  const s700 = mix(base, black, 0.84);
  const s800 = mix(base, black, 0.68);
  const s900 = mix(base, black, 0.45);
  const s950 = mix(base, black, 0.22);

  return {
    primary: primaryHex || '#1d4ed8',
    accent: accentHex || '#3b82f6',
    shades: {
      50:  rgbToHex(s50.r, s50.g, s50.b),
      100: rgbToHex(s100.r, s100.g, s100.b),
      200: rgbToHex(s200.r, s200.g, s200.b),
      300: rgbToHex(s300.r, s300.g, s300.b),
      400: rgbToHex(s400.r, s400.g, s400.b),
      500: rgbToHex(s500.r, s500.g, s500.b),
      600: primaryHex || '#1d4ed8',
      700: rgbToHex(s700.r, s700.g, s700.b),
      800: rgbToHex(s800.r, s800.g, s800.b),
      900: rgbToHex(s900.r, s900.g, s900.b),
      950: rgbToHex(s950.r, s950.g, s950.b),
    },
    rgb: {
      50:  `${Math.round(s50.r)}, ${Math.round(s50.g)}, ${Math.round(s50.b)}`,
      100: `${Math.round(s100.r)}, ${Math.round(s100.g)}, ${Math.round(s100.b)}`,
      200: `${Math.round(s200.r)}, ${Math.round(s200.g)}, ${Math.round(s200.b)}`,
      300: `${Math.round(s300.r)}, ${Math.round(s300.g)}, ${Math.round(s300.b)}`,
      400: `${Math.round(s400.r)}, ${Math.round(s400.g)}, ${Math.round(s400.b)}`,
      500: `${Math.round(s500.r)}, ${Math.round(s500.g)}, ${Math.round(s500.b)}`,
      600: `${Math.round(s600.r)}, ${Math.round(s600.g)}, ${Math.round(s600.b)}`,
      700: `${Math.round(s700.r)}, ${Math.round(s700.g)}, ${Math.round(s700.b)}`,
      800: `${Math.round(s800.r)}, ${Math.round(s800.g)}, ${Math.round(s800.b)}`,
      900: `${Math.round(s900.r)}, ${Math.round(s900.g)}, ${Math.round(s900.b)}`,
      950: `${Math.round(s950.r)}, ${Math.round(s950.g)}, ${Math.round(s950.b)}`,
      accent: `${Math.round(accent.r)}, ${Math.round(accent.g)}, ${Math.round(accent.b)}`,
    }
  };
}

export function applyChurchTheme(themeSettings = {}, churchMeta = {}) {
  const primary = themeSettings?.primaryColor || '#1d4ed8';
  const accent = themeSettings?.accentColor || '#3b82f6';
  const palette = generatePalette(primary, accent);
  const root = document.documentElement;

  root.style.setProperty('--brand-primary', palette.primary);
  root.style.setProperty('--brand-accent', palette.accent);

  Object.entries(palette.shades).forEach(([step, hex]) => {
    root.style.setProperty(`--brand-${step}`, hex);
  });
  Object.entries(palette.rgb).forEach(([step, rgbStr]) => {
    root.style.setProperty(`--brand-${step}-rgb`, rgbStr);
  });

  if (themeSettings?.fontFamily) {
    root.style.setProperty('--brand-font-family', themeSettings.fontFamily);
  }

  // Set document title if church name available
  const churchName = churchMeta?.name || churchMeta?.churchName;
  if (churchName) {
    const pageTitleSuffix = churchMeta?.portal ? 'Member Portal' : 'ChurchOS';
    document.title = `${churchName} — ${pageTitleSuffix}`;
  }

  // Set favicon if logo available
  const logoUrl = churchMeta?.logoUrl || churchMeta?.churchLogoUrl || churchMeta?.logo_url;
  if (logoUrl) {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    const resolvedUrl = logoUrl.startsWith('http') || logoUrl.startsWith('/') ? logoUrl : `/uploads/${logoUrl}`;
    link.href = resolvedUrl;
  }

  // Cache branding locally for seamless cold starts & branded login
  try {
    const cached = {
      name: churchName || '',
      tagline: churchMeta?.tagline || churchMeta?.churchTagline || '',
      slug: churchMeta?.slug || churchMeta?.churchSlug || '',
      logoUrl: logoUrl || '',
      bannerUrl: churchMeta?.bannerUrl || churchMeta?.churchBannerUrl || churchMeta?.banner_url || '',
      theme: {
        primaryColor: palette.primary,
        accentColor: palette.accent,
        sidebarTheme: themeSettings?.sidebarTheme || 'light',
        fontFamily: themeSettings?.fontFamily || 'DM Sans',
      },
      updatedAt: Date.now(),
    };
    localStorage.setItem('churchos_cached_branding', JSON.stringify(cached));
  } catch (e) {
    // localStorage may be unavailable in private browsing modes
  }
}

export function getCachedChurchBranding() {
  try {
    const raw = localStorage.getItem('churchos_cached_branding');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function initializeCachedTheme() {
  const cached = getCachedChurchBranding();
  if (cached) {
    applyChurchTheme(cached.theme, cached);
  }
}

export async function resolveDomainBranding() {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.railway.app') ||
    host.endsWith('.themobilemissionary.org') ||
    host === 'themobilemissionary.org'
  ) {
    return;
  }

  try {
    const { publicIntakeAPI } = await import('../api/services');
    const res = await publicIntakeAPI.getByDomain(host);
    const church = res.data?.data;
    if (church) {
      applyChurchTheme(church.settings?.theme, {
        name: church.name,
        logoUrl: church.logoUrl,
        bannerUrl: church.bannerUrl,
        tagline: church.tagline,
        slug: church.slug,
      });
    }
  } catch {
    // Custom domain not yet configured or pending DNS verification
  }
}
