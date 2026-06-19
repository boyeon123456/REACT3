const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const defaultShopItems = require('../src/constants/defaultShopItems.json');
let db;
let firebaseAdminReady = false;

function getDb() {
  // Legacy SQLite database. Current Schooly client flows use Firebase Auth/Firestore;
  // keep this lazy-loaded only for old REST endpoints until they are migrated or removed.
  if (!db) db = require('./database');
  return db;
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

loadLocalEnv();

function getFirebaseAdmin() {
  if (firebaseAdminReady) return admin;

  try {
    if (!admin.apps.length) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const projectId = process.env.FIREBASE_PROJECT_ID || 'myschool-board';

      if (serviceAccountJson || serviceAccountBase64 || serviceAccountPath) {
        const raw =
          serviceAccountJson ||
          (serviceAccountBase64 && Buffer.from(serviceAccountBase64, 'base64').toString('utf8')) ||
          fs.readFileSync(path.resolve(__dirname, serviceAccountPath), 'utf8');
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(raw)),
          projectId,
        });
      } else {
        console.warn(
          'Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64, FIREBASE_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS.'
        );
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });
      }
    }

    firebaseAdminReady = true;
    return admin;
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
    return null;
  }
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(message);
      error.code = 'TIMEOUT';
      reject(error);
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

async function requireFirebaseUser(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: '濡쒓렇???몄쬆???꾩슂?댁슂.' });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '?쒕쾭 ?몄쬆 ?ㅼ젙??以鍮꾨릺吏 ?딆븯?댁슂.' });
  }

  try {
    req.firebaseUser = await withTimeout(
      firebaseAdmin.auth().verifyIdToken(match[1]),
      8000,
      '濡쒓렇???몄쬆 ?뺤씤 ?쒓컙??珥덇낵?먯뼱?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??'
    );
    return next();
  } catch (error) {
    console.warn('Firebase token verification failed:', error.message);
    const status = error.code === 'TIMEOUT' ? 504 : 401;
    const message =
      error.code === 'TIMEOUT'
        ? error.message
        : '濡쒓렇???몄쬆??留뚮즺?먯뼱?? ?ㅼ떆 濡쒓렇?명빐 二쇱꽭??';
    return res.status(status).json({ error: message });
  }
}

async function requireAdminUser(req, res, next) {
  await requireFirebaseUser(req, res, async () => {
    try {
      const firebaseAdmin = getFirebaseAdmin();
      const snap = await firebaseAdmin.firestore().collection('users').doc(req.firebaseUser.uid).get();
      const role = snap.exists ? snap.data()?.role : '';
      if (role !== 'admin') {
        return res.status(403).json({ error: '愿由ъ옄 沅뚰븳???꾩슂?댁슂.' });
      }
      return next();
    } catch (error) {
      console.error('Admin authorization failed:', error);
      return res.status(500).json({ error: '愿由ъ옄 沅뚰븳 ?뺤씤 以??ㅻ쪟媛 諛쒖깮?덉뼱??' });
    }
  });
}

function grantAchievementInTransaction(transaction, userRef, achievementId) {
  const item = ACHIEVEMENT_ITEMS[achievementId];
  if (!item) return;
  const inventoryRef = userRef.collection('inventory').doc(achievementId);
  transaction.set(
    inventoryRef,
    {
      ...item,
      purchasedAt: Date.now(),
      source: 'achievement',
    },
    { merge: true }
  );
}

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isLocalHost(hostname) {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local');
}

function getDefaultSpotifyRedirectUri() {
  if (isProduction) return '';
  return 'http://localhost:3000/api/spotify/callback';
}

function getDefaultSpotifyFrontendRedirectUri() {
  const browserOrigin =
    allowedOrigins.find((origin) => {
      try {
        const url = new URL(origin);
        return url.protocol === 'https:' && !isLocalHost(url.hostname);
      } catch {
        return false;
      }
    }) ||
    allowedOrigins.find((origin) => {
      try {
        const url = new URL(origin);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    }) ||
    'http://localhost:5173';

  return `${browserOrigin}/mypage/edit-profile`;
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'schooly-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', async (req, res) => {
  const deep = req.query.deep === '1' || req.query.deep === 'true';
  const firebaseAdmin = getFirebaseAdmin();

  if (!firebaseAdmin) {
    return res.status(503).json({
      ok: false,
      service: 'schooly-backend',
      firebaseAdmin: false,
      error: 'firebase-admin-not-configured',
    });
  }

  if (deep) {
    try {
      await withTimeout(firebaseAdmin.auth().listUsers(1), 8000, 'Firebase Admin readiness check timed out.');
    } catch (error) {
      console.error('Firebase Admin readiness check failed:', error.message);
      return res.status(503).json({
        ok: false,
        service: 'schooly-backend',
        firebaseAdmin: false,
        error: 'firebase-admin-not-ready',
      });
    }
  }

  return res.json({
    ok: true,
    service: 'schooly-backend',
    firebaseAdmin: true,
    deep,
    timestamp: new Date().toISOString(),
  });
});

const spotifyConfig = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || getDefaultSpotifyRedirectUri(),
  frontendRedirectUri: process.env.SPOTIFY_FRONTEND_REDIRECT_URI || getDefaultSpotifyFrontendRedirectUri(),
};
let spotifyToken = null;
let spotifyAppToken = null;

const ARCADE_EXCHANGE_RATE = 500;
const ARCADE_EXCHANGE_DAILY_LIMIT_POINTS = 50;
const ARCADE_EXCHANGE_WEEKLY_LIMIT_POINTS = 200;
const ARCADE_DAILY_REWARD_COINS = 1800;
const ARCADE_DAILY_REQUIRED_MISSIONS = 3;
const ARCADE_COIN_SCALE = 10;
const ARCADE_GAME_MAX_DELTA_COINS = 50000;
const ARCADE_GAME_DAILY_GAIN_LIMIT_COINS = 100000;
const ARCADE_GAME_SETTLE_RATE_LIMIT = 60;
const ARCADE_GAME_SETTLE_RATE_WINDOW_MS = 60 * 1000;
const ARCADE_SAFE_MODE = process.env.ARCADE_SAFE_MODE !== 'false';
const ARCADE_HIGH_RISK_DAILY_PLAY_LIMIT = 10;
const ARCADE_HIGH_RISK_GAME_DAILY_PLAY_LIMIT = 5;
const ARCADE_HIGH_RISK_DAILY_LOSS_LIMIT_COINS = 3000;
const ARCADE_UNLOCK_PURCHASE_COSTS = {
  1: 3000,
  2: 8000,
  3: 15000,
};
const ARCADE_SAFE_GAME_IDS = new Set(['crossTheRoad', 'numberGuess', 'memoryGame', 'mineSweeper', 'quiz']);
const ARCADE_GAME_UNLOCK_TIERS = {
  crossTheRoad: 0,
  numberGuess: 0,
  memoryGame: 0,
  mineSweeper: 0,
  quiz: 0,
  click: 1,
  dice: 1,
  timing: 1,
  watermelon: 1,
  '2048': 1,
  fortune: 1,
  roulette: 2,
  ladderGame: 2,
  rockPaperScissors: 2,
  paperCupGame: 2,
  gatcha: 2,
  GaltonBoard: 2,
  slotMachine: 3,
  coinflip: 3,
  blackjack: 3,
  bakara: 3,
};
const ARCADE_HIGH_RISK_GAME_IDS = new Set(['slotMachine', 'coinflip', 'blackjack', 'bakara']);
const ARCADE_GAME_SETTLEMENT_LIMITS = {
  fortune: { min: -7000, max: 5000 },
  click: { min: -4000, max: 4800 },
  roulette: { min: 0, max: 5000 },
  GaltonBoard: { min: -2500, max: 27500 },
  coinflip: { min: -2500, max: 3375 },
  dice: { min: 80, max: 960 },
  numberGuess: { min: 0, max: 4200 },
  slotMachine: { min: -2500, max: 17500 },
  rockPaperScissors: { min: -4000, max: 4000 },
  gatcha: { min: -6000, max: 36000 },
  memoryGame: { min: 0, max: 2600 },
  paperCupGame: { min: -2500, max: 5000 },
  bakara: { min: -4000, max: 8800 },
  ladderGame: { min: -400, max: 2600 },
  mineSweeper: { min: 0, max: 7400 },
  quiz: { min: 0, max: 1850 },
  crossTheRoad: { min: 0, max: 4300 },
  blackjack: { min: -2500, max: 3750 },
  timing: { min: 0, max: 2200 },
  watermelon: { min: 80, max: 1800 },
  '2048': { min: 0, max: 3200 },
};
const ARCADE_WEEKLY_RANK_REWARDS = [
  { rank: 1, arcadeCoins: 0, achievementId: 'achievement-weekly-arcade-gold' },
  { rank: 2, arcadeCoins: 0, achievementId: 'achievement-weekly-arcade-silver' },
  { rank: 3, arcadeCoins: 0, achievementId: 'achievement-weekly-arcade-bronze' },
];
const ACHIEVEMENT_ITEMS = {
  'achievement-first-exchange': {
    id: 'achievement-first-exchange',
    name: '첫 전환 기록',
    description: '아케이드 경제 개편 전 전환 기록 배지입니다.',
    price: 0,
    type: 'badge',
    style: '#0ea5e9',
  },
  'achievement-daily-reward': {
    id: 'achievement-daily-reward',
    name: '오늘의 루프',
    description: '일일 아케이드 미션 보상을 받았어요.',
    price: 0,
    type: 'badge',
    style: '#22c55e',
  },
  'achievement-daily-7': {
    id: 'achievement-daily-7',
    name: '7일 루틴',
    description: '아케이드 일일 보상을 7번 받았어요.',
    price: 0,
    type: 'badge',
    style: '#f97316',
  },
  'achievement-weekly-arcade-gold': {
    id: 'achievement-weekly-arcade-gold',
    name: '주간 아케이드 1위',
    description: '주간 실력 점수 1위를 달성했어요.',
    price: 0,
    type: 'badge',
    style: '#f59e0b',
  },
  'achievement-weekly-arcade-silver': {
    id: 'achievement-weekly-arcade-silver',
    name: '주간 아케이드 2위',
    description: '주간 실력 점수 2위를 달성했어요.',
    price: 0,
    type: 'badge',
    style: '#94a3b8',
  },
  'achievement-weekly-arcade-bronze': {
    id: 'achievement-weekly-arcade-bronze',
    name: '주간 아케이드 3위',
    description: '주간 실력 점수 3위를 달성했어요.',
    price: 0,
    type: 'badge',
    style: '#b45309',
  },
};const defaultShopItemsById = new Map(defaultShopItems.map((item) => [item.id, item]));
const arcadeSettleRateBuckets = new Map();

function getKstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getKstWeekKey(date = new Date()) {
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = kstDate.getDay() || 7;
  kstDate.setDate(kstDate.getDate() + 4 - day);
  const yearStart = new Date(kstDate.getFullYear(), 0, 1);
  const week = Math.ceil(((kstDate - yearStart) / 86400000 + 1) / 7);
  return `${kstDate.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getArcadeUsageDays(arcadeStartedAt = 0) {
  if (!arcadeStartedAt) return 0;
  const elapsed = Date.now() - Number(arcadeStartedAt);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.floor(elapsed / 86400000) + 1;
}

function getArcadeUnlockTier(userData = {}) {
  const dailyRewardClaims = Number(userData.arcadeDailyRewardClaims || 0);
  const safeGameCount = Number(userData.arcadeSafeGameCount || 0);
  const gameCount = Number(userData.gameCount || 0);
  const skillScore = Number(userData.arcadeSkillScoreTotal || 0);
  const usageDays = getArcadeUsageDays(userData.arcadeStartedAt);

  if (usageDays >= 14 && dailyRewardClaims >= 7 && gameCount >= 60 && skillScore >= 75000) return 3;
  if (usageDays >= 7 && dailyRewardClaims >= 3 && gameCount >= 30 && skillScore >= 25000) return 2;
  if (dailyRewardClaims >= 1 && safeGameCount >= 10) return 1;
  return 0;
}

function getPurchasedArcadeUnlocks(userData = {}) {
  const value = userData.purchasedArcadeUnlocks || userData.arcadeUnlockedGameIds || [];
  if (Array.isArray(value)) return value.filter((gameId) => typeof gameId === 'string');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([gameId]) => gameId);
  }
  return [];
}

function getUnlockedGameIds(unlockTier, purchasedUnlocks = []) {
  const unlocked = new Set(purchasedUnlocks);
  Object.entries(ARCADE_GAME_UNLOCK_TIERS).forEach(([gameId, tier]) => {
    if (tier <= unlockTier) unlocked.add(gameId);
  });
  return Object.keys(ARCADE_GAME_UNLOCK_TIERS).filter((gameId) => unlocked.has(gameId));
}

function getArcadeUnlockCost(requiredTier) {
  return ARCADE_UNLOCK_PURCHASE_COSTS[requiredTier] || 0;
}

function getLockedGames(unlockTier, purchasedUnlocks = [], currentArcadeCoins = 0) {
  const purchased = new Set(purchasedUnlocks);
  return Object.entries(ARCADE_GAME_UNLOCK_TIERS)
    .filter(([gameId, tier]) => tier > unlockTier && !purchased.has(gameId))
    .map(([gameId, requiredTier]) => ({
      gameId,
      requiredTier,
      reason: `Tier ${requiredTier}에서 열립니다.`,
      unlockCostArcadeCoins: getArcadeUnlockCost(requiredTier),
      canPurchase: currentArcadeCoins >= getArcadeUnlockCost(requiredTier),
    }));
}

function getArcadeUnlockPayload(userData = {}, settlementData = {}) {
  const unlockTier = getArcadeUnlockTier(userData);
  const purchasedUnlockGameIds = getPurchasedArcadeUnlocks(userData);
  const arcadeCoins = Number(userData.arcadeCoins || 0);
  const highRiskPlayCount = Number(settlementData.highRiskPlayCount || 0);
  const highRiskLossArcadeCoins = Number(settlementData.highRiskLossArcadeCoins || 0);
  return {
    ok: true,
    unlockTier,
    unlockedGameIds: getUnlockedGameIds(unlockTier, purchasedUnlockGameIds),
    purchasedUnlockGameIds,
    lockedGames: getLockedGames(unlockTier, purchasedUnlockGameIds, arcadeCoins),
    dailyHighRiskPlaysRemaining: Math.max(0, ARCADE_HIGH_RISK_DAILY_PLAY_LIMIT - highRiskPlayCount),
    dailyLossRemainingArcadeCoins: Math.max(0, ARCADE_HIGH_RISK_DAILY_LOSS_LIMIT_COINS - highRiskLossArcadeCoins),
    arcadeSkillScoreTotal: Number(userData.arcadeSkillScoreTotal || 0),
    arcadeStartedAt: Number(userData.arcadeStartedAt || 0),
  };
}

function getExchangeStatusPayload(exchangedPointsToday = 0, exchangedPointsThisWeek = 0, unlockTier = 0) {
  const safeExchangedPoints = Math.max(0, Number(exchangedPointsToday) || 0);
  const safeExchangedPointsThisWeek = Math.max(0, Number(exchangedPointsThisWeek) || 0);
  const exchangeEnabled = unlockTier >= 1;
  return {
    ok: true,
    exchangeEnabled,
    message: exchangeEnabled ? '소액 환전소를 이용할 수 있어요.' : 'Tier 1부터 환전소를 이용할 수 있어요.',
    unlockRequiredMessage: exchangeEnabled ? '' : '일일 보상 1회와 안전 게임 10판을 완료해 주세요.',
    rate: ARCADE_EXCHANGE_RATE,
    dailyLimitPoints: ARCADE_EXCHANGE_DAILY_LIMIT_POINTS,
    weeklyLimitPoints: ARCADE_EXCHANGE_WEEKLY_LIMIT_POINTS,
    exchangedPointsToday: safeExchangedPoints,
    exchangedPointsThisWeek: safeExchangedPointsThisWeek,
    remainingPointsToday: Math.max(0, ARCADE_EXCHANGE_DAILY_LIMIT_POINTS - safeExchangedPoints),
    remainingPointsThisWeek: Math.max(0, ARCADE_EXCHANGE_WEEKLY_LIMIT_POINTS - safeExchangedPointsThisWeek),
    minArcadeCoins: ARCADE_EXCHANGE_RATE,
  };
}

function canSettleArcadeGameNow(userId, now = Date.now()) {
  const recent = (arcadeSettleRateBuckets.get(userId) || []).filter(
    (timestamp) => now - timestamp < ARCADE_GAME_SETTLE_RATE_WINDOW_MS
  );
  if (recent.length >= ARCADE_GAME_SETTLE_RATE_LIMIT) return false;
  recent.push(now);
  arcadeSettleRateBuckets.set(userId, recent);
  return true;
}

function mapSpotifyTrack(track) {
  const image = Array.isArray(track.album?.images) ? track.album.images[0] : null;
  return {
    id: track.id,
    name: track.name,
    artists: Array.isArray(track.artists) ? track.artists.map((artist) => artist.name).filter(Boolean) : [],
    albumImageUrl: image?.url || '',
    externalUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
    embedUrl: `https://open.spotify.com/embed/track/${track.id}`,
    previewUrl: track.preview_url || '',
    durationMs: track.duration_ms || 180000,
  };
}

async function findITunesPreviewUrl(track) {
  const artists = Array.isArray(track.artists) ? track.artists : [];
  const term = [track.name, ...artists].filter(Boolean).join(' ').trim();
  if (!term) return '';

  try {
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term,
        media: 'music',
        entity: 'song',
        limit: 5,
        country: 'KR',
      },
      timeout: 4000,
    });
    const results = Array.isArray(response.data?.results) ? response.data.results : [];
    const preview = results.find((item) => typeof item.previewUrl === 'string' && item.previewUrl.startsWith('https://'));
    return preview?.previewUrl || '';
  } catch (err) {
    console.warn('iTunes preview fallback failed:', err.message);
    return '';
  }
}

async function enrichSpotifyTracksWithPreview(tracks) {
  const mappedTracks = tracks.map(mapSpotifyTrack);
  return Promise.all(
    mappedTracks.map(async (track) => {
      if (track.previewUrl) return track;
      const fallbackPreviewUrl = await findITunesPreviewUrl(track);
      return fallbackPreviewUrl ? { ...track, previewUrl: fallbackPreviewUrl } : track;
    })
  );
}

async function refreshSpotifyTokenIfNeeded() {
  if (!spotifyToken?.refreshToken || !spotifyConfig.clientId || !spotifyConfig.clientSecret) return false;
  if (spotifyToken.expiresAt && spotifyToken.expiresAt - Date.now() > 60_000) return true;

  const credentials = Buffer.from(`${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`).toString('base64');
  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: spotifyToken.refreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  spotifyToken = {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token || spotifyToken.refreshToken,
    expiresAt: Date.now() + Number(response.data.expires_in || 3600) * 1000,
  };
  return true;
}

async function getSpotifyAppAccessToken() {
  if (!spotifyConfig.clientId || !spotifyConfig.clientSecret) return null;
  if (spotifyAppToken?.accessToken && spotifyAppToken.expiresAt - Date.now() > 60_000) {
    return spotifyAppToken.accessToken;
  }

  const credentials = Buffer.from(`${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`).toString('base64');
  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'client_credentials',
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  spotifyAppToken = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + Number(response.data.expires_in || 3600) * 1000,
  };
  return spotifyAppToken.accessToken;
}

// --- Legacy SQLite REST endpoints ---
// These routes predate the Firebase Auth/Firestore implementation. They remain
// for compatibility, but new client code should not depend on them.

// --- Authentication (legacy SQLite) ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  getDb().get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json({ success: true, user: row });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
  });
});

app.post('/api/register', (req, res) => {
  const { email, name, password } = req.body;
  getDb().run(`INSERT INTO users (email, name, password) VALUES (?, ?, ?)`,
    [email, name, password], function(err) {
      if (err) return res.status(400).json({ error: 'Email already exists' });
      res.json({ success: true, userId: this.lastID });
  });
});

// --- Posts (legacy SQLite) ---
app.get('/api/posts', (req, res) => {
  getDb().all(`SELECT * FROM posts ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/posts/trending', (req, res) => {
  getDb().all(`SELECT * FROM posts WHERE likes > 0 ORDER BY likes DESC, views DESC LIMIT 5`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/posts/:id', (req, res) => {
  const id = req.params.id;
  // Increase views
  getDb().run(`UPDATE posts SET views = views + 1 WHERE id = ?`, [id], () => {
    getDb().get(`SELECT * FROM posts WHERE id = ?`, [id], (err, post) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!post) return res.status(404).json({ error: 'Not found' });
      
      getDb().all(`SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC`, [id], (err, comments) => {
        post.commentsList = comments || [];
        res.json(post);
      });
    });
  });
});

app.post('/api/posts', (req, res) => {
  const { title, content, board, author, author_id } = req.body;
  getDb().run(`INSERT INTO posts (title, content, board, author, author_id) VALUES (?, ?, ?, ?, ?)`,
    [title, content, board, author, author_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, postId: this.lastID });
  });
});

app.post('/api/posts/:id/like', (req, res) => {
  getDb().run(`UPDATE posts SET likes = likes + 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- Comments (legacy SQLite) ---
app.post('/api/comments', (req, res) => {
  const { post_id, content, author, author_id } = req.body;
  getDb().run(`INSERT INTO comments (post_id, content, author, author_id) VALUES (?, ?, ?, ?)`,
    [post_id, content, author, author_id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      getDb().run(`UPDATE posts SET comments = comments + 1 WHERE id = ?`, [post_id]);
      res.json({ success: true, commentId: this.lastID });
  });
});

// --- Users / Rankings / Points (legacy SQLite) ---
app.get('/api/users/ranking', (req, res) => {
  getDb().all(`SELECT id, name, points, level FROM users ORDER BY points DESC LIMIT 5`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/users/:id', (req, res) => {
  getDb().get(`SELECT id, email, name, points, level, role FROM users WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/users/:id/points', requireAdminUser, (req, res) => {
  const { amount } = req.body;
  getDb().run(`UPDATE users SET points = points + ? WHERE id = ?`, [amount, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    getDb().get(`SELECT points, level FROM users WHERE id = ?`, [req.params.id], (err, row) => {
      let newLevel = row.level;
      if (row.points > 1500) newLevel = 5;
      else if (row.points > 800) newLevel = 4;
      else if (row.points > 400) newLevel = 3;
      else if (row.points > 100) newLevel = 2;
      
      if (newLevel !== row.level) {
        getDb().run(`UPDATE users SET level = ? WHERE id = ?`, [newLevel, req.params.id]);
      }
      res.json({ success: true, points: row.points, level: newLevel });
    });
  });
});

// --- Shop ---
app.post('/api/shop/purchase', requireFirebaseUser, async (req, res) => {
  const { itemId } = req.body || {};
  if (typeof itemId !== 'string' || itemId.trim().length === 0) {
    return res.status(400).json({ error: '援щℓ???꾩씠?쒖쓣 李얠쓣 ???놁뼱??' });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '援щℓ ?쒕쾭 ?몄쬆 ?ㅼ젙??以鍮꾨릺吏 ?딆븯?댁슂.' });
  }

  const firestore = firebaseAdmin.firestore();
  const userId = req.firebaseUser.uid;

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(userId);
      const itemRef = firestore.collection('shop_items').doc(itemId);
      const inventoryRef = userRef.collection('inventory').doc(itemId);

      const [userSnap, itemSnap, inventorySnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(itemRef),
        transaction.get(inventoryRef),
      ]);

      if (!userSnap.exists) {
        const error = new Error('?ъ슜???뺣낫瑜?李얠쓣 ???놁뼱??');
        error.status = 404;
        throw error;
      }

      const itemData = itemSnap.exists ? itemSnap.data() || {} : defaultShopItemsById.get(itemId);

      if (!itemData) {
        const error = new Error('?먮ℓ 以묒씤 ?꾩씠?쒖씠 ?꾨땲?먯슂.');
        error.status = 404;
        throw error;
      }

      if (inventorySnap.exists) {
        const error = new Error('?대? 蹂댁쑀?섍퀬 ?덈뒗 ?꾩씠?쒖엯?덈떎.');
        error.status = 409;
        throw error;
      }

      const userData = userSnap.data() || {};
      const currentPoints = Number(userData.points || 0);
      const price = Number(itemData.price || 0);

      if (!Number.isFinite(price) || price <= 0) {
        const error = new Error('?꾩씠??媛寃??뺣낫媛 ?щ컮瑜댁? ?딆븘??');
        error.status = 422;
        throw error;
      }

      if (currentPoints < price) {
        const error = new Error('?ъ씤?멸? 遺議깊빀?덈떎.');
        error.status = 400;
        throw error;
      }

      const nextPoints = currentPoints - price;
      transaction.update(userRef, { points: nextPoints });
      transaction.set(inventoryRef, {
        id: itemId,
        name: itemData.name,
        description: itemData.description,
        price,
        type: itemData.type,
        style: itemData.style || '',
        purchasedAt: Date.now(),
      });

      return { itemId, points: nextPoints };
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Shop purchase failed:', error);
    return res.status(error.status || 500).json({ error: error.message || '援щℓ 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뼱??' });
  }
});

// --- Arcade Exchange ---
app.get('/api/arcade/unlocks/status', requireFirebaseUser, async (req, res) => {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '아케이드 서버 인증 설정이 준비되지 않았어요.' });
  }

  try {
    const firestore = firebaseAdmin.firestore();
    const userId = req.firebaseUser.uid;
    const dateKey = getKstDateKey();
    const userRef = firestore.collection('users').doc(userId);
    const settlementRef = userRef.collection('arcadeGameSettlementDays').doc(dateKey);
    const [userSnap, settlementSnap] = await Promise.all([userRef.get(), settlementRef.get()]);

    if (!userSnap.exists) {
      return res.status(404).json({ error: '사용자 정보를 찾을 수 없어요.' });
    }

    return res.json(getArcadeUnlockPayload(userSnap.data() || {}, settlementSnap.exists ? settlementSnap.data() || {} : {}));
  } catch (error) {
    console.error('Arcade unlock status failed:', error);
    return res.status(500).json({ error: error.message || '아케이드 해금 상태를 불러오지 못했어요.' });
  }
});

app.post('/api/arcade/unlocks/purchase', requireFirebaseUser, async (req, res) => {
  const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId : '';
  const requiredTier = ARCADE_GAME_UNLOCK_TIERS[gameId];

  if (requiredTier === undefined) {
    return res.status(400).json({ error: '존재하지 않는 아케이드 게임입니다.' });
  }

  if (requiredTier <= 0) {
    return res.status(400).json({ error: '기본 게임은 이미 열려 있어요.' });
  }

  const unlockCostArcadeCoins = getArcadeUnlockCost(requiredTier);
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '아케이드 해금 서버 인증 설정이 준비되지 않았어요.' });
  }

  const firestore = firebaseAdmin.firestore();
  const userId = req.firebaseUser.uid;
  const dateKey = getKstDateKey();

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(userId);
      const settlementRef = userRef.collection('arcadeGameSettlementDays').doc(dateKey);
      const [userSnap, settlementSnap] = await Promise.all([transaction.get(userRef), transaction.get(settlementRef)]);

      if (!userSnap.exists) {
        const error = new Error('사용자 정보를 찾을 수 없어요.');
        error.status = 404;
        throw error;
      }

      const userData = userSnap.data() || {};
      const unlockTier = getArcadeUnlockTier(userData);
      const purchasedUnlockGameIds = getPurchasedArcadeUnlocks(userData);

      if (requiredTier <= unlockTier || purchasedUnlockGameIds.includes(gameId)) {
        const error = new Error('이미 해금된 게임입니다.');
        error.status = 409;
        throw error;
      }

      const currentArcadeCoins = Number(userData.arcadeCoins || 0);
      if (currentArcadeCoins < unlockCostArcadeCoins) {
        const error = new Error(`${unlockCostArcadeCoins.toLocaleString()}AC가 필요해요.`);
        error.status = 400;
        throw error;
      }

      const nextArcadeCoins = currentArcadeCoins - unlockCostArcadeCoins;
      const nextPurchasedUnlocks = [...new Set([...purchasedUnlockGameIds, gameId])];
      const nextUserData = {
        ...userData,
        arcadeCoins: nextArcadeCoins,
        purchasedArcadeUnlocks: nextPurchasedUnlocks,
      };

      transaction.update(userRef, {
        arcadeCoins: nextArcadeCoins,
        purchasedArcadeUnlocks: nextPurchasedUnlocks,
      });

      return {
        arcadeCoins: nextArcadeCoins,
        unlockedGameId: gameId,
        unlockCostArcadeCoins,
        unlockPayload: getArcadeUnlockPayload(nextUserData, settlementSnap.exists ? settlementSnap.data() || {} : {}),
      };
    });

    return res.json({
      ...result.unlockPayload,
      arcadeCoins: result.arcadeCoins,
      unlockedGameId: result.unlockedGameId,
      unlockCostArcadeCoins: result.unlockCostArcadeCoins,
    });
  } catch (error) {
    console.error('Arcade unlock purchase failed:', error);
    return res.status(error.status || 500).json({ error: error.message || '아케이드 게임 해금 중 오류가 발생했어요.' });
  }
});

app.post('/api/arcade/game/settle', requireFirebaseUser, async (req, res) => {
  const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId : '';
  const amount = Number(req.body?.amount);
  const countGame = req.body?.countGame === true;
  const deltaArcadeCoins = Math.round(amount * ARCADE_COIN_SCALE);
  const gameLimit = ARCADE_GAME_SETTLEMENT_LIMITS[gameId];

  if (!gameLimit) {
    return res.status(400).json({ error: '?????녿뒗 ?꾩??대뱶 寃뚯엫?낅땲??' });
  }

  if (!Number.isFinite(amount) || !Number.isInteger(deltaArcadeCoins)) {
    return res.status(400).json({ error: '?뺤궛 湲덉븸???щ컮瑜댁? ?딆뒿?덈떎.' });
  }

  if (deltaArcadeCoins < gameLimit.min || deltaArcadeCoins > gameLimit.max) {
    return res.status(400).json({ error: '寃뚯엫 ?뺤궛 踰붿쐞瑜?踰쀬뼱?ъ뒿?덈떎.' });
  }

  if (Math.abs(deltaArcadeCoins) > ARCADE_GAME_MAX_DELTA_COINS) {
    return res.status(400).json({ error: '1???뺤궛 ?쒕룄瑜?珥덇낵?덉뒿?덈떎.' });
  }

  if (!canSettleArcadeGameNow(req.firebaseUser.uid)) {
    return res.status(429).json({ error: '?뺤궛 ?붿껌???덈Т 留롮뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??' });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '?꾩??대뱶 ?뺤궛 ?쒕쾭 ?몄쬆 ?ㅼ젙??以鍮꾨릺吏 ?딆븯?듬땲??' });
  }

  const firestore = firebaseAdmin.firestore();
  const userId = req.firebaseUser.uid;
  const dateKey = getKstDateKey();

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(userId);
      const settlementRef = userRef.collection('arcadeGameSettlementDays').doc(dateKey);
      const [userSnap, settlementSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(settlementRef),
      ]);

      if (!userSnap.exists) {
        const error = new Error('?ъ슜???뺣낫瑜?李얠쓣 ???놁뒿?덈떎.');
        error.status = 404;
        throw error;
      }

      const userData = userSnap.data() || {};
      const currentArcadeCoins = Number(userData.arcadeCoins || 0);
      const currentWeeklyArcadeScore = Number(userData.weeklyArcadeScore || 0);
      const currentSkillScoreTotal = Number(userData.arcadeSkillScoreTotal || 0);
      const currentSafeGameCount = Number(userData.arcadeSafeGameCount || 0);
      const currentGameCount = Number(userData.gameCount || 0);
      const currentDailyGain = settlementSnap.exists ? Number(settlementSnap.data()?.gainedArcadeCoins || 0) : 0;
      const highRiskPlayCount = settlementSnap.exists ? Number(settlementSnap.data()?.highRiskPlayCount || 0) : 0;
      const highRiskLossArcadeCoins = settlementSnap.exists ? Number(settlementSnap.data()?.highRiskLossArcadeCoins || 0) : 0;
      const highRiskGameCounts =
        settlementSnap.exists && typeof settlementSnap.data()?.highRiskGameCounts === 'object'
          ? settlementSnap.data()?.highRiskGameCounts || {}
          : {};
      const positiveDelta = Math.max(0, deltaArcadeCoins);
      const negativeDelta = Math.max(0, -deltaArcadeCoins);
      const nextDailyGain = currentDailyGain + positiveDelta;
      const nextArcadeCoins = currentArcadeCoins + deltaArcadeCoins;
      const nextWeeklyArcadeScore = currentWeeklyArcadeScore + positiveDelta;
      const nextSkillScoreTotal = currentSkillScoreTotal + positiveDelta;
      const isSafeGame = ARCADE_SAFE_GAME_IDS.has(gameId);
      const isHighRiskGame = ARCADE_HIGH_RISK_GAME_IDS.has(gameId);
      const nextSafeGameCount = currentSafeGameCount + (countGame && isSafeGame ? 1 : 0);
      const nextGameCount = countGame ? currentGameCount + 1 : currentGameCount;
      const arcadeStartedAt = Number(userData.arcadeStartedAt || 0) || Date.now();
      const unlockTier = getArcadeUnlockTier({ ...userData, arcadeStartedAt });
      const requiredTier = ARCADE_GAME_UNLOCK_TIERS[gameId] ?? 0;
      const purchasedUnlocks = getPurchasedArcadeUnlocks(userData);

      if (ARCADE_SAFE_MODE && requiredTier > unlockTier && !purchasedUnlocks.includes(gameId)) {
        const error = new Error(`Tier ${requiredTier}에서 열리는 게임입니다.`);
        error.status = 403;
        throw error;
      }

      if (isHighRiskGame && countGame) {
        const currentGameHighRiskCount = Number(highRiskGameCounts[gameId] || 0);
        if (highRiskPlayCount + 1 > ARCADE_HIGH_RISK_DAILY_PLAY_LIMIT) {
          const error = new Error('오늘 고위험 게임 플레이 한도를 모두 사용했어요.');
          error.status = 429;
          throw error;
        }
        if (currentGameHighRiskCount + 1 > ARCADE_HIGH_RISK_GAME_DAILY_PLAY_LIMIT) {
          const error = new Error('오늘 이 게임의 플레이 한도를 모두 사용했어요.');
          error.status = 429;
          throw error;
        }
      }

      if (isHighRiskGame && highRiskLossArcadeCoins + negativeDelta > ARCADE_HIGH_RISK_DAILY_LOSS_LIMIT_COINS) {
        const error = new Error('오늘 고위험 게임 손실 한도를 초과했어요.');
        error.status = 400;
        throw error;
      }

      if (nextArcadeCoins < 0) {
        const error = new Error('?꾩??대뱶 肄붿씤??遺議깊빀?덈떎.');
        error.status = 400;
        throw error;
      }

      if (nextDailyGain > ARCADE_GAME_DAILY_GAIN_LIMIT_COINS) {
        const error = new Error('?ㅻ뒛 ?띾뱷 媛?ν븳 ?꾩??대뱶 肄붿씤 ?쒕룄瑜?珥덇낵?덉뒿?덈떎.');
        error.status = 400;
        throw error;
      }

      transaction.update(userRef, {
        arcadeCoins: nextArcadeCoins,
        weeklyArcadeScore: nextWeeklyArcadeScore,
        arcadeSkillScoreTotal: nextSkillScoreTotal,
        arcadeSafeGameCount: nextSafeGameCount,
        arcadeStartedAt,
        ...(countGame ? { gameCount: nextGameCount } : {}),
      });
      transaction.set(
        settlementRef,
        {
          dateKey,
          gameId,
          gainedArcadeCoins: nextDailyGain,
          highRiskPlayCount: highRiskPlayCount + (isHighRiskGame && countGame ? 1 : 0),
          highRiskLossArcadeCoins: highRiskLossArcadeCoins + (isHighRiskGame ? negativeDelta : 0),
          highRiskGameCounts: isHighRiskGame && countGame
            ? { ...highRiskGameCounts, [gameId]: Number(highRiskGameCounts[gameId] || 0) + 1 }
            : highRiskGameCounts,
          settleCount: (settlementSnap.exists ? Number(settlementSnap.data()?.settleCount || 0) : 0) + 1,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      return {
        points: Number(userData.points || 0),
        arcadeCoins: nextArcadeCoins,
        unlockTier,
        weeklyArcadeScore: nextWeeklyArcadeScore,
        arcadeSkillScoreTotal: nextSkillScoreTotal,
        gameCount: nextGameCount,
      };
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Arcade game settlement failed:', error);
    return res.status(error.status || 500).json({ error: error.message || '?꾩??대뱶 ?뺤궛 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' });
  }
});

app.get('/api/arcade/exchange/status', requireFirebaseUser, async (req, res) => {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '?섏쟾 ?쒕쾭 ?몄쬆 ?ㅼ젙??以鍮꾨릺吏 ?딆븯?댁슂.' });
  }

  try {
    const firestore = firebaseAdmin.firestore();
    const userId = req.firebaseUser.uid;
    const dateKey = getKstDateKey();
    const weekKey = getKstWeekKey();
    const userRef = firestore.collection('users').doc(userId);
    const exchangeRef = userRef.collection('arcadeExchangeDays').doc(dateKey);
    const exchangeWeekRef = userRef.collection('arcadeExchangeWeeks').doc(weekKey);
    const [userSnap, exchangeSnap, exchangeWeekSnap] = await Promise.all([
      userRef.get(),
      exchangeRef.get(),
      exchangeWeekRef.get(),
    ]);

    if (!userSnap.exists) {
      return res.status(404).json({ error: '사용자 정보를 찾을 수 없어요.' });
    }

    const unlockTier = getArcadeUnlockTier(userSnap.data() || {});
    const exchangedPointsToday = exchangeSnap.exists ? Number(exchangeSnap.data()?.exchangedPoints || 0) : 0;
    const exchangedPointsThisWeek = exchangeWeekSnap.exists ? Number(exchangeWeekSnap.data()?.exchangedPoints || 0) : 0;

    return res.json(getExchangeStatusPayload(exchangedPointsToday, exchangedPointsThisWeek, unlockTier));
  } catch (error) {
    console.error('Arcade exchange status failed:', error);
    return res.status(500).json({ error: error.message || '?섏쟾???곹깭瑜?遺덈윭?ㅼ? 紐삵뻽?댁슂.' });
  }
});

app.post('/api/arcade/exchange', requireFirebaseUser, async (req, res) => {
  const requestedArcadeCoins = Number(req.body?.arcadeCoins);

  if (!Number.isInteger(requestedArcadeCoins)) {
    return res.status(400).json({ error: '환전할 아케이드 코인을 숫자로 입력해 주세요.' });
  }

  if (requestedArcadeCoins < ARCADE_EXCHANGE_RATE) {
    return res.status(400).json({ error: `최소 ${ARCADE_EXCHANGE_RATE.toLocaleString()}AC부터 환전할 수 있어요.` });
  }

  if (requestedArcadeCoins % ARCADE_EXCHANGE_RATE !== 0) {
    return res.status(400).json({ error: `${ARCADE_EXCHANGE_RATE.toLocaleString()}AC 단위로 환전할 수 있어요.` });
  }

  const receivedPoints = requestedArcadeCoins / ARCADE_EXCHANGE_RATE;
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '환전 서버 인증 설정이 준비되지 않았어요.' });
  }

  const firestore = firebaseAdmin.firestore();
  const userId = req.firebaseUser.uid;
  const dateKey = getKstDateKey();
  const weekKey = getKstWeekKey();

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(userId);
      const exchangeRef = userRef.collection('arcadeExchangeDays').doc(dateKey);
      const exchangeWeekRef = userRef.collection('arcadeExchangeWeeks').doc(weekKey);

      const [userSnap, exchangeSnap, exchangeWeekSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(exchangeRef),
        transaction.get(exchangeWeekRef),
      ]);

      if (!userSnap.exists) {
        const error = new Error('사용자 정보를 찾을 수 없어요.');
        error.status = 404;
        throw error;
      }

      const userData = userSnap.data() || {};
      const unlockTier = getArcadeUnlockTier(userData);
      if (unlockTier < 1) {
        const error = new Error('Tier 1부터 환전소를 이용할 수 있어요.');
        error.status = 403;
        throw error;
      }

      const currentArcadeCoins = Number(userData.arcadeCoins || 0);
      const currentPoints = Number(userData.points || 0);
      const exchangedPointsToday = exchangeSnap.exists ? Number(exchangeSnap.data()?.exchangedPoints || 0) : 0;
      const exchangedPointsThisWeek = exchangeWeekSnap.exists ? Number(exchangeWeekSnap.data()?.exchangedPoints || 0) : 0;

      if (currentArcadeCoins < requestedArcadeCoins) {
        const error = new Error('아케이드 코인이 부족해요.');
        error.status = 400;
        throw error;
      }

      if (exchangedPointsToday + receivedPoints > ARCADE_EXCHANGE_DAILY_LIMIT_POINTS) {
        const error = new Error('오늘 환전 가능 포인트를 초과했어요.');
        error.status = 400;
        throw error;
      }

      if (exchangedPointsThisWeek + receivedPoints > ARCADE_EXCHANGE_WEEKLY_LIMIT_POINTS) {
        const error = new Error('이번 주 환전 가능 포인트를 초과했어요.');
        error.status = 400;
        throw error;
      }

      const nextArcadeCoins = currentArcadeCoins - requestedArcadeCoins;
      const nextPoints = currentPoints + receivedPoints;
      const nextExchangedPointsToday = exchangedPointsToday + receivedPoints;
      const nextExchangedPointsThisWeek = exchangedPointsThisWeek + receivedPoints;

      transaction.update(userRef, {
        arcadeCoins: nextArcadeCoins,
        points: nextPoints,
      });
      transaction.set(exchangeRef, { dateKey, exchangedPoints: nextExchangedPointsToday, updatedAt: Date.now() }, { merge: true });
      transaction.set(exchangeWeekRef, { weekKey, exchangedPoints: nextExchangedPointsThisWeek, updatedAt: Date.now() }, { merge: true });

      return {
        unlockTier,
        arcadeCoins: nextArcadeCoins,
        points: nextPoints,
        exchangedArcadeCoins: requestedArcadeCoins,
        receivedPoints,
        exchangedPointsToday: nextExchangedPointsToday,
        exchangedPointsThisWeek: nextExchangedPointsThisWeek,
      };
    });

    return res.json({
      ...getExchangeStatusPayload(result.exchangedPointsToday, result.exchangedPointsThisWeek, result.unlockTier),
      arcadeCoins: result.arcadeCoins,
      points: result.points,
      exchangedArcadeCoins: result.exchangedArcadeCoins,
      receivedPoints: result.receivedPoints,
    });
  } catch (error) {
    console.error('Arcade exchange failed:', error);
    return res.status(error.status || 500).json({ error: error.message || '환전 처리 중 오류가 발생했어요.' });
  }
});
// --- Arcade Daily Reward ---
app.get('/api/arcade/daily-reward/status', requireFirebaseUser, async (req, res) => {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '?꾩??대뱶 蹂댁긽 ?쒕쾭 ?몄쬆 ?ㅼ젙??以鍮꾨릺吏 ?딆븯?댁슂.' });
  }

  try {
    const firestore = firebaseAdmin.firestore();
    const userId = req.firebaseUser.uid;
    const dateKey = getKstDateKey();
    const rewardRef = firestore.collection('users').doc(userId).collection('arcadeDailyRewards').doc(dateKey);
    const rewardSnap = await rewardRef.get();

    return res.json({
      ok: true,
      dateKey,
      claimed: rewardSnap.exists,
      rewardArcadeCoins: ARCADE_DAILY_REWARD_COINS,
      requiredMissionCount: ARCADE_DAILY_REQUIRED_MISSIONS,
    });
  } catch (error) {
    console.error('Arcade daily reward status failed:', error);
    return res.status(500).json({ error: error.message || '?쇱씪 蹂댁긽 ?곹깭瑜?遺덈윭?ㅼ? 紐삵뻽?댁슂.' });
  }
});

app.post('/api/arcade/daily-reward/claim', requireFirebaseUser, async (req, res) => {
  const completedMissionIds = Array.isArray(req.body?.completedMissionIds)
    ? req.body.completedMissionIds.filter((id) => typeof id === 'string')
    : [];

  if (completedMissionIds.length < ARCADE_DAILY_REQUIRED_MISSIONS) {
    return res.status(400).json({ error: '?ㅻ뒛??誘몄뀡??紐⑤몢 ?꾨즺?댁빞 蹂댁긽??諛쏆쓣 ???덉뼱??' });
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return res.status(503).json({ error: '?꾩??대뱶 蹂댁긽 ?쒕쾭 ?몄쬆 ?ㅼ젙??以鍮꾨릺吏 ?딆븯?댁슂.' });
  }

  const firestore = firebaseAdmin.firestore();
  const userId = req.firebaseUser.uid;
  const dateKey = getKstDateKey();

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(userId);
      const rewardRef = userRef.collection('arcadeDailyRewards').doc(dateKey);
      const [userSnap, rewardSnap] = await Promise.all([transaction.get(userRef), transaction.get(rewardRef)]);

      if (!userSnap.exists) {
        const error = new Error('?ъ슜???뺣낫瑜?李얠쓣 ???놁뼱??');
        error.status = 404;
        throw error;
      }

      if (rewardSnap.exists) {
        const error = new Error('?ㅻ뒛???꾩??대뱶 蹂댁긽? ?대? 諛쏆븯?댁슂.');
        error.status = 409;
        throw error;
      }

      const userData = userSnap.data() || {};
      const currentArcadeCoins = Number(userData.arcadeCoins || 0);
      const currentDailyRewardClaims = Number(userData.arcadeDailyRewardClaims || 0);
      const nextArcadeCoins = currentArcadeCoins + ARCADE_DAILY_REWARD_COINS;
      const nextDailyRewardClaims = currentDailyRewardClaims + 1;

      transaction.update(userRef, {
        arcadeCoins: nextArcadeCoins,
        arcadeDailyRewardClaims: nextDailyRewardClaims,
      });
      transaction.set(rewardRef, {
        dateKey,
        rewardArcadeCoins: ARCADE_DAILY_REWARD_COINS,
        completedMissionIds,
        claimedAt: Date.now(),
      });
      grantAchievementInTransaction(transaction, userRef, 'achievement-daily-reward');
      if (nextDailyRewardClaims >= 7) {
        grantAchievementInTransaction(transaction, userRef, 'achievement-daily-7');
      }

      return {
        points: Number(userData.points || 0),
        arcadeCoins: nextArcadeCoins,
      };
    });

    return res.json({
      ok: true,
      dateKey,
      claimed: true,
      rewardArcadeCoins: ARCADE_DAILY_REWARD_COINS,
      requiredMissionCount: ARCADE_DAILY_REQUIRED_MISSIONS,
      points: result.points,
      arcadeCoins: result.arcadeCoins,
    });
  } catch (error) {
    console.error('Arcade daily reward claim failed:', error);
    return res.status(error.status || 500).json({ error: error.message || '?쇱씪 蹂댁긽 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뼱??' });
  }
});

// --- Admin Rewards ---
app.post('/api/admin/rewards/grant', requireAdminUser, async (req, res) => {
  const { targetUserId, points = 0, arcadeCoins = 0, itemId = '', reason = '' } = req.body || {};
  const safePoints = Math.floor(Number(points) || 0);
  const safeArcadeCoins = Math.floor(Number(arcadeCoins) || 0);

  if (typeof targetUserId !== 'string' || !targetUserId.trim()) {
    return res.status(400).json({ error: '蹂댁긽??吏湲됲븷 ?ъ슜?먮? ?좏깮??二쇱꽭??' });
  }

  if (!safePoints && !safeArcadeCoins && !itemId) {
    return res.status(400).json({ error: '吏湲됲븷 ?ъ씤?? AC, ?꾩씠??以??섎굹???꾩슂?댁슂.' });
  }

  const firebaseAdmin = getFirebaseAdmin();
  const firestore = firebaseAdmin.firestore();

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const userRef = firestore.collection('users').doc(targetUserId);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        const error = new Error('?ъ슜???뺣낫瑜?李얠쓣 ???놁뼱??');
        error.status = 404;
        throw error;
      }

      const userData = userSnap.data() || {};
      const nextPoints = Math.max(0, Number(userData.points || 0) + safePoints);
      const nextArcadeCoins = Math.max(0, Number(userData.arcadeCoins || 0) + safeArcadeCoins);
      transaction.update(userRef, {
        points: nextPoints,
        arcadeCoins: nextArcadeCoins,
      });

      if (itemId) {
        const itemData = ACHIEVEMENT_ITEMS[itemId] || defaultShopItemsById.get(itemId);
        if (!itemData) {
          const error = new Error('吏湲됲븷 ?꾩씠?쒖쓣 李얠쓣 ???놁뼱??');
          error.status = 404;
          throw error;
        }
        transaction.set(
          userRef.collection('inventory').doc(itemId),
          {
            id: itemId,
            name: itemData.name,
            description: itemData.description,
            price: Number(itemData.price || 0),
            type: itemData.type,
            style: itemData.style || '',
            purchasedAt: Date.now(),
            source: 'admin_reward',
          },
          { merge: true }
        );
      }

      return { points: nextPoints, arcadeCoins: nextArcadeCoins };
    });

    await firestore.collection('admin_reward_logs').add({
      actorUid: req.firebaseUser.uid,
      targetUserId,
      points: safePoints,
      arcadeCoins: safeArcadeCoins,
      itemId: itemId || '',
      reason: reason || '',
      createdAt: Date.now(),
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Admin reward grant failed:', error);
    return res.status(error.status || 500).json({ error: error.message || '愿由ъ옄 蹂댁긽 吏湲?以??ㅻ쪟媛 諛쒖깮?덉뼱??' });
  }
});

app.post('/api/admin/arcade/weekly-rewards', requireAdminUser, async (_req, res) => {
  const firebaseAdmin = getFirebaseAdmin();
  const firestore = firebaseAdmin.firestore();
  const dateKey = getKstDateKey();

  try {
    const settlementRef = firestore.collection('arcadeWeeklyRewardSettlements').doc(dateKey);
    const result = await firestore.runTransaction(async (transaction) => {
      const settlementSnap = await transaction.get(settlementRef);
      if (settlementSnap.exists) {
        const error = new Error('?ㅻ뒛 二쇨컙 ??궧 蹂댁긽? ?대? ?뺤궛?덉뼱??');
        error.status = 409;
        throw error;
      }

      const topSnap = await firestore.collection('users').orderBy('weeklyArcadeScore', 'desc').limit(3).get();
      const winners = [];
      topSnap.docs.forEach((entry, index) => {
        const reward = ARCADE_WEEKLY_RANK_REWARDS[index];
        if (!reward) return;
        const userRef = firestore.collection('users').doc(entry.id);
        const data = entry.data() || {};
        grantAchievementInTransaction(transaction, userRef, reward.achievementId);
        winners.push({
          userId: entry.id,
          name: data.name || '',
          rank: reward.rank,
          weeklyArcadeScore: Number(data.weeklyArcadeScore || 0),
          achievementId: reward.achievementId,
        });
      });

      transaction.set(settlementRef, { dateKey, winners, createdAt: Date.now() });
      return winners;
    });

    return res.json({ ok: true, dateKey, winners: result });
  } catch (error) {
    console.error('Weekly arcade rewards failed:', error);
    return res.status(error.status || 500).json({ error: error.message || '二쇨컙 ??궧 蹂댁긽 ?뺤궛 以??ㅻ쪟媛 諛쒖깮?덉뼱??' });
  }
});

// --- Spotify ---
app.get('/api/spotify/login', (req, res) => {
  if (!spotifyConfig.clientId || !spotifyConfig.clientSecret) {
    return res.status(500).json({ error: 'Spotify ?섍꼍 蹂?섍? ?ㅼ젙?섏? ?딆븯?댁슂.' });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: spotifyConfig.clientId,
    scope: 'user-top-read',
    redirect_uri: spotifyConfig.redirectUri,
  });

  return res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get('/api/spotify/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`${spotifyConfig.frontendRedirectUri}?spotify=denied`);
  }
  if (!code || !spotifyConfig.clientId || !spotifyConfig.clientSecret) {
    return res.redirect(`${spotifyConfig.frontendRedirectUri}?spotify=missing_config`);
  }

  try {
    const credentials = Buffer.from(`${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`).toString('base64');
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: spotifyConfig.redirectUri,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    spotifyToken = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + Number(response.data.expires_in || 3600) * 1000,
    };
    return res.redirect(`${spotifyConfig.frontendRedirectUri}?spotify=connected`);
  } catch (err) {
    console.error('Spotify callback error:', err.response?.data || err.message);
    return res.redirect(`${spotifyConfig.frontendRedirectUri}?spotify=error`);
  }
});

app.get('/api/spotify/top-tracks', async (req, res) => {
  try {
    const hasToken = await refreshSpotifyTokenIfNeeded();
    if (!hasToken || !spotifyToken?.accessToken) {
      return res.status(401).json({ error: 'Spotify ?곌껐???꾩슂?댁슂.' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 10);
    const timeRange = ['short_term', 'medium_term', 'long_term'].includes(req.query.time_range)
      ? req.query.time_range
      : 'long_term';
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${spotifyToken.accessToken}` },
      params: { time_range: timeRange, limit },
    });

    const items = await enrichSpotifyTracksWithPreview(response.data.items || []);
    res.json({ items });
  } catch (err) {
    console.error('Spotify top tracks error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Spotify Top Tracks瑜?遺덈윭?ㅼ? 紐삵뻽?댁슂.' });
  }
});

app.get('/api/spotify/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ items: [] });

  try {
    const accessToken = await getSpotifyAppAccessToken();
    if (!accessToken) {
      return res.status(500).json({ error: 'Spotify ?섍꼍 蹂?섍? ?ㅼ젙?섏? ?딆븯?댁슂.' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit || 8), 1), 20);
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q,
        type: 'track',
        limit,
        market: req.query.market || 'KR',
      },
    });

    const items = await enrichSpotifyTracksWithPreview(response.data.tracks?.items || []);
    res.json({ items });
  } catch (err) {
    console.error('Spotify search error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Spotify 寃?됱뿉 ?ㅽ뙣?덉뼱??' });
  }
});

// --- Timetable ---
const fallbackTimetableSubjects = {
  1: {
    월: ['국어', '수학', '영어', '통합사회', '과학', '체육', '자율'],
    화: ['영어', '국어', '수학', '한국사', '음악', '과학', '동아리'],
    수: ['수학', '영어', '통합사회', '국어', '미술', '진로', '체육'],
    목: ['과학', '수학', '영어', '국어', '한국사', '정보', '자율'],
    금: ['국어', '영어', '수학', '통합사회', '과학', '체육', '창체'],
  },
  2: {
    월: ['문학', '수학 I', '영어 I', '세계사', '생명과학', '체육', '자율'],
    화: ['영어 I', '문학', '수학 I', '정치와 법', '음악', '화학', '동아리'],
    수: ['수학 I', '영어 I', '세계사', '문학', '미술', '진로', '체육'],
    목: ['생명과학', '수학 I', '영어 I', '문학', '정치와 법', '정보', '자율'],
    금: ['문학', '영어 I', '수학 I', '세계사', '화학', '체육', '창체'],
  },
  3: {
    월: ['독서', '미적분', '영어 독해', '사회문화', '물리학', '체육', '자율'],
    화: ['영어 독해', '독서', '미적분', '생활과 윤리', '음악', '지구과학', '동아리'],
    수: ['미적분', '영어 독해', '사회문화', '독서', '미술', '진로', '체육'],
    목: ['물리학', '미적분', '영어 독해', '독서', '생활과 윤리', '정보', '자율'],
    금: ['독서', '영어 독해', '미적분', '사회문화', '지구과학', '체육', '창체'],
  },
};

function getFallbackTimetable(grade = 1) {
  const subjectsByDay = fallbackTimetableSubjects[Number(grade)] || fallbackTimetableSubjects[1];
  return Object.fromEntries(
    Object.entries(subjectsByDay).map(([day, subjects]) => [
      day,
      subjects.map((subject, index) => ({
        id: `fallback-${grade}-${day}-${index + 1}`,
        grade: Number(grade) || 1,
        class: 1,
        day,
        period: index + 1,
        subject,
        room: `${Number(grade) || 1}-1교실`,
      })),
    ])
  );
}

app.get('/api/timetable', (req, res) => {
  const { grade = 1, class: cls = 1 } = req.query;
  getDb().all(`SELECT * FROM timetable WHERE grade = ? AND class = ? ORDER BY day, period`,
    [grade, cls], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      if (rows.length < 25) {
        return res.json(getFallbackTimetable(grade));
      }
      
      // Group by day for convenience
      const timetable = { 월: [], 화: [], 수: [], 목: [], 금: [] };
      rows.forEach(row => {
        if (timetable[row.day]) {
          timetable[row.day].push(row);
        }
      });
      
      res.json(timetable);
  });
});

// --- Meals ---
const neisApi = require('./neisApi');
let mealCache = { data: null, fetchDate: null };
let monthlyMealCache = {}; // { '2026-4': { data: {...}, fetchDate: '...' } }
const fallbackWeeklyMeals = {
  월: {
    breakfast: '',
    lunch: '쌀밥, 된장국, 제육볶음, 계란찜, 배추김치',
    dinner: '',
  },
  화: {
    breakfast: '',
    lunch: '현미밥, 미역국, 닭갈비, 콩나물무침, 깍두기',
    dinner: '',
  },
  수: {
    breakfast: '',
    lunch: '카레라이스, 유부장국, 샐러드, 요구르트, 배추김치',
    dinner: '',
  },
  목: {
    breakfast: '',
    lunch: '보리밥, 순두부찌개, 생선까스, 감자조림, 배추김치',
    dinner: '',
  },
  금: {
    breakfast: '',
    lunch: '김치볶음밥, 계란국, 떡볶이, 단무지, 과일',
    dinner: '',
  },
};

app.get('/api/meals', async (req, res) => {
  try {
    const todayStr = new Date().toDateString();
    
    // If cache is empty or stale (from a previous day), update it
    if (!mealCache.data || mealCache.fetchDate !== todayStr) {
      const liveData = await neisApi.getWeeklyMeals();
      if (Object.keys(liveData).length > 0) {
        mealCache.data = liveData;
        mealCache.fetchDate = todayStr;
      } else {
        mealCache.data = fallbackWeeklyMeals;
        mealCache.fetchDate = todayStr;
      }
    }
    
    res.json(mealCache.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meals/month', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const cacheKey = `${year}-${month}`;
    const todayStr = new Date().toDateString();

    if (!monthlyMealCache[cacheKey] || monthlyMealCache[cacheKey].fetchDate !== todayStr) {
      const liveData = await neisApi.getMonthlyMeals(year, month);
      
      monthlyMealCache[cacheKey] = {
        data: liveData,
        fetchDate: todayStr
      };
      
      // If API brings absolutely no data, we could inject some mock data for demonstration
      // but realistically month view shouldn't just show 'Mon-Fri' repeated. Let's return what we have.
    }

    res.json(monthlyMealCache[cacheKey].data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
