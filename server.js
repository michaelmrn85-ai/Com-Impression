const express    = require('express');
const path       = require('path');
const { execFile } = require('child_process');
const cors       = require('cors');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const fs         = require('fs');
const vm         = require('vm');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const ADMIN_PASSWORD = String(
    process.env.ADMIN_PWD ||
    process.env.ADMIN_PASSWORD ||
    'comimpression2025'
).trim();
const SUMUP_PUBLIC_API_KEY = String(process.env.SUMUP_PUBLIC_API_KEY || '').trim();
const SUMUP_SECRET_API_KEY = String(process.env.SUMUP_SECRET_API_KEY || '').trim();
const SUMUP_MERCHANT_CODE = String(process.env.SUMUP_MERCHANT_CODE || '').trim();
const KNOWN_PUBLIC_ORIGINS = Array.from(new Set([
    process.env.PUBLIC_BASE_URL,
    process.env.SITE_BASE_URL,
    process.env.RENDER_EXTERNAL_URL,
    'https://com-impression.fr',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3100',
    'http://127.0.0.1:3100'
].filter(Boolean).map(value => String(value).replace(/\/$/, ''))));

function isAllowedOrigin(origin) {
    if (!origin || origin === 'null') return true;
    const clean = String(origin).replace(/\/$/, '');
    if (KNOWN_PUBLIC_ORIGINS.includes(clean)) return true;
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean);
}

app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error('Origine non autorisee par CORS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-session-token'],
    optionsSuccessStatus: 204
}));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (String(proto).includes('https')) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (
        req.path.startsWith('/api/client') ||
        req.path.startsWith('/api/admin') ||
        req.path.startsWith('/api/commandes')
    ) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
    }
    next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

const RATE_LIMIT_STORE = new Map();
function rateLimit(options) {
    const opts = Object.assign({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'global' }, options || {});
    return function (req, res, next) {
        const key = opts.prefix + ':' + (req.ip || 'unknown');
        const now = Date.now();
        const current = RATE_LIMIT_STORE.get(key) || { count: 0, resetAt: now + opts.windowMs };
        if (current.resetAt <= now) {
            current.count = 0;
            current.resetAt = now + opts.windowMs;
        }
        current.count += 1;
        RATE_LIMIT_STORE.set(key, current);
        res.setHeader('Retry-After', Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
        if (current.count > opts.max) {
            return res.status(429).json({ success: false, error: 'Trop de tentatives. Reessayez plus tard.' });
        }
        next();
    };
}

function requireAdminPasswordConfigured(res) {
    if (ADMIN_PASSWORD) return true;
    res.status(503).json({ success: false, error: 'Le mot de passe admin n est pas configure cote serveur.' });
    return false;
}

function adminPasswordMatches(value) {
    return !!ADMIN_PASSWORD && String(value || '') === ADMIN_PASSWORD;
}

function requireSumupConfigured(res) {
    if (!SUMUP_SECRET_API_KEY) {
        res.status(503).json({ success: false, error: 'SumUp n est pas configure cote serveur.' });
        return false;
    }
    if (!SUMUP_MERCHANT_CODE) {
        res.status(503).json({ success: false, error: 'Le merchant code SumUp est manquant cote serveur.' });
        return false;
    }
    return true;
}

function readCookies(req) {
    const raw = String((req.headers && req.headers.cookie) || '');
    return raw.split(';').reduce((acc, item) => {
        const idx = item.indexOf('=');
        if (idx <= 0) return acc;
        const key = item.slice(0, idx).trim();
        const value = item.slice(idx + 1).trim();
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
}

function setClientSessionCookie(req, res, token) {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || '');
    const secure = proto.includes('https');
    const parts = [
        `ci_session=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=2592000'
    ];
    if (secure) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}

function clearClientSessionCookie(req, res) {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || '');
    const secure = proto.includes('https');
    const parts = [
        'ci_session=',
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0'
    ];
    if (secure) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}

const upload = multer({ dest: '/tmp/', limits: { fileSize: 70 * 1024 * 1024 } });
const BRAND_LOGO_PATH = path.join(__dirname, 'com-logo.png');
const BRAND_LOGO_CID = 'com-impression-logo';
const BRAND_CONTACT_EMAIL = 'michael@com-impression.fr';
const BRAND_CONTACT_PHONE = '07 43 69 56 41';
const BRAND_SITE_URL = 'https://com-impression.fr';

function createTransporter() {
    return nodemailer.createTransport({
        host: 'smtp.ionos.fr', port: 465, secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }, connectionTimeout: 30000
    });
}

function getPublicBaseUrl(req) {
    return process.env.PUBLIC_BASE_URL
        || process.env.SITE_BASE_URL
        || process.env.RENDER_EXTERNAL_URL
        || `${req.protocol}://${req.get('host')}`;
}

let legacyCatalogCache = null;

function slugifyLegacyLabel(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function parseEuroLabel(value) {
    const text = String(value || '').replace(/\s+/g, ' ');
    if (text.indexOf('€') === -1 && text.toUpperCase().indexOf('EUR') === -1) return null;
    const match = text.match(/(\d+(?:[ ,]\d{1,2})?)/);
    if (!match) return null;
    return Number(match[1].replace(',', '.').replace(' ', ''));
}

function extractLegacyCatalog() {
    if (legacyCatalogCache) return legacyCatalogCache;

    const source = fs.readFileSync(path.join(__dirname, 'com-impression.js'), 'utf8');
    const catalogStart = source.indexOf('var QCV_CD=');
    const stateMarker = source.indexOf('// ===== STATE =====');
    const calcStart = source.indexOf('function calcPrix(prod,sels,qte,larg,haut){');
    const calcEnd = source.indexOf('// ===== STEPS =====');

    if (catalogStart < 0 || stateMarker < 0 || calcStart < 0 || calcEnd < 0) {
        throw new Error('Impossible d extraire le catalogue legacy');
    }

    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(source.slice(catalogStart, stateMarker), ctx);
    vm.runInContext(source.slice(calcStart, calcEnd), ctx);
    legacyCatalogCache = ctx;
    return ctx;
}

function buildCatalogApiPayload() {
    const ctx = extractLegacyCatalog();
    const cat = ctx.CAT || {};
    const overrides = lireProductOverrides();
    const customProducts = lireCustomProducts();
    const order = [
        { legacy: 'compro', slug: 'com-pro', title: "Com'Pro", description: "Supports print pour entreprises, commerces et activites pro." },
        { legacy: 'comext', slug: 'com-exterieur', title: "Com'Exterieur", description: "Supports grand format et visibilite exterieure." },
        { legacy: 'comevt', slug: 'com-evenementiel', title: "Com'Evenementiel", description: "Supports pour mariages, salons, receptions et evenements." },
        { legacy: 'comperso', slug: 'com-personnalisee', title: "Com'Personnalisee", description: "Textile, goodies et objets personnalises." },
        { legacy: 'comservices', slug: 'com-services', title: "Com'Services", description: "Impression, plastification, photo et services du quotidien." }
    ];

    let refIndex = 1;
    const gammes = order.map(group => {
        const legacyProducts = (cat[group.legacy] || []).map(prod => {
            const optionKeys = Object.keys(prod.opts || {});
            const defaultSelections = {};
            optionKeys.forEach(key => {
                defaultSelections[key] = (prod.opts[key] || [])[0] || '';
            });
            const override = overrides[buildProductOverrideKey(group.legacy, prod.id)] || {};
            const options = applyOptionOverrides(prod.opts || {}, override);
            const optionKeyList = Object.keys(options || {});
            const product = {
                ref: buildProductRef(refIndex++),
                id: prod.id,
                legacyCat: group.legacy,
                title: override.title || prod.nom,
                priceLabel: String(override.priceLabel || prod.prix || 'Sur devis').replace(/€/g, 'EUR'),
                priceValue: override.priceValue != null ? Number(override.priceValue) : parseEuroLabel(prod.prix),
                summary: override.summary || prod.desc || group.description,
                tags: [group.title, override.summary || prod.desc || '', optionKeyList.join(' ')].filter(Boolean),
                options: options,
                optionKeys: optionKeyList,
                defaultSelections,
                quantityOptions: override.quantityOptions && override.quantityOptions.length ? override.quantityOptions.slice() : (Array.isArray(prod.Q) ? prod.Q : []),
                quantityPricing: override.quantityPricing && override.quantityPricing.length ? override.quantityPricing.slice() : [],
                purchasePrice: override.purchasePrice == null || override.purchasePrice === '' ? null : Number(override.purchasePrice),
                salePrice: override.salePrice == null || override.salePrice === '' ? (override.priceValue != null ? Number(override.priceValue) : parseEuroLabel(prod.prix)) : Number(override.salePrice),
                requiresQuantityInput: !!(prod.prixUnit || prod.id === 'impression-doc'),
                hasDimensions: !!(prod.dims || prod.dimsLibres),
                dimsLibres: !!prod.dimsLibres,
                minDimensionsCm: prod.dimsLibres ? { width: 50, height: 50 } : null,
                unit: prod.unite || '',
                uploadEnabled: override.uploadEnabled !== false,
                image: override.image || '',
                imageUrl: getProductImageUrl(override.image || ''),
                legacyFlags: {
                    prixSpecial: !!prod.prixSpecial,
                    prixUnit: !!prod.prixUnit
                }
            };
            product.optionKeys.forEach(key => {
                if (defaultSelections[key] == null || (options[key] || []).indexOf(defaultSelections[key]) === -1) {
                    defaultSelections[key] = (options[key] || [])[0] || '';
                }
            });
            return product;
        });

        const extraProducts = customProducts
            .filter(item => item && item.legacyCat === group.legacy)
            .map(item => {
                const paperOptions = normaliseCsvList(item.paperOptions);
                const finishOptions = normaliseCsvList(item.finishOptions);
                const options = {};
                if (paperOptions.length) options.Papier = paperOptions;
                if (finishOptions.length) options.Finition = finishOptions;
                normaliseFreeOptions(item.freeOptions).forEach(option => {
                    if (!options[option.nom]) options[option.nom] = [];
                    if (!options[option.nom].includes(option.valeur)) options[option.nom].push(option.valeur);
                });
                const optionKeys = Object.keys(options);
                const defaultSelections = {};
                optionKeys.forEach(key => {
                    defaultSelections[key] = (options[key] || [])[0] || '';
                });
                return {
                    ref: buildProductRef(refIndex++),
                    id: item.id,
                    legacyCat: group.legacy,
                    title: item.title,
                    priceLabel: String(item.priceLabel || 'Sur devis').replace(/€/g, 'EUR'),
                    priceValue: item.priceValue == null || item.priceValue === '' ? parseEuroLabel(item.priceLabel) : Number(item.priceValue),
                    summary: item.summary || group.description,
                    tags: [group.title, item.summary || '', item.title || ''].filter(Boolean),
                    options,
                    optionKeys,
                    defaultSelections,
                    quantityOptions: normaliseCsvList(item.quantityOptions).map(value => parseInt(value, 10)).filter(value => !isNaN(value) && value > 0),
                    quantityPricing: normaliseQuantityPricing(Array.isArray(item.quantityPricing) ? item.quantityPricing : []),
                    purchasePrice: item.purchasePrice == null || item.purchasePrice === '' ? null : Number(item.purchasePrice),
                    salePrice: item.salePrice == null || item.salePrice === '' ? (item.priceValue == null || item.priceValue === '' ? parseEuroLabel(item.priceLabel) : Number(item.priceValue)) : Number(item.salePrice),
                    requiresQuantityInput: !!item.requiresQuantityInput,
                    hasDimensions: !!item.hasDimensions,
                    dimsLibres: !!item.hasDimensions,
                    minDimensionsCm: item.hasDimensions ? { width: Number(item.minWidth) || 1, height: Number(item.minHeight) || 1 } : null,
                    unit: item.unit || '',
                    uploadEnabled: item.uploadEnabled !== false,
                    image: item.image || '',
                    imageUrl: getProductImageUrl(item.image || ''),
                    legacyFlags: {
                        prixSpecial: false,
                        prixUnit: !!item.requiresQuantityInput
                    }
                };
            });

        return {
            slug: group.slug,
            legacyCat: group.legacy,
            title: group.title,
            description: group.description,
            products: legacyProducts.concat(extraProducts)
        };
    });

    gammes.push({
        slug: 'com-gourmand',
        legacyCat: 'com-gourmand',
        title: "Com'Gourmand",
        description: "Une future gamme de gourmandises personnalisees pour vos evenements et cadeaux clients.",
        comingSoon: true,
        products: []
    });

    return { gammes };
}

function resolveLegacyProduct(legacyCat, productId) {
    const ctx = extractLegacyCatalog();
    const prod = ((ctx.CAT || {})[legacyCat] || []).find(item => item.id === productId);
    if (!prod) return null;
    return { ctx, prod };
}

function resolveQuantityOptions(ctx, prod, sels) {
    if (!prod) return [];
    if (prod.id === 'affiche' && prod.prixSpecial) {
        const fmt = sels['Format'] || 'A4';
        const imp = sels['Impression'] || 'Recto';
        const tbl = { 'A4': ctx.TAF_A4, 'A3': ctx.TAF_A3, 'A2': ctx.TAF_A2, 'A1': ctx.TAF_A1, 'A0': ctx.TAF_A0 }[fmt];
        const data = tbl && (tbl[imp] || (fmt === 'A0' ? tbl['Recto'] : null));
        return data && Array.isArray(data.Q) ? data.Q.slice() : [];
    }
    if (prod.id === 'menu-resto' && prod.prixSpecial) {
        const fmt = sels['Format'] || 'Simple A4';
        const tbl = {
            'Simple A5': ctx.TMENU_A5,
            'Simple A4': ctx.TMENU_A4,
            'Dépliant A4 (1 pli)': ctx.TMENU_DEP_A4,
            'Dépliant A3 (1 pli)': ctx.TMENU_DEP_A3
        }[fmt];
        return tbl && Array.isArray(tbl.Q) ? tbl.Q.slice() : [];
    }
    return Array.isArray(prod.Q) ? prod.Q.slice() : [];
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getBrandingAttachments(extraAttachments = []) {
    const attachments = Array.isArray(extraAttachments) ? extraAttachments.slice() : [];
    if (fs.existsSync(BRAND_LOGO_PATH) && !attachments.some(a => a && a.cid === BRAND_LOGO_CID)) {
        attachments.push({
            filename: 'com-logo.png',
            path: BRAND_LOGO_PATH,
            cid: BRAND_LOGO_CID
        });
    }
    return attachments;
}

function emailSignatureBlock() {
    return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#fff;border:1px solid #f0dfcf;border-radius:18px;">
          <tr>
            <td style="padding:18px 20px;font-size:13px;line-height:1.8;color:#5f5751;">
              <strong style="display:block;color:#171310;font-size:15px;margin-bottom:6px;">Michael - COM' Impression</strong>
              <div><strong>Email :</strong> <a href="mailto:${BRAND_CONTACT_EMAIL}" style="color:#F47B20;text-decoration:none;font-weight:700;">${BRAND_CONTACT_EMAIL}</a></div>
              <div><strong>Telephone :</strong> <a href="tel:+33743695641" style="color:#F47B20;text-decoration:none;font-weight:700;">${BRAND_CONTACT_PHONE}</a></div>
              <div><strong>Site :</strong> <a href="${BRAND_SITE_URL}" style="color:#F47B20;text-decoration:none;font-weight:700;">${BRAND_SITE_URL.replace('https://', '')}</a></div>
            </td>
          </tr>
        </table>`;
}

function parsePanierJson(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(item => ({
            ref: escapeHtml(item.ref || ''),
            label: escapeHtml(item.label || ''),
            quantity: escapeHtml(item.quantity || ''),
            finishLabel: escapeHtml(item.finishLabel || ''),
            unitLabel: escapeHtml(item.unitLabel || ''),
            totalLabel: escapeHtml(item.totalLabel || item.total || ''),
            configuration: escapeHtml(item.configuration || ''),
            notes: escapeHtml(item.notes || ''),
            gamme: escapeHtml(item.gamme || '')
        })).filter(item => item.ref || item.label);
    } catch (error) {
        return [];
    }
}

function buildFallbackProductRef(seed) {
    const text = String(seed || '');
    let sum = 0;
    for (let i = 0; i < text.length; i += 1) sum += text.charCodeAt(i) * (i + 1);
    return 'COM' + String((sum % 9999) + 1).padStart(4, '0');
}

function deriveRowsForStats(cmd) {
    const panierItems = parsePanierJson(cmd && cmd.panier_json);
    if (panierItems.length) {
        return panierItems.map(item => ({
            ref: item.ref || '',
            label: item.label || '',
            gamme: item.gamme || '',
            total: parseEuroLabel(item.totalLabel) || 0
        }));
    }
    const lines = String((cmd && cmd.panier) || '').split(/\n|\|/).map(line => line.trim()).filter(Boolean);
    return lines.map(line => {
        const refMatch = line.match(/(COM\d{4})/i);
        const amountMatches = line.match(/(?:\d+(?:[,.]\d{1,2})?\s*(?:€|EUR))/gi) || [];
        const total = amountMatches.length ? parseEuroLabel(amountMatches[amountMatches.length - 1]) || 0 : 0;
        return {
            ref: refMatch ? refMatch[1].toUpperCase() : buildFallbackProductRef(line),
            label: line.split('-')[0].trim(),
            gamme: '',
            total
        };
    });
}

function emailWrapper(content, couleur, nomBrand, lien, sousTitre) {
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5eee8;font-family:Arial,sans-serif;color:#171310;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#f7efe8 0%,#f2e7dd 100%);padding:36px 12px;">
  <tr><td align="center">
    <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fffdfb;border-radius:28px;overflow:hidden;box-shadow:0 20px 70px rgba(23,19,16,.12);border:1px solid #ead7c7;">
      <tr><td style="background:linear-gradient(135deg,#ff9a55 0%,${couleur} 55%,#cf5d14 100%);padding:30px 34px;text-align:center;">
        ${fs.existsSync(BRAND_LOGO_PATH)
          ? `<img src="cid:${BRAND_LOGO_CID}" alt="Logo COM' Impression" style="display:block;margin:0 auto 12px;max-width:240px;height:auto;">`
          : `<div style="display:inline-block;background:rgba(0,0,0,0.12);border-radius:16px;padding:12px 24px;margin-bottom:10px;"><span style="font-weight:900;font-size:30px;color:#fff;letter-spacing:-0.5px;">COM&apos;</span><span style="font-weight:400;font-size:30px;color:rgba(255,255,255,0.92);letter-spacing:-0.5px;">Impression</span></div>`}
        <div style="display:inline-block;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Conçu en Vendée • Imprimé sur site</div>
        <p style="margin:12px 0 0;color:rgba(255,255,255,.82);font-size:13px;line-height:1.6;">${sousTitre}</p>
      </td></tr>
      <tr><td style="padding:34px 34px 28px;">${content}</td></tr>
      <tr><td style="padding:0 34px 26px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff4e8;border:1px solid #f2dac2;border-radius:20px;">
          <tr>
            <td style="padding:18px 20px;font-size:13px;line-height:1.7;color:#5f5751;">
              <strong style="display:block;color:#171310;font-size:14px;margin-bottom:4px;">COM' Impression</strong>
              Vos impressions, conceptions visuelles et commandes personnalisées sont conçues en Vendée, expédiées depuis la Vendée et imprimées sur site.
            </td>
          </tr>
        </table>
        ${emailSignatureBlock()}
      </td></tr>
      <tr><td style="background:#171310;padding:22px 34px;text-align:center;">
        <p style="margin:0;color:rgba(255,255,255,.58);font-size:12px;">
          &copy; 2026 <a href="${lien}" style="color:#ff9a55;text-decoration:none;font-weight:700;">${nomBrand}</a>
        </p>
        <p style="margin:7px 0 0;color:rgba(255,255,255,.34);font-size:11px;">Message automatique - merci de ne pas y répondre directement.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function blocClient(d, couleur) {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ef;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Nom</span><strong>${escapeHtml(d.prenom||'')} ${escapeHtml(d.nom||'')}</strong></td></tr>
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Email</span><a href="mailto:${escapeHtml(d.email)}" style="color:${couleur};font-weight:bold;">${escapeHtml(d.email)}</a></td></tr>
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Téléphone</span>${escapeHtml(d.tel||'--')}</td></tr>
      ${d.adresse?`<tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Adresse</span>${escapeHtml(d.adresse)}</td></tr>`:''}
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Profil</span>${escapeHtml(d.type_client||'Particulier')}${d.siret?' -- SIRET : '+escapeHtml(d.siret):''}</td></tr>
    </table>`;
}

function blocPanier(panierTexte, prixTotal, couleur, d) {
    const panierItems = parsePanierJson(d.panier_json);
    if (panierItems.length) {
        const lignes = panierItems.map(item => `<tr>
            <td style="padding:12px 10px;border-bottom:1px solid #f0ebe4;font-size:12px;font-weight:800;color:#1a1a1a;">${item.ref}</td>
            <td style="padding:12px 10px;border-bottom:1px solid #f0ebe4;font-size:13px;line-height:1.5;color:#1a1a1a;">
              <strong>${item.label}</strong>
              ${item.gamme ? `<div style="color:#888;font-size:11px;margin-top:4px;">${item.gamme}</div>` : ''}
              ${item.configuration ? `<div style="color:#888;font-size:11px;margin-top:4px;">Configuration : ${item.configuration}</div>` : ''}
              ${item.notes ? `<div style="color:#888;font-size:11px;margin-top:4px;">Note : ${item.notes}</div>` : ''}
            </td>
            <td align="right" style="padding:12px 10px;border-bottom:1px solid #f0ebe4;font-size:13px;color:#1a1a1a;">${item.quantity}</td>
            <td align="right" style="padding:12px 10px;border-bottom:1px solid #f0ebe4;font-size:13px;color:#1a1a1a;">${item.finishLabel || '--'}</td>
            <td align="right" style="padding:12px 10px;border-bottom:1px solid #f0ebe4;font-size:13px;color:#1a1a1a;">${item.unitLabel || '--'}</td>
            <td align="right" style="padding:12px 10px;border-bottom:1px solid #f0ebe4;font-size:13px;font-weight:800;color:${couleur};">${item.totalLabel}</td>
          </tr>`).join('');
        return `<table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #f0ebe4;border-radius:10px;overflow:hidden;margin:20px 0;">
          <tr><td style="background:#fff5ec;padding:13px 16px;border-bottom:2px solid ${couleur};">
            <strong style="color:${couleur};font-size:14px;">Detail commande</strong>
          </td></tr>
          <tr><td style="padding:0 12px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:12px 10px;border-bottom:1px solid #e8ddd1;font-size:11px;color:#888;font-weight:800;text-transform:uppercase;">Reference</td>
                <td style="padding:12px 10px;border-bottom:1px solid #e8ddd1;font-size:11px;color:#888;font-weight:800;text-transform:uppercase;">Libelle</td>
                <td align="right" style="padding:12px 10px;border-bottom:1px solid #e8ddd1;font-size:11px;color:#888;font-weight:800;text-transform:uppercase;">Quantite</td>
                <td align="right" style="padding:12px 10px;border-bottom:1px solid #e8ddd1;font-size:11px;color:#888;font-weight:800;text-transform:uppercase;">Finition papier</td>
                <td align="right" style="padding:12px 10px;border-bottom:1px solid #e8ddd1;font-size:11px;color:#888;font-weight:800;text-transform:uppercase;">Prix unitaire</td>
                <td align="right" style="padding:12px 10px;border-bottom:1px solid #e8ddd1;font-size:11px;color:#888;font-weight:800;text-transform:uppercase;">Total TTC</td>
              </tr>
              ${lignes}
            </table>
          </td></tr>
          ${prixTotal && prixTotal !== '--' ? `<tr><td style="background:#fff5ec;padding:14px 16px;border-top:2px solid ${couleur};">
            <table width="100%">
              <tr>
                <td style="font-size:15px;font-weight:bold;">${(d.payment_status==='paye') ? 'Montant payé' : 'Total TTC'}</td>
                <td align="right" style="font-size:22px;font-weight:900;color:${couleur};">${escapeHtml(prixTotal)}</td>
              </tr>
              ${(d.payment_status==='paye') ? `<tr><td colspan="2" style="padding-top:8px;border-top:1px solid #f5dcc8;margin-top:8px;">
                <span style="background:#22c55e;color:#fff;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:700;">✅ PAYE PAR CARTE BANCAIRE</span>
                ${d.payment_id ? `<span style="font-size:11px;color:#888;margin-left:8px;">Ref. paiement : ${escapeHtml(d.payment_id)}</span>` : ''}
              </td></tr>` : ''}
            </table>
          </td></tr>` : ''}
        </table>`;
    }
    const lignes = (panierTexte||'').split(/\n|\|/).filter(Boolean)
        .map(l => {
            const t = escapeHtml(l.trim());
            // Mettre en valeur les lignes produit vs infos complémentaires
            const isInfo = t.startsWith('[') || t.startsWith('Livraison') || t.startsWith('Remise');
            return `<tr><td style="padding:9px 14px;border-bottom:1px solid #f0ebe4;font-size:${isInfo?'12':'13'}px;line-height:1.5;color:${isInfo?'#888':'#1a1a1a'};${isInfo?'font-style:italic;':''}">${t}</td></tr>`;
        }).join('');
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #f0ebe4;border-radius:10px;overflow:hidden;margin:20px 0;">
      <tr><td style="background:#fff5ec;padding:13px 16px;border-bottom:2px solid ${couleur};">
        <strong style="color:${couleur};font-size:14px;">Detail</strong>
      </td></tr>
      <tr><td><table width="100%" cellpadding="0" cellspacing="0">${lignes||'<tr><td style="padding:12px 14px;color:#aaa;">--</td></tr>'}</table></td></tr>
      ${prixTotal && prixTotal !== '--' ? `<tr><td style="background:#fff5ec;padding:14px 16px;border-top:2px solid ${couleur};">
        <table width="100%">
          <tr>
            <td style="font-size:15px;font-weight:bold;">${(d.payment_status==='paye') ? 'Montant payé' : 'Total TTC'}</td>
            <td align="right" style="font-size:22px;font-weight:900;color:${couleur};">${escapeHtml(prixTotal)}</td>
          </tr>
          ${(d.payment_status==='paye') ? `<tr><td colspan="2" style="padding-top:8px;border-top:1px solid #f5dcc8;margin-top:8px;">
            <span style="background:#22c55e;color:#fff;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:700;">✅ PAYE PAR CARTE BANCAIRE</span>
            ${d.payment_id ? `<span style="font-size:11px;color:#888;margin-left:8px;">Ref. paiement : ${escapeHtml(d.payment_id)}</span>` : ''}
          </td></tr>` : ''}
        </table>
      </td></tr>` : ''}
    </table>`;
}

function blocFichiers(files, couleur) {
    if (!files || !files.length) return `<p style="font-size:12px;color:#aaa;margin:16px 0;">Aucun fichier joint -- le client peut envoyer ses fichiers via WeTransfer.</p>`;
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ebe4;border-radius:10px;overflow:hidden;margin:16px 0;">
      <tr><td style="background:#f7f3ef;padding:11px 14px;border-bottom:1px solid #e8e0d8;">
        <strong style="font-size:13px;color:#5C5C5C;">Fichiers joints (${files.length})</strong>
      </td></tr>
      ${files.map(f => `<tr><td style="padding:7px 14px;border-bottom:1px solid #f0ebe4;font-size:13px;">
        📎 <strong>${f.originalname}</strong> <span style="color:#aaa;">${(f.size/1024/1024).toFixed(2)} Mo</span>
      </td></tr>`).join('')}
    </table>`;
}

app.post('/api/devis', upload.array('fichiers', 10), async (req, res) => {
    try {
        const d     = req.body;
        const files = req.files || [];
        const cartUploads = resolveCartUploads(d.cart_upload_tokens);
        const allFiles = files.concat(cartUploads.map(item => ({
            originalname: item.originalname,
            path: item.path,
            size: fs.existsSync(item.path) ? fs.statSync(item.path).size : 0
        })));
        const publicBaseUrl = getPublicBaseUrl(req);
        const source = (d.source || 'imprylo').toLowerCase();
        const isCI   = source === 'com-impression';
        const couleur  = isCI ? '#F47B20' : '#059669';
        const nomBrand = isCI ? "COM' Impression" : 'IMPRYLO';
        const sousTitre = isCI ? 'Montreverd (85) - Vendee' : 'imprylo.fr';
        const lien     = isCI ? publicBaseUrl : 'https://imprylo.fr';

        const prixTotal      = d.prix_total || '--';
        const panierTexte    = d.panier || '';
        const message        = d.message || '';
        const paymentStatus  = d.payment_status || '';
        const adresse        = d.adresse || '';
        const paymentId      = d.payment_id || '';
        const payeCB         = paymentStatus === 'paye';

        // Detecter type
        const panierLow = panierTexte.toLowerCase();
        const isContact     = panierLow.startsWith('contact');
        const isPartenariat = panierLow.startsWith('partenariat');

        // EMAIL ADMIN
        const contenuAdmin = `
            <p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:#1a1a1a;">
                ${isContact ? '📞 Nouveau message contact' : isPartenariat ? '🤝 Nouvelle demande partenariat' : payeCB ? '💳 Commande payée CB' : '📋 Nouvelle commande'} — ${nomBrand}
            </p>
            <p style="color:#888;font-size:13px;margin:0 0 20px;">Recu le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
            ${blocClient(d, couleur)}
            ${blocPanier(panierTexte, prixTotal, couleur, d)}
            ${message ? `<table width="100%"><tr><td style="background:#f7f3ef;border-left:4px solid ${couleur};padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px;font-style:italic;line-height:1.6;">${message.replace(/\n/g,'<br>')}</td></tr></table>` : ''}
            ${blocFichiers(allFiles, couleur)}
            <table width="100%" style="margin-top:24px;"><tr>
              <td style="text-align:center;padding:16px;background:#f7f3ef;border-radius:10px;">
                <a href="mailto:${d.email}" style="background:${couleur};color:#fff;text-decoration:none;padding:11px 26px;border-radius:50px;font-weight:bold;font-size:14px;display:inline-block;">Repondre au client</a>
              </td>
            </tr></table>`;

        // EMAIL CLIENT
        const prenom = d.prenom || d.nom || 'cher client';
        // Générer le code et numéro EN AMONT pour l'inclure dans l'email
        const cmdsPre    = lireCommandes();
        const numPre     = String(cmdsPre.length + 1).padStart(4, '0');
        const anneePre   = new Date().getFullYear();
        const numCmd     = !isContact && !isPartenariat ? `CI-${anneePre}-${numPre}` : '';
        const codeAcces  = !isContact && !isPartenariat ? genererCode() : '';
        const suiviUrl   = codeAcces ? `${publicBaseUrl}?suivi=${numCmd}&code=${codeAcces}` : publicBaseUrl;
        const suiviBtn  = !isContact && !isPartenariat && codeAcces ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr><td style="background:#f7f3ef;border-radius:12px;padding:20px 24px;text-align:center;">
                <p style="font-size:13px;color:#888;margin:0 0 14px;">Suivez l'avancement de votre commande en temps réel</p>
                <a href="${suiviUrl}" style="background:#F47B20;color:#fff;text-decoration:none;padding:13px 32px;border-radius:50px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 0 #D4621A;">
                  Suivre ma commande →
                </a>
                <p style="font-size:11px;color:#bbb;margin:12px 0 0;">N° <strong style="color:#F47B20;">${numCmd}</strong> &nbsp;|&nbsp; Code : <strong style="color:#F47B20;">${codeAcces}</strong></p>
              </td></tr>
            </table>` : '';
        const titreClient = isContact ? 'Message bien reçu !' : isPartenariat ? 'Demande de partenariat bien reçue !' : payeCB ? '✅ Commande confirmée — Paiement accepté !' : '✅ Commande enregistrée !';
        const introClient = isContact ?
            `Nous avons bien recu votre message et vous repondons sous <strong>48h</strong>.` :
            isPartenariat ?
            `Nous avons bien recu votre demande de partenariat et revenons vers vous sous <strong>48h</strong>.` :
            payeCB ? `Votre paiement a été <strong style='color:#22c55e;'>✅ accepté</strong> et votre commande est confirmée. Nous préparons votre impression et vous contactons sous <strong>24h</strong>.` : `Nous avons bien reçu votre commande et revenons vers vous sous <strong>24h</strong> avec votre confirmation. Merci de votre confiance !`;

        const contenuClient = `
            <h2 style="color:${couleur};font-size:22px;margin:0 0 8px;">${titreClient}</h2>
            <p style="color:#5C5C5C;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Bonjour <strong>${prenom}</strong>,<br><br>${introClient}
            </p>
            ${!isContact && !isPartenariat ? blocPanier(panierTexte, prixTotal, couleur, d) : ''}
            ${payeCB ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
              <tr><td style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:16px 20px;">
                <table width="100%">
                  <tr>
                    <td style="font-size:14px;color:#166534;font-weight:700;">✅ Paiement accepté par carte bancaire</td>
                    <td align="right" style="font-size:20px;font-weight:900;color:#166534;">${prixTotal}</td>
                  </tr>
                  ${d.payment_id ? `<tr><td colspan="2" style="font-size:11px;color:#888;padding-top:6px;">Référence paiement : ${d.payment_id}</td></tr>` : ''}
                </table>
              </td></tr>
            </table>` : ''}
            ${!isContact && !isPartenariat ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td width="30%" align="center" style="padding:14px 8px;background:#f7f3ef;border-radius:10px;">
                  <div style="font-size:20px;margin-bottom:5px;">⚡</div><div style="font-size:12px;font-weight:bold;">Reponse sous 24h</div>
                </td>
                <td width="5%"></td>
                <td width="30%" align="center" style="padding:14px 8px;background:#f7f3ef;border-radius:10px;">
                  <div style="font-size:20px;margin-bottom:5px;">🚚</div><div style="font-size:12px;font-weight:bold;">Livraison gratuite</div>
                </td>
                <td width="5%"></td>
                <td width="30%" align="center" style="padding:14px 8px;background:#f7f3ef;border-radius:10px;">
                  <div style="font-size:20px;margin-bottom:5px;">📍</div><div style="font-size:12px;font-weight:bold;">Concu en Vendee</div>
                </td>
              </tr>
            </table>` : ''}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="background:#fff5ec;border-left:4px solid ${couleur};padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#5C5C5C;line-height:1.6;">
                💡 Pour vos fichiers PAO, repondez a cet e-mail avec un lien <strong>WeTransfer</strong>.
              </td></tr>
            </table>
            ${suiviBtn}
            <p style="margin:24px 0 0;font-size:14px;color:#5C5C5C;line-height:1.6;">
                A tres vite,<br><strong style="color:#1a1a1a;">${nomBrand}</strong>
                ${isCI ? '<br><span style="color:#aaa;font-size:12px;">Montreverd (85) - Vendee</span>' : ''}
            </p>`;

        if (d.email) {
            const client = getOuCreerClient(d.email, d.prenom || '', d.nom || '');
            client.telephone = client.telephone || d.tel || '';
            client.type_client = d.type_client || client.type_client || 'Particulier';
            client.mode_reglement = payeCB ? 'CB' : (d.mode_reglement || client.mode_reglement || 'CB');
            client.societe = client.societe || d.societe || '';
            client.siret = client.siret || d.siret || '';
            client.adresse = client.adresse || d.adresse || '';
            client.updated_at = new Date().toISOString();
            sauvegarderClient(client);
        }

        const transporter = createTransporter();
        const adminEmail  = process.env.ADMIN_EMAIL || 'michael@com-impression.fr';
        const attachments = allFiles.map(f => ({ filename: f.originalname, path: f.path }));
        const sujet = isCI
            ? `${isContact?'Contact':isPartenariat?'Partenariat':'Commande'} COM' Impression -- ${d.prenom||''} ${d.nom||''}`
            : `IMPRYLO -- ${d.nom||''}`;

        const pdfAttachments = attachments;

        await transporter.sendMail({
            from: `"${nomBrand} Web" <${process.env.SMTP_USER}>`,
            to: adminEmail, replyTo: d.email,
            subject: sujet, html: emailWrapper(contenuAdmin, couleur, nomBrand, lien, sousTitre),
            attachments: getBrandingAttachments(pdfAttachments)
        });

        if (d.email && d.email.includes('@')) {
            try {
                const sujetClient = isCI
                    ? (isContact ? "Votre message COM\' Impression est bien re\u00e7u" : isPartenariat ? "Votre demande de partenariat COM\' Impression est bien re\u00e7ue" : payeCB ? "\u2705 Commande pay\u00e9e par CB - COM\' Impression" : "\u2705 Votre commande COM\' Impression est enregistr\u00e9e")
                    : "Confirmation de votre demande - IMPRYLO";
                await transporter.sendMail({
                    from: `"${nomBrand}" <${process.env.SMTP_USER}>`,
                    to: d.email, subject: sujetClient,
                    html: emailWrapper(contenuClient, couleur, nomBrand, lien, sousTitre),
                     attachments: getBrandingAttachments((typeof pdfPath !== 'undefined' && pdfPath && !isContact && !isPartenariat) ? [{ filename: `Bon-de-commande-${numCmd}.pdf`, path: pdfPath }] : [])
                });
            } catch(e) { console.warn('Email client non envoye:', e.message); }
        }

        files.forEach(f => { try { fs.unlinkSync(f.path); } catch(e) {} });
        cartUploads.forEach(item => removeCartUpload(item.token));
        // Enregistrer dans le suivi de commandes (avec le même code que dans l'email)
        enregistrerCommande(d, panierTexte, prixTotal, numCmd, codeAcces);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Erreur /api/devis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/sumup/create-checkout — créer un checkout SumUp
app.post('/api/sumup/create-checkout', express.json(), async (req, res) => {
    try {
        if (!requireSumupConfigured(res)) return;
        const publicBaseUrl = getPublicBaseUrl(req);
        const amount = Number(req.body.amount || 0);
        const currency = String(req.body.currency || 'EUR').toUpperCase();
        const description = String(req.body.description || "Commande COM' Impression").trim();
        if (!amount || amount < 0.5) {
            return res.status(400).json({ success: false, error: 'Montant invalide (minimum 0,50 EUR).' });
        }
        const reference = 'CI-' + Date.now();
        const checkoutBody = {
            checkout_reference: reference,
            amount: Number(amount.toFixed(2)),
            currency,
            merchant_code: SUMUP_MERCHANT_CODE,
            description: description.slice(0, 120),
            return_url: `${publicBaseUrl}/panier?sumup_return=1`
        };
        const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + SUMUP_SECRET_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(checkoutBody)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error('Erreur SumUp create-checkout payload:', checkoutBody);
            console.error('Erreur SumUp create-checkout response:', payload);
            return res.status(response.status).json({
                success: false,
                error:
                    payload.message ||
                    payload.error_message ||
                    payload.error ||
                    payload.errors?.[0]?.message ||
                    payload.errors?.[0]?.error_message ||
                    JSON.stringify(payload.errors || payload) ||
                    'Impossible de creer le checkout SumUp.'
            });
        }
        res.json({
            success: true,
            checkoutId: payload.id,
            checkoutReference: payload.checkout_reference || reference,
            amount: payload.amount
        });
    } catch (error) {
        console.error('Erreur SumUp create-checkout:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/sumup/verify-checkout/:id — vérifier le statut d'un paiement SumUp
app.get('/api/sumup/verify-checkout/:id', async (req, res) => {
    try {
        if (!requireSumupConfigured(res)) return;
        const checkoutId = String(req.params.id || '').trim();
        if (!checkoutId) return res.status(400).json({ success: false, error: 'Checkout SumUp manquant.' });
        const response = await fetch('https://api.sumup.com/v0.1/checkouts/' + encodeURIComponent(checkoutId), {
            headers: {
                'Authorization': 'Bearer ' + SUMUP_SECRET_API_KEY
            }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: payload.message || payload.error_message || payload.error || 'Impossible de verifier le checkout SumUp.'
            });
        }
        const status = String(payload.status || '').toUpperCase();
        const paid = status === 'PAID' || status === 'SUCCEEDED';
        res.json({
            success: true,
            paid,
            status,
            checkout: payload
        });
    } catch (error) {
        console.error('Erreur SumUp verify-checkout:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/catalog-config', (req, res) => {
    try {
        res.json({ success: true, catalog: buildCatalogApiPayload() });
    } catch (error) {
        console.error('Erreur /api/catalog-config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/catalog-pricing', express.json(), (req, res) => {
    try {
        const body = req.body || {};
        const legacyCat = String(body.legacyCat || '');
        const productId = String(body.productId || '');
        const sels = body.selections && typeof body.selections === 'object' ? body.selections : {};
        const quantity = body.quantity == null ? '' : String(body.quantity);
        const width = body.width == null ? '' : String(body.width);
        const height = body.height == null ? '' : String(body.height);
        const resolved = resolveLegacyProduct(legacyCat, productId);
        if (!resolved) return res.status(404).json({ success: false, error: 'Produit introuvable' });
        const override = lireProductOverrides()[buildProductOverrideKey(legacyCat, productId)] || {};

        const quantityOptions = override.quantityOptions && override.quantityOptions.length
            ? override.quantityOptions.slice()
            : resolveQuantityOptions(resolved.ctx, resolved.prod, sels);
        const quantityValue = quantity || (quantityOptions[0] != null ? String(quantityOptions[0]) : '');
        let priceLabel = resolved.ctx.calcPrix(resolved.prod, sels, quantityValue, width, height);
        let numeric = parseEuroLabel(priceLabel);
        if (override.quantityPricing && override.quantityPricing.length) {
            const parsedQty = parseInt(quantityValue, 10);
            const parsedWidth = Number(width);
            const parsedHeight = Number(height);
            const tiers = normaliseQuantityPricing(override.quantityPricing);
            let chosen = null;
            if (!isNaN(parsedWidth) && parsedWidth > 0 && !isNaN(parsedHeight) && parsedHeight > 0) {
                const dimensionalTiers = tiers.filter(item => item.type === 'dimensions');
                if (dimensionalTiers.length) {
                    chosen = dimensionalTiers.find(item => item.width === parsedWidth && item.height === parsedHeight);
                    if (!chosen) {
                        chosen = dimensionalTiers.slice().sort((a, b) => {
                            const deltaA = Math.abs((a.width * a.height) - (parsedWidth * parsedHeight));
                            const deltaB = Math.abs((b.width * b.height) - (parsedWidth * parsedHeight));
                            return deltaA - deltaB;
                        })[0];
                    }
                }
            }
            if (!chosen) {
                const quantityTiers = tiers.filter(item => item.type !== 'dimensions');
                chosen = quantityTiers.find(item => item.quantity === parsedQty) || quantityTiers.find(item => item.quantity >= parsedQty) || quantityTiers[quantityTiers.length - 1];
            }
            if (chosen) {
                numeric = chosen.total;
                priceLabel = chosen.total.toFixed(2).replace('.', ',') + ' EUR';
            }
        } else if (override.priceLabel && numeric == null) {
            priceLabel = String(override.priceLabel).replace(/€/g, 'EUR');
            numeric = parseEuroLabel(priceLabel);
        }
        res.json({
            success: true,
            quantityOptions,
            priceLabel: String(priceLabel || 'Sur devis').replace(/€/g, 'EUR'),
            priceValue: numeric,
            quantityValue,
            width,
            height
        });
    } catch (error) {
        console.error('Erreur /api/catalog-pricing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/cart-upload', upload.single('fichier'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' });
        const token = CRYPTO.randomBytes(10).toString('hex');
        const ext = path.extname(req.file.originalname || '') || '';
        const finalPath = path.join(CART_UPLOADS_DIR, token + ext);
        try {
            fs.renameSync(req.file.path, finalPath);
        } catch (moveError) {
            if (moveError && moveError.code === 'EXDEV') {
                fs.copyFileSync(req.file.path, finalPath);
                fs.unlinkSync(req.file.path);
            } else {
                throw moveError;
            }
        }
        const meta = {
            token,
            originalname: req.file.originalname || ('fichier' + ext),
            mimetype: req.file.mimetype || '',
            path: finalPath,
            created_at: new Date().toISOString()
        };
        fs.writeFileSync(path.join(CART_UPLOADS_DIR, token + '.json'), JSON.stringify(meta, null, 2));
        res.json({ success: true, upload: { token, originalname: meta.originalname } });
    } catch (error) {
        console.error('Erreur /api/cart-upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/cart-upload/:token', (req, res) => {
    try {
        removeCartUpload(req.params.token);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'com-impression.html')); });
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/produits', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'produits.html')); });
app.get('/produit', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'produit.html')); });
app.get('/panier', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'panier.html')); });
app.get('/client', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'client.html')); });
app.get('/rendez-vous', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'rendez-vous.html')); });
app.get('/mentions-legales', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'mentions-legales.html')); });
app.get('/cgv', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'cgv.html')); });
app.get('/faq', (req, res) => { try { trackVisit(req); } catch(e) {} res.sendFile(path.join(__dirname, 'faq.html')); });
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/media/products/:filename', (req, res) => {
    const filename = path.basename(String(req.params.filename || ''));
    if (!filename) return res.status(404).end();
    const filePath = path.join(PRODUCT_IMAGES_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).end();
    res.sendFile(filePath);
});
app.get('/admin.js', (req, res) => res.sendFile(path.join(__dirname, 'admin.js')));
app.get('/com-impression.js', (req, res) => res.sendFile(path.join(__dirname, 'com-impression.js')));

// ── INCIDENT PUBLIC SITE ────────────────────────────────────────────────────
const INCIDENT_DATA_DIR = (() => {
    try { fs.mkdirSync('/var/data', { recursive: true }); return '/var/data'; }
    catch(e) { return '/tmp'; }
})();
const INCIDENT_FILE = path.join(INCIDENT_DATA_DIR, 'incident.json');
const SITE_CONFIG_FILE = path.join(INCIDENT_DATA_DIR, 'site-config.json');
const PRODUCT_OVERRIDES_FILE = path.join(INCIDENT_DATA_DIR, 'product-overrides.json');
const CUSTOM_PRODUCTS_FILE = path.join(INCIDENT_DATA_DIR, 'custom-products.json');
const VISITS_FILE = path.join(INCIDENT_DATA_DIR, 'visits.json');
const CART_UPLOADS_DIR = path.join(INCIDENT_DATA_DIR, 'cart-uploads');
const PRODUCT_IMAGES_DIR = path.join(INCIDENT_DATA_DIR, 'product-images');
try { fs.mkdirSync(CART_UPLOADS_DIR, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true }); } catch (e) {}

function buildProductRef(index) {
    return 'COM' + String(index).padStart(4, '0');
}

function buildProductOverrideKey(legacyCat, productId) {
    return String(legacyCat || '') + '::' + String(productId || '');
}

function lireProductOverrides() {
    try {
        return JSON.parse(fs.readFileSync(PRODUCT_OVERRIDES_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function sauvegarderProductOverrides(data) {
    fs.writeFileSync(PRODUCT_OVERRIDES_FILE, JSON.stringify(data || {}, null, 2));
}

function lireCustomProducts() {
    try {
        const data = JSON.parse(fs.readFileSync(CUSTOM_PRODUCTS_FILE, 'utf8'));
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

function sauvegarderCustomProducts(data) {
    fs.writeFileSync(CUSTOM_PRODUCTS_FILE, JSON.stringify(Array.isArray(data) ? data : [], null, 2));
}

function normaliseCsvList(value) {
    if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
    return String(value || '').split('\n').join(',').split(',').map(item => item.trim()).filter(Boolean);
}

function normaliseQuantityPricing(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => {
        const type = String(item.type || '').trim().toLowerCase() || 'lot';
        const quantity = parseInt(item.quantity, 10);
        const width = Number(item.width);
        const height = Number(item.height);
        const total = Number(item.total);
        const finish = String(item.finish || '').trim();
        const optionsLibres = normaliseFreeOptions(item.optionsLibres);
        return {
            type,
            quantity,
            width,
            height,
            finish,
            total,
            optionsLibres
        };
    }).filter(item => {
        if (isNaN(item.total) || item.total < 0) return false;
        if (item.type === 'dimensions') {
            return !isNaN(item.width) && item.width > 0 && !isNaN(item.height) && item.height > 0;
        }
        return !isNaN(item.quantity) && item.quantity > 0;
    });
}

function getProductImageUrl(filename) {
    const clean = String(filename || '').trim();
    if (!clean) return '';
    return '/media/products/' + encodeURIComponent(clean);
}

function storeUploadedFile(tempPath, finalPath) {
    try {
        fs.renameSync(tempPath, finalPath);
    } catch (error) {
        if (error && error.code === 'EXDEV') {
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
            return;
        }
        throw error;
    }
}

function lireVisits() {
    try {
        const data = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8'));
        return data && typeof data === 'object' ? data : { total: 0, byDay: {}, byPath: {} };
    } catch (e) {
        return { total: 0, byDay: {}, byPath: {} };
    }
}

function sauvegarderVisits(data) {
    fs.writeFileSync(VISITS_FILE, JSON.stringify(data || { total: 0, byDay: {}, byPath: {} }, null, 2));
}

function getVisitDayKey() {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function trackVisit(req) {
    let pathname = req.path || '/';
    const htmlAliases = {
        '/com-impression.html': '/',
        '/produits.html': '/produits',
        '/produit.html': '/produit',
        '/panier.html': '/panier',
        '/client.html': '/client',
        '/rendez-vous.html': '/rendez-vous',
        '/mentions-legales.html': '/mentions-legales',
        '/cgv.html': '/cgv',
        '/faq.html': '/faq'
    };
    pathname = htmlAliases[pathname] || pathname;
    if (req.method !== 'GET') return;
    if (pathname.startsWith('/api') || pathname.startsWith('/admin') || pathname.includes('.')) return;
    const tracked = ['/', '/produits', '/produit', '/panier', '/client', '/rendez-vous', '/mentions-legales', '/cgv', '/faq'];
    if (tracked.indexOf(pathname) === -1) return;
    const visits = lireVisits();
    const dayKey = getVisitDayKey();
    visits.total = Number(visits.total || 0) + 1;
    visits.byDay = visits.byDay || {};
    visits.byPath = visits.byPath || {};
    visits.byDay[dayKey] = Number(visits.byDay[dayKey] || 0) + 1;
    visits.byPath[pathname] = Number(visits.byPath[pathname] || 0) + 1;
    sauvegarderVisits(visits);
}

function applyOptionOverrides(optionMap, override) {
    const map = Object.assign({}, optionMap || {});
    const paperKey = Object.keys(map).find(key => /papier|grammage/i.test(key));
    const finishKey = Object.keys(map).find(key => /finit|pellic|vernis|soft/i.test(key));
    if (override.paperOptions && override.paperOptions.length) {
        map[paperKey || 'Papier'] = override.paperOptions.slice();
    }
    if (override.finishOptions && override.finishOptions.length) {
        map[finishKey || 'Finition'] = override.finishOptions.slice();
    }
    normaliseFreeOptions(override.freeOptions).forEach(option => {
        if (!map[option.nom]) map[option.nom] = [];
        if (!map[option.nom].includes(option.valeur)) map[option.nom].push(option.valeur);
    });
    return map;
}

function normaliseFreeOptions(value) {
    if (!Array.isArray(value)) return [];
    return value.map(option => ({
        nom: String((option && option.nom) || '').trim(),
        valeur: String((option && option.valeur) || '').trim()
    })).filter(option => option.nom && option.valeur);
}

function readCartUploadMeta(token) {
    try {
        const file = path.join(CART_UPLOADS_DIR, String(token || '') + '.json');
        if (!fs.existsSync(file)) return null;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return null;
    }
}

function removeCartUpload(token) {
    try {
        const metaPath = path.join(CART_UPLOADS_DIR, String(token || '') + '.json');
        const meta = readCartUploadMeta(token);
        if (meta && meta.path && fs.existsSync(meta.path)) fs.unlinkSync(meta.path);
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    } catch (e) {}
}

function resolveCartUploads(rawTokens) {
    let tokens = [];
    try {
        tokens = Array.isArray(rawTokens) ? rawTokens : JSON.parse(String(rawTokens || '[]'));
    } catch (e) {
        tokens = [];
    }
    return tokens.map(token => {
        const meta = readCartUploadMeta(token);
        if (!meta || !meta.path || !fs.existsSync(meta.path)) return null;
        return {
            token: token,
            path: meta.path,
            originalname: meta.originalname || 'fichier-client'
        };
    }).filter(Boolean);
}

function defaultSiteConfig() {
    return {
        topBanner: '',
        heroBadge: 'Communication visuelle qui vend mieux',
        heroLine1: 'Vos supports,',
        heroHighlight: 'vos gammes,',
        heroLine2: 'votre image.',
        heroSlogan: "Vos vraies gammes COM' Impression, reunies proprement",
        heroText: "Retrouvez vos gammes COM' Impression pour choisir rapidement le bon support, du print professionnel aux produits personnalises.",
        heroImage: '',
        heroPanelTitle: "COM' Impression",
        heroPanelText: 'Un acces simple a vos gammes, votre compte et votre panier.',
        heroPanelItems: [
            'Recherche rapide',
            'Compte client',
            'Panier simple'
        ],
        productsTitle: "Tout ce qu'il faut pour",
        productsAccent: 'communiquer',
        productsSubtitle: 'Des supports print de qualité, pour tous vos projets pro ou perso.',
        seasonalProductIds: ['fairepart-a5', 'fairepart-a6', 'carte-invit', 'menu-evt-carte'],
        updated_at: ''
    };
}

function normaliserSiteConfig(raw) {
    const base = defaultSiteConfig();
    const ids = Array.isArray(raw && raw.seasonalProductIds)
        ? raw.seasonalProductIds
        : String((raw && raw.seasonalProductIds) || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    const panelItems = Array.isArray(raw && raw.heroPanelItems)
        ? raw.heroPanelItems.map(item => String(item || '').trim()).filter(Boolean)
        : String((raw && raw.heroPanelItems) || '')
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
    return {
        topBanner: (raw && raw.topBanner) || base.topBanner,
        heroBadge: (raw && raw.heroBadge) || base.heroBadge,
        heroLine1: (raw && raw.heroLine1) || base.heroLine1,
        heroHighlight: (raw && raw.heroHighlight) || base.heroHighlight,
        heroLine2: (raw && raw.heroLine2) || base.heroLine2,
        heroSlogan: (raw && raw.heroSlogan) || base.heroSlogan,
        heroText: (raw && raw.heroText) || base.heroText,
        heroImage: (raw && raw.heroImage) || base.heroImage,
        heroPanelTitle: (raw && raw.heroPanelTitle) || base.heroPanelTitle,
        heroPanelText: (raw && raw.heroPanelText) || base.heroPanelText,
        heroPanelItems: panelItems.length ? panelItems : base.heroPanelItems.slice(),
        productsTitle: (raw && raw.productsTitle) || base.productsTitle,
        productsAccent: (raw && raw.productsAccent) || base.productsAccent,
        productsSubtitle: (raw && raw.productsSubtitle) || base.productsSubtitle,
        seasonalProductIds: ids.length ? ids : base.seasonalProductIds.slice(),
        updated_at: (raw && raw.updated_at) || ''
    };
}

app.use((req, res, next) => {
    try { trackVisit(req); } catch (e) {}
    next();
});

function lireSiteConfig() {
    try {
        if (fs.existsSync(SITE_CONFIG_FILE)) {
            return normaliserSiteConfig(JSON.parse(fs.readFileSync(SITE_CONFIG_FILE, 'utf8')));
        }
    } catch(e) {
        console.error('Erreur lecture site-config:', e.message);
    }
    return normaliserSiteConfig({});
}

function sauvegarderSiteConfig(config) {
    const payload = normaliserSiteConfig(config);
    payload.updated_at = new Date().toISOString();
    fs.writeFileSync(SITE_CONFIG_FILE, JSON.stringify(payload, null, 2));
    return payload;
}

function lireIncident() {
    try {
        if (fs.existsSync(INCIDENT_FILE)) {
            const raw = JSON.parse(fs.readFileSync(INCIDENT_FILE, 'utf8'));
            return {
                active: !!raw.active,
                title: raw.title || '',
                message: raw.message || '',
                updated_at: raw.updated_at || ''
            };
        }
    } catch(e) {
        console.error('Erreur lecture incident:', e.message);
    }
    return { active: false, title: '', message: '', updated_at: '' };
}

function sauvegarderIncident(incident) {
    const payload = {
        active: !!incident.active,
        title: incident.title || '',
        message: incident.message || '',
        updated_at: incident.updated_at || new Date().toISOString()
    };
    fs.writeFileSync(INCIDENT_FILE, JSON.stringify(payload, null, 2));
    return payload;
}

app.get('/api/incident', (req, res) => {
    res.json({ success: true, incident: lireIncident() });
});

app.post('/api/incident', express.json(), (req, res) => {
    const { mdp, active, title, message } = req.body || {};
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });

    try {
        const incident = sauvegarderIncident({
            active: !!active,
            title: title || '',
            message: message || '',
            updated_at: new Date().toISOString()
        });
        res.json({ success: true, incident });
    } catch(e) {
        console.error('Erreur sauvegarde incident:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/site-config', (req, res) => {
    res.json({ success: true, config: lireSiteConfig() });
});

app.get('/api/admin/catalog', (req, res) => {
    const mdp = req.query.mdp;
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    try {
        res.json({ success: true, catalog: buildCatalogApiPayload(), overrides: lireProductOverrides() });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/admin/daily-summary', (req, res) => {
    const mdp = req.query.mdp;
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    try {
        const commandes = lireCommandes();
        const visits = lireVisits();
        const catalog = buildCatalogApiPayload();
        const productIndex = {};
        (catalog.gammes || []).forEach(gamme => {
            (gamme.products || []).forEach(product => {
                productIndex[String(product.ref || '').toUpperCase()] = {
                    ref: String(product.ref || '').toUpperCase(),
                    gamme: gamme.title,
                    title: product.title,
                    purchasePrice: product.purchasePrice == null ? null : Number(product.purchasePrice),
                    salePrice: product.salePrice == null ? null : Number(product.salePrice)
                };
            });
        });

        const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '').trim())
            ? String(req.query.date || '').trim()
            : getVisitDayKey();
        const todayOrders = commandes.filter(cmd => String(cmd.created_at || '').slice(0, 10) === requestedDate);
        const byGamme = {};
        let dayTotal = 0;
        let dayMargin = 0;

        todayOrders.forEach(cmd => {
            const rows = deriveRowsForStats(cmd);
            if (!rows.length) {
                const amount = parseEuroLabel(cmd.prix_total) || 0;
                dayTotal += amount;
                byGamme['Non classee'] = byGamme['Non classee'] || { gamme: 'Non classee', total: 0, orders: 0, margin: 0 };
                byGamme['Non classee'].total += amount;
                byGamme['Non classee'].orders += 1;
                return;
            }
            rows.forEach(row => {
                const ref = String(row.ref || '').toUpperCase();
                const product = productIndex[ref] || null;
                const gamme = row.gamme || (product && product.gamme) || 'Non classee';
                const total = Number(row.total || 0);
                let margin = 0;
                if (product && product.purchasePrice != null) {
                    if (product.salePrice && product.salePrice > 0 && total > 0) {
                        margin = total - (product.purchasePrice * (total / product.salePrice));
                    } else {
                        margin = total - product.purchasePrice;
                    }
                }
                dayTotal += total;
                dayMargin += margin;
                if (!byGamme[gamme]) byGamme[gamme] = { gamme, total: 0, orders: 0, margin: 0 };
                byGamme[gamme].total += total;
                byGamme[gamme].orders += 1;
                byGamme[gamme].margin += margin;
            });
        });

        res.json({
            success: true,
            summary: {
                day: requestedDate,
                orders: todayOrders.length,
                total: Math.round(dayTotal * 100) / 100,
                margin: Math.round(dayMargin * 100) / 100,
                visitsToday: Number((visits.byDay || {})[requestedDate] || 0),
                visitsTotal: Number(visits.total || 0),
                byGamme: Object.values(byGamme).sort((a, b) => b.total - a.total).map(item => ({
                    gamme: item.gamme,
                    total: Math.round(item.total * 100) / 100,
                    orders: item.orders,
                    margin: Math.round(item.margin * 100) / 100
                }))
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/site-config', express.json(), (req, res) => {
    const body = req.body || {};
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(body.mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    try {
        const config = sauvegarderSiteConfig(body);
        res.json({ success: true, config });
    } catch(e) {
        console.error('Erreur sauvegarde site-config:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/products/:legacyCat/:productId', express.json(), (req, res) => {
    const body = req.body || {};
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(body.mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    try {
        const overrides = lireProductOverrides();
        const key = buildProductOverrideKey(req.params.legacyCat, req.params.productId);
        const next = {
            title: String(body.title || '').trim(),
            summary: String(body.summary || '').trim(),
            priceLabel: String(body.priceLabel || '').trim(),
            priceValue: body.priceValue == null || body.priceValue === '' ? null : Number(body.priceValue),
            purchasePrice: body.purchasePrice == null || body.purchasePrice === '' ? null : Number(body.purchasePrice),
            salePrice: body.salePrice == null || body.salePrice === '' ? null : Number(body.salePrice),
            image: String(body.image || '').trim(),
            quantityOptions: normaliseCsvList(body.quantityOptions).map(value => parseInt(value, 10)).filter(value => !isNaN(value) && value > 0),
            paperOptions: normaliseCsvList(body.paperOptions),
            finishOptions: normaliseCsvList(body.finishOptions),
            freeOptions: normaliseFreeOptions(body.freeOptions),
            uploadEnabled: body.uploadEnabled !== false,
            quantityPricing: normaliseQuantityPricing(Array.isArray(body.quantityPricing) ? body.quantityPricing : [])
        };
        overrides[key] = next;
        sauvegarderProductOverrides(overrides);
        res.json({ success: true, override: next });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/products', express.json(), (req, res) => {
    const body = req.body || {};
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(body.mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    try {
        const legacyCat = String(body.legacyCat || '').trim();
        const title = String(body.title || '').trim();
        if (!legacyCat) return res.status(400).json({ success: false, error: 'Gamme obligatoire' });
        if (!title) return res.status(400).json({ success: false, error: 'Nom du produit obligatoire' });
        const customProducts = lireCustomProducts();
        const id = slugifyLegacyLabel(title) || ('produit-' + Date.now());
        if (customProducts.some(item => item.legacyCat === legacyCat && item.id === id)) {
            return res.status(409).json({ success: false, error: 'Un produit avec ce nom existe deja dans cette gamme' });
        }
        const product = {
            legacyCat,
            id,
            title,
            summary: String(body.summary || '').trim(),
            priceLabel: String(body.priceLabel || 'Sur devis').trim(),
            priceValue: body.priceValue == null || body.priceValue === '' ? null : Number(body.priceValue),
            purchasePrice: body.purchasePrice == null || body.purchasePrice === '' ? null : Number(body.purchasePrice),
            salePrice: body.salePrice == null || body.salePrice === '' ? null : Number(body.salePrice),
            image: String(body.image || '').trim(),
            quantityOptions: normaliseCsvList(body.quantityOptions),
            paperOptions: normaliseCsvList(body.paperOptions),
            finishOptions: normaliseCsvList(body.finishOptions),
            freeOptions: normaliseFreeOptions(body.freeOptions),
            quantityPricing: normaliseQuantityPricing(Array.isArray(body.quantityPricing) ? body.quantityPricing : []),
            uploadEnabled: body.uploadEnabled !== false,
            requiresQuantityInput: !!body.requiresQuantityInput,
            hasDimensions: !!body.hasDimensions,
            minWidth: Number(body.minWidth) || 1,
            minHeight: Number(body.minHeight) || 1,
            unit: String(body.unit || '').trim(),
            created_at: new Date().toISOString()
        };
        customProducts.push(product);
        sauvegarderCustomProducts(customProducts);
        res.json({ success: true, product });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/admin/product-image', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'admin-product-image' }), upload.single('image'), (req, res) => {
    try {
        const mdp = String((req.body && req.body.mdp) || '');
        if (!requireAdminPasswordConfigured(res)) return;
        if (!adminPasswordMatches(mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
        if (!req.file) return res.status(400).json({ success: false, error: 'Image produit manquante.' });
        const ext = (path.extname(req.file.originalname || '') || '.png').toLowerCase();
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
        const filename = 'product-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + safeExt;
        const finalPath = path.join(PRODUCT_IMAGES_DIR, filename);
        storeUploadedFile(req.file.path, finalPath);
        res.json({ success: true, image: filename, imageUrl: getProductImageUrl(filename) });
    } catch (e) {
        console.error('Erreur upload image produit:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/suivi/:numero — suivi public client
app.get('/api/suivi/:numero', (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, error: 'Code manquant' });

    const commandes = lireCommandes();
    const cmd = commandes.find(c => c.numero === req.params.numero);

    if (!cmd) return res.status(404).json({ success: false, error: 'Commande introuvable' });
    if (cmd.code_acces !== code) return res.status(401).json({ success: false, error: 'Code incorrect' });

    // Retourner uniquement les infos publiques (pas les notes internes)
    res.json({
        success: true,
        commande: {
            numero:      cmd.numero,
            date:        cmd.date,
            prenom:      cmd.prenom,
            panier:      cmd.panier,
            prix_total:  cmd.prix_total,
            statut:      cmd.statut,
            updated_at:  cmd.updated_at || cmd.created_at
        }
    });
});

// ── AVIS CLIENTS ────────────────────────────────────────────────────────────
const AVIS_FILE = path.join(INCIDENT_DATA_DIR, 'avis.json');
function lireAvis(){try{return JSON.parse(fs.readFileSync(AVIS_FILE,'utf8'));}catch(e){return [];}}
function sauvegarderAvis(a){try{fs.writeFileSync(AVIS_FILE,JSON.stringify(a,null,2));}catch(e){}}

app.post('/api/avis', upload.none(), async(req,res)=>{
    try{
        const d=req.body;
        const prenom = (d.prenom || d.nom || '').trim();
        if(!prenom||!d.texte||!d.note) return res.status(400).json({success:false,error:'Champs manquants'});
        const avis=lireAvis();
        avis.push({id:Date.now(),prenom:prenom,ville:d.ville||'',produit:d.produit||'',texte:d.texte||'',note:parseInt(d.note)||5,date:new Date().toLocaleDateString('fr-FR'),valide:false});
        sauvegarderAvis(avis);
        try{const transporter=createTransporter();await transporter.sendMail({from:`"COM' Impression" <${process.env.SMTP_USER}>`,to:process.env.ADMIN_EMAIL||'michael@com-impression.fr',subject:`⭐ Nouvel avis — ${prenom} (${d.note}/5)`,html:`<p><strong>${prenom}${d.ville?' — '+d.ville:''}</strong><br>${d.texte}</p>`});}catch(e){}
        res.json({success:true});
    }catch(e){res.status(500).json({success:false,error:e.message});}
});

app.get('/api/avis',(req,res)=>{
    res.json({success:true,avis:lireAvis().filter(a=>a.valide).reverse()});
});

app.post('/api/avis/:id/valider', express.json(), rateLimit({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'admin-avis-approve' }), (req,res)=>{
    if (!requireAdminPasswordConfigured(res)) return;
    if(!adminPasswordMatches((req.body || {}).mdp)) return res.status(403).json({success:false});
    const avis=lireAvis(); const idx=avis.findIndex(a=>a.id===parseInt(req.params.id));
    if(idx<0) return res.status(404).json({success:false});
    avis[idx].valide=true; sauvegarderAvis(avis); res.json({success:true});
});

// GET /api/avis/pending — tous les avis en attente (admin)
app.get('/api/avis/pending', (req, res) => {
    const {mdp} = req.query;
    if (!requireAdminPasswordConfigured(res)) return;
    if(!adminPasswordMatches(mdp)) return res.status(403).json({success:false});
    res.json({success:true, avis: lireAvis().filter(a => !a.valide)});
});

app.delete('/api/avis/:id', express.json(), rateLimit({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'admin-avis-delete' }), (req,res)=>{
    if (!requireAdminPasswordConfigured(res)) return;
    if(!adminPasswordMatches((req.body || {}).mdp)) return res.status(403).json({success:false});
    sauvegarderAvis(lireAvis().filter(a=>a.id!==parseInt(req.params.id)));
    res.json({success:true});
});


// ══════════════════════════════════════════════════════════════════════════════
// ESPACE CLIENT — Auth par lien magique + Carte de fidélité
// ══════════════════════════════════════════════════════════════════════════════

const CLIENTS_FILE  = path.join(INCIDENT_DATA_DIR, 'clients.json');
const TOKENS_FILE   = path.join(INCIDENT_DATA_DIR, 'tokens.json');
const CRYPTO        = require('crypto');

function lireClients()  { try { return JSON.parse(fs.readFileSync(CLIENTS_FILE,'utf8')); } catch(e) { return []; } }
function sauvegarderClients(d) { try { fs.writeFileSync(CLIENTS_FILE, JSON.stringify(d,null,2)); } catch(e) {} }
function lireTokens()   { try { return JSON.parse(fs.readFileSync(TOKENS_FILE,'utf8')); } catch(e) { return []; } }
function sauvegarderTokens(d) { try { fs.writeFileSync(TOKENS_FILE, JSON.stringify(d,null,2)); } catch(e) {} }
function normaliserEmail(email) { return String(email || '').trim().toLowerCase(); }
const CLIENT_ACTION_TOKEN_SECRET =
    process.env.CLIENT_TOKEN_SECRET ||
    process.env.SMTP_PASS ||
    process.env.SUMUP_SECRET_API_KEY ||
    'com-impression-v4-client-secret';
function signerClientActionToken(type, email, ttlMs) {
    const payload = {
        type: String(type || ''),
        email: normaliserEmail(email),
        exp: Date.now() + ttlMs
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = CRYPTO.createHmac('sha256', CLIENT_ACTION_TOKEN_SECRET).update(body).digest('base64url');
    return `${body}.${sig}`;
}
function verifierSignatureClientToken(token, expectedType) {
    try {
        const parts = String(token || '').split('.');
        if (parts.length !== 2) return null;
        const body = parts[0];
        const sig = parts[1];
        const expectedSig = CRYPTO.createHmac('sha256', CLIENT_ACTION_TOKEN_SECRET).update(body).digest('base64url');
        const sigOk = CRYPTO.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
        if (!sigOk) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (!payload || payload.type !== expectedType) return null;
        if (!payload.email || !payload.exp || payload.exp <= Date.now()) return null;
        payload.email = normaliserEmail(payload.email);
        return payload;
    } catch(e) {
        return null;
    }
}
function hashPassword(password, salt) {
    const s = salt || CRYPTO.randomBytes(16).toString('hex');
    const h = CRYPTO.pbkdf2Sync(String(password), s, 120000, 32, 'sha256').toString('hex');
    return `${s}:${h}`;
}
function verifierPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    const test = hashPassword(password, salt).split(':')[1];
    try { return CRYPTO.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex')); }
    catch(e) { return false; }
}
function creerSessionClient(email) {
    const sessionToken = CRYPTO.randomBytes(32).toString('hex');
    const tokens = lireTokens().filter(t => t.expire > Date.now());
    tokens.push({ token: sessionToken, email, expire: Date.now()+24*3600*1000, type:'session' });
    sauvegarderTokens(tokens);
    return sessionToken;
}

// Trouver ou créer un client par email
function getOuCreerClient(email, prenom='', nom='') {
    email = normaliserEmail(email);
    const clients = lireClients();
    let client = clients.find(c => c.email === email);
    if (!client) {
        client = {
            id:        CRYPTO.randomBytes(8).toString('hex'),
            email,
            prenom:    prenom || '',
            nom:       nom    || '',
            points:    0,
            historique_points: [],
            codes_promo:       [],
            adresse:   '',
            cp:        '',
            ville:     '',
            email_verified: false,
            created_at: new Date().toISOString()
        };
        clients.push(client);
        sauvegarderClients(clients);
        console.log('Nouveau client créé:', email);
    } else {
        client.prenom = client.prenom || prenom || '';
        client.nom = client.nom || nom || '';
        client.points = client.points || 0;
        client.historique_points = client.historique_points || [];
        client.codes_promo = client.codes_promo || [];
        client.adresse = client.adresse || '';
        client.cp = client.cp || '';
        client.ville = client.ville || '';
    }
    return client;
}

function sauvegarderClient(client) {
    const clients = lireClients();
    const idx = clients.findIndex(c => c.id === client.id);
    if (idx >= 0) clients[idx] = client;
    else clients.push(client);
    sauvegarderClients(clients);
}

// Paliers de fidélité
const PALIERS = [
    { seuil: 100,  remise: 5,  code_prefix: 'FID5'  },
    { seuil: 250,  remise: 15, code_prefix: 'FID15' },
    { seuil: 500,  remise: 35, code_prefix: 'FID35' },
];

function ajouterPoints(email, montant, numCommande, prenom='', nom='') {
    const pts = Math.floor(parseFloat(String(montant).replace(',','.').replace(' €','').replace('€','')) || 0);
    if (pts <= 0) return null;
    const client = getOuCreerClient(email, prenom, nom);
    const avant = client.points;
    client.points += pts;
    client.historique_points.push({
        date:        new Date().toLocaleDateString('fr-FR'),
        commande:    numCommande,
        points:      pts,
        total:       client.points
    });
    // Vérifier si un palier est débloqué
    let codeGenere = null;
    for (const palier of PALIERS) {
        if (avant < palier.seuil && client.points >= palier.seuil) {
            const code = palier.code_prefix + '-' + CRYPTO.randomBytes(3).toString('hex').toUpperCase();
            client.codes_promo.push({ code, remise: palier.remise, utilise: false, date: new Date().toLocaleDateString('fr-FR') });
            codeGenere = { code, remise: palier.remise };
            console.log(`Palier ${palier.seuil} pts débloqué pour ${email}: ${code}`);
        }
    }
    sauvegarderClient(client);
    return { client, pts, codeGenere };
}

// ── AUTH — Lien magique ────────────────────────────────────────────────────
// POST /api/client/register — création de compte sécurisé
app.post('/api/client/register', express.json(), rateLimit({ windowMs: 30 * 60 * 1000, max: 10, prefix: 'client-register' }), async (req, res) => {
    try {
        const publicBaseUrl = getPublicBaseUrl(req);
        const email = normaliserEmail(req.body.email);
        const password = String(req.body.password || '');
        const prenom = String(req.body.prenom || '').trim();
        const nom = String(req.body.nom || '').trim();
        if (!email || !email.includes('@')) return res.status(400).json({ success:false, error:'Email invalide' });
        if (!prenom || !nom) return res.status(400).json({ success:false, error:'Prénom et nom obligatoires' });
        if (password.length < 8) return res.status(400).json({ success:false, error:'Mot de passe trop court' });

        const clients = lireClients();
        let client = clients.find(c => c.email === email);
        if (client && client.password_hash) return res.status(409).json({ success:false, error:'Un compte existe déjà avec cet email' });
        if (!client) {
            client = {
                id: CRYPTO.randomBytes(8).toString('hex'),
                email,
                points: 0,
                historique_points: [],
                codes_promo: [],
                created_at: new Date().toISOString()
            };
            clients.push(client);
        }
        client.prenom = prenom;
        client.nom = nom;
        client.type_client = String(req.body.type_client || 'Particulier').trim() || 'Particulier';
        client.societe = String(req.body.societe || '').trim();
        client.siret = String(req.body.siret || '').trim();
        client.telephone = String(req.body.telephone || '').trim();
        client.adresse = String(req.body.adresse || '').trim();
        client.cp = String(req.body.cp || '').trim();
        client.ville = String(req.body.ville || '').trim();
        client.password_hash = hashPassword(password);
        client.email_verified = false;
        client.updated_at = new Date().toISOString();
        sauvegarderClients(clients);

        const token = signerClientActionToken('verify-client', email, 30*60*1000);
        const lien = `${publicBaseUrl}/client?verify_client_token=${token}`;
        try {
            const t = createTransporter();
            await t.sendMail({
                from: `"COM' Impression" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Confirmation de création de votre compte COM' Impression",
                html: emailWrapper(`
                    <h2 style="color:#F47B20;margin:0 0 12px;">Bienvenue ${prenom} !</h2>
                    <p style="color:#555;font-size:15px;line-height:1.6;">Votre compte client COM' Impression a bien été créé. Cliquez sur le bouton ci-dessous pour confirmer votre email et accéder à votre espace client.</p>
                    <div style="text-align:center;margin:28px 0;">
                        <a href="${lien}" style="display:inline-block;max-width:320px;background:#F47B20;color:#fff;padding:14px 26px;border-radius:50px;font-weight:700;text-decoration:none;font-size:15px;line-height:1.3;box-shadow:0 4px 0 #D4621A;">Confirmer mon compte</a>
                    </div>
                    <p style="color:#aaa;font-size:12px;text-align:center;">Ce lien est valable 30 minutes.</p>
                `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)'),
                attachments: getBrandingAttachments()
            });
        } catch(e) { console.warn('Email confirmation compte non envoyé:', e.message); }

        res.json({ success:true, requires_email_confirmation:true, client: safeClient(client) });
    } catch(e) {
        console.error('Erreur register client:', e);
        res.status(500).json({ success:false, error:e.message });
    }
});

// POST /api/client/password-login — connexion email + mot de passe
app.post('/api/client/password-login', express.json(), rateLimit({ windowMs: 15 * 60 * 1000, max: 8, prefix: 'client-password-login' }), (req, res) => {
    const email = normaliserEmail(req.body.email);
    const password = String(req.body.password || '');
    const client = lireClients().find(c => c.email === email);
    if (!client || !verifierPassword(password, client.password_hash)) {
        return res.status(401).json({ success:false, error:'Email ou mot de passe incorrect' });
    }
    if (!client.email_verified) {
        return res.status(403).json({ success:false, error:'Veuillez confirmer votre compte via le mail reçu avant de vous connecter' });
    }
    const sessionToken = creerSessionClient(email);
    setClientSessionCookie(req, res, sessionToken);
    res.json({ success:true, session_token: sessionToken, client: safeClient(client) });
});

// POST /api/client/forgot-password — demande de réinitialisation
app.post('/api/client/forgot-password', express.json(), rateLimit({ windowMs: 30 * 60 * 1000, max: 6, prefix: 'client-forgot-password' }), async (req, res) => {
    const publicBaseUrl = getPublicBaseUrl(req);
    const email = normaliserEmail(req.body.email);
    if (!email || !email.includes('@')) return res.status(400).json({ success:false, error:'Email invalide' });
    const client = lireClients().find(c => c.email === email);
    if (client && client.password_hash) {
        const token = signerClientActionToken('reset-password', email, 30*60*1000);
        const lien = `${publicBaseUrl}/client?reset_client_token=${token}`;
        try {
            const t = createTransporter();
            await t.sendMail({
                from: `"COM' Impression" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Réinitialisation de votre mot de passe COM' Impression",
                html: emailWrapper(`
                    <h2 style="color:#F47B20;margin:0 0 12px;">Réinitialisation de mot de passe</h2>
                    <p style="color:#555;font-size:15px;line-height:1.6;">Bonjour <strong>${client.prenom || 'cher client'}</strong>,<br><br>Une demande de nouveau mot de passe a été faite pour votre compte COM' Impression.</p>
                    <div style="text-align:center;margin:28px 0;">
                        <a href="${lien}" style="display:inline-block;max-width:320px;background:#F47B20;color:#fff;padding:14px 26px;border-radius:50px;font-weight:700;text-decoration:none;font-size:15px;line-height:1.3;box-shadow:0 4px 0 #D4621A;">Choisir un nouveau mot de passe</a>
                    </div>
                    <p style="color:#aaa;font-size:12px;text-align:center;">Ce lien est valable 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
                `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)'),
                attachments: getBrandingAttachments()
            });
        } catch(e) { console.warn('Email reset non envoyé:', e.message); }
    }
    res.json({ success:true });
});

// POST /api/client/reset-password — valider un nouveau mot de passe
app.post('/api/client/reset-password', express.json(), rateLimit({ windowMs: 30 * 60 * 1000, max: 8, prefix: 'client-reset-password' }), (req, res) => {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (password.length < 8) return res.status(400).json({ success:false, error:'Mot de passe trop court' });
    let email = '';
    const signedEntry = verifierSignatureClientToken(token, 'reset-password');
    if (signedEntry) {
        email = signedEntry.email;
    } else {
        const tokens = lireTokens();
        const entry = tokens.find(t => t.token === token && t.expire > Date.now() && t.type === 'reset-password');
        if (!entry) return res.status(401).json({ success:false, error:'Lien expiré ou invalide' });
        email = normaliserEmail(entry.email);
        sauvegarderTokens(tokens.filter(t => t.token !== token));
    }
    const clients = lireClients();
    const idx = clients.findIndex(c => c.email === email);
    if (idx < 0) return res.status(404).json({ success:false, error:'Compte introuvable' });
    clients[idx].password_hash = hashPassword(password);
    clients[idx].updated_at = new Date().toISOString();
    sauvegarderClients(clients);
    const sessionToken = creerSessionClient(email);
    setClientSessionCookie(req, res, sessionToken);
    res.json({ success:true, session_token: sessionToken, client: safeClient(clients[idx]) });
});

// POST /api/client/login — demander un lien magique
app.post('/api/client/login', express.json(), rateLimit({ windowMs: 30 * 60 * 1000, max: 6, prefix: 'client-magic-login' }), async (req, res) => {
    const publicBaseUrl = getPublicBaseUrl(req);
    const email = normaliserEmail(req.body.email);
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Email invalide' });
    const client = lireClients().find(c => c.email === email);
    if (client && !client.email_verified) {
        return res.status(403).json({ success: false, error: 'Veuillez confirmer votre compte via le mail reçu avant de demander un lien magique.' });
    }

    // Générer token
    const token  = signerClientActionToken('magic-login', email, 30*60*1000);
    const lienMagique = `${publicBaseUrl}/client?client_token=${token}`;
    try {
        const t = createTransporter();
        await t.sendMail({
            from:    `"COM' Impression" <${process.env.SMTP_USER}>`,
            to:      email,
            subject: "🔐 Votre lien de connexion — COM' Impression",
            html:    emailWrapper(`
                <h2 style="color:#F47B20;margin:0 0 12px;">Connexion à votre espace client</h2>
                <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px;">
                    Cliquez sur le bouton ci-dessous pour accéder à votre espace client.<br>
                    <strong>Ce lien est valable 30 minutes.</strong>
                </p>
                <div style="text-align:center;margin:28px 0;">
                    <a href="${lienMagique}" style="background:#F47B20;color:#fff;padding:14px 32px;border-radius:50px;font-weight:700;text-decoration:none;font-size:16px;box-shadow:0 4px 0 #D4621A;">
                        🔐 Accéder à mon espace
                    </a>
                </div>
                <p style="color:#aaa;font-size:12px;text-align:center;">Si vous n'avez pas demandé ce lien, ignorez cet email.</p>
            `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)'),
            attachments: getBrandingAttachments()
        });
        res.json({ success: true });
    } catch(e) {
        console.error('Email magic link err:', e.message);
        res.status(500).json({ success: false, error: 'Erreur envoi email' });
    }
});

// GET /api/client/verify?token=xxx — confirmer l'email du client
app.get('/api/client/verify', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, error: 'Token manquant' });
    const publicBaseUrl = getPublicBaseUrl(req);
    const siteHomeUrl = publicBaseUrl.replace(/\/$/, '') + '/';
    let email = '';
    const signedEntry = verifierSignatureClientToken(token, 'verify-client');
    if (signedEntry) {
        email = signedEntry.email;
    } else {
        const tokens = lireTokens();
        const entry = tokens.find(t => t.token === token && t.expire > Date.now() && t.type === 'verify-client');
        if (!entry) return res.status(401).json({ success: false, error: 'Lien expiré ou invalide' });
        email = normaliserEmail(entry.email);
        sauvegarderTokens(tokens.filter(t => t.token !== token));
    }

    const client = getOuCreerClient(email);
    client.email_verified = true;
    client.updated_at = new Date().toISOString();
    sauvegarderClient(client);
    const welcomeName = client.prenom || 'chez COM\' Impression';

    Promise.resolve()
        .then(async () => {
            try {
                const t = createTransporter();
                await t.sendMail({
                    from: `"COM' Impression" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: "Bienvenue chez COM' Impression",
                    html: emailWrapper(`
                        <h2 style="color:#F47B20;margin:0 0 12px;">Bienvenue ${welcomeName} !</h2>
                        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 16px;">
                            Votre compte est maintenant bien valide.
                        </p>
                        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 22px;">
                            Venez decouvrir sur notre site toutes nos gammes d'impression, nos services, vos rendez-vous, vos devis et le suivi de vos commandes.
                        </p>
                        <div style="text-align:center;margin:28px 0;">
                            <a href="${siteHomeUrl}" style="display:inline-block;max-width:320px;background:#F47B20;color:#fff;padding:14px 26px;border-radius:50px;font-weight:700;text-decoration:none;font-size:15px;line-height:1.3;box-shadow:0 4px 0 #D4621A;">Decouvrir le site</a>
                        </div>
                        <p style="color:#888;font-size:13px;text-align:center;margin:0;">COM' Impression vous accompagne pour vos impressions, supports personnalises et demandes sur mesure.</p>
                    `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)'),
                    attachments: getBrandingAttachments()
                });
            } catch(e) {
                console.warn('Email bienvenue client non envoyé:', e.message);
            }
        });

    const sessionToken = creerSessionClient(email);
    setClientSessionCookie(req, res, sessionToken);
    res.json({ success: true, session_token: sessionToken, client: safeClient(client) });
});

// GET /api/client/auth?token=xxx — valider le token
app.get('/api/client/auth', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false });
    const signedEntry = verifierSignatureClientToken(token, 'magic-login');
    if (signedEntry) {
        const client = getOuCreerClient(signedEntry.email);
        if (!client.email_verified) {
            return res.status(403).json({ success: false, error: 'Veuillez confirmer votre compte via le mail reçu avant de vous connecter.' });
        }
        const sessionToken = creerSessionClient(signedEntry.email);
        setClientSessionCookie(req, res, sessionToken);
        return res.json({ success: true, session_token: sessionToken, client: safeClient(client) });
    }
    const tokens = lireTokens();
    const entry  = tokens.find(t => t.token === token && t.expire > Date.now());
    if (!entry) return res.status(401).json({ success: false, error: 'Lien expiré ou invalide' });
    if (entry.type === 'verify-client') {
        return res.status(400).json({ success: false, error: 'Utilisez le lien de confirmation du compte reçu par email.' });
    }
    const client = getOuCreerClient(entry.email);
    if (!client.email_verified) {
        return res.status(403).json({ success: false, error: 'Veuillez confirmer votre compte via le mail reçu avant de vous connecter.' });
    }
    const sessionToken = creerSessionClient(entry.email);
    sauvegarderTokens(tokens.filter(t => t.token !== token));
    setClientSessionCookie(req, res, sessionToken);
    res.json({ success: true, session_token: sessionToken, client: safeClient(client) });
});

// Middleware auth session
function authClient(req, res, next) {
    const cookies = readCookies(req);
    const token = req.headers['x-session-token'] || cookies.ci_session || req.query.session_token;
    if (!token) return res.status(401).json({ success: false, error: 'Non connecté' });
    const sessions = lireTokens();
    const session  = sessions.find(t => t.token === token && t.expire > Date.now() && t.type === 'session');
    if (!session) return res.status(401).json({ success: false, error: 'Session expirée' });
    req.clientEmail = session.email;
    next();
}

app.post('/api/client/logout', authClient, (req, res) => {
    const token = req.headers['x-session-token'] || readCookies(req).ci_session || req.query.session_token;
    const sessions = lireTokens().filter(item => !(item.type === 'session' && item.token === token));
    sauvegarderTokens(sessions);
    clearClientSessionCookie(req, res);
    res.json({ success: true });
});

function safeClient(c) {
    return { id:c.id, email:c.email, prenom:c.prenom, nom:c.nom,
             adresse:c.adresse||'', cp:c.cp||'', ville:c.ville||'',
             telephone:c.telephone||c.tel||'',
             type_client:c.type_client||'Particulier',
             mode_reglement:c.mode_reglement||'CB',
             societe:c.societe||'',
             siret:c.siret||'',
             email_verified: !!c.email_verified,
             points:c.points, historique_points:c.historique_points||[],
             codes_promo:c.codes_promo||[] };
}

// GET /api/client/me — profil + points
app.get('/api/client/me', authClient, (req, res) => {
    const client = lireClients().find(c => c.email === req.clientEmail);
    if (!client) return res.status(404).json({ success: false });
    // Commandes du client
    const commandes = lireCommandes().filter(c =>
        c.email === req.clientEmail
    ).map(c => ({
        id: c.id, numero: c.numero, date: c.date, panier: c.panier,
        prix_total: c.prix_total, statut: c.statut,
        lignes: c.lignes || [],
        documents: c.documents || [],
        date_livraison: c.date_livraison || ''
    }));
    res.json({ success: true, client: safeClient(client), commandes });
});

app.get('/api/admin/clients', (req, res) => {
    const mdp = req.query.mdp;
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    const commandes = lireCommandes();
    const clients = lireClients().map(client => {
        const clientCommandes = commandes.filter(cmd => normaliserEmail(cmd.email) === normaliserEmail(client.email));
        return Object.assign({}, safeClient(client), {
            commandes_count: clientCommandes.length,
            commandes_total: clientCommandes.reduce((sum, cmd) => sum + (parseEuroLabel(cmd.prix_total) || 0), 0)
        });
    });
    res.json({ success: true, clients });
});

app.post('/api/admin/clients/:id', express.json(), (req, res) => {
    const body = req.body || {};
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(body.mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    const clients = lireClients();
    const idx = clients.findIndex(client => String(client.id) === String(req.params.id));
    if (idx < 0) return res.status(404).json({ success: false, error: 'Client introuvable' });
    ['prenom', 'nom', 'adresse', 'cp', 'ville', 'societe', 'siret'].forEach(key => {
        if (body[key] !== undefined) clients[idx][key] = String(body[key] || '').trim();
    });
    if (body.telephone !== undefined) clients[idx].telephone = String(body.telephone || '').trim();
    if (body.type_client !== undefined) clients[idx].type_client = String(body.type_client || 'Particulier').trim();
    if (body.mode_reglement !== undefined) clients[idx].mode_reglement = String(body.mode_reglement || 'CB').trim();
    clients[idx].updated_at = new Date().toISOString();
    sauvegarderClients(clients);
    res.json({ success: true, client: safeClient(clients[idx]) });
});

app.post('/api/admin/clients', express.json(), (req, res) => {
    const body = req.body || {};
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(body.mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    const email = normaliserEmail(body.email);
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Email invalide' });
    const clients = lireClients();
    if (clients.some(client => normaliserEmail(client.email) === email)) {
        return res.status(409).json({ success: false, error: 'Un client existe deja avec cet email' });
    }
    const client = {
        id: CRYPTO.randomBytes(8).toString('hex'),
        email,
        prenom: String(body.prenom || '').trim(),
        nom: String(body.nom || '').trim(),
        adresse: String(body.adresse || '').trim(),
        cp: String(body.cp || '').trim(),
        ville: String(body.ville || '').trim(),
        telephone: String(body.telephone || '').trim(),
        type_client: String(body.type_client || 'Particulier').trim() || 'Particulier',
        mode_reglement: String(body.mode_reglement || 'CB').trim() || 'CB',
        societe: String(body.societe || '').trim(),
        siret: String(body.siret || '').trim(),
        email_verified: false,
        points: 0,
        historique_points: [],
        codes_promo: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    clients.push(client);
    sauvegarderClients(clients);
    res.json({ success: true, client: safeClient(client) });
});

// POST /api/client/profile — mettre à jour les informations client
app.post('/api/client/profile', authClient, express.json(), (req, res) => {
    const clients = lireClients();
    const idx = clients.findIndex(c => c.email === req.clientEmail);
    if (idx < 0) return res.status(404).json({ success:false, error:'Compte introuvable' });
    ['prenom','nom','adresse','cp','ville'].forEach(k => {
        if (req.body[k] !== undefined) clients[idx][k] = String(req.body[k] || '').trim();
    });
    clients[idx].updated_at = new Date().toISOString();
    sauvegarderClients(clients);
    res.json({ success:true, client: safeClient(clients[idx]) });
});

// POST /api/client/code-promo — utiliser un code promo
app.post('/api/client/code-promo', authClient, express.json(), (req, res) => {
    const { code } = req.body;
    const clients = lireClients();
    const client  = clients.find(c => c.email === req.clientEmail);
    if (!client) return res.status(404).json({ success: false });
    const promo = (client.codes_promo||[]).find(p => p.code === code && !p.utilise);
    if (!promo) return res.status(400).json({ success: false, error: 'Code invalide ou déjà utilisé' });
    promo.utilise = true;
    sauvegarderClient(client);
    res.json({ success: true, remise: promo.remise });
});

// ── Ajouter points automatiquement à chaque commande ─────────────────────
// (appelé depuis /api/devis après enregistrement)


// ── DOCUMENTS CLIENT (dépôt admin) ──────────────────────────────────────────
const DOCS_DIR = path.join(INCIDENT_DATA_DIR, 'documents');
if (!fs.existsSync(DOCS_DIR)) { try { fs.mkdirSync(DOCS_DIR, { recursive:true }); } catch(e){} }
const MANUAL_DOC_DIRS = {
    devis: path.join(DOCS_DIR, 'devis'),
    commande: path.join(DOCS_DIR, 'commande'),
    facture: path.join(DOCS_DIR, 'facture')
};
Object.values(MANUAL_DOC_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive:true }); } catch (e) {}
    }
});

const uploadDoc = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, DOCS_DIR),
        filename: (req, file, cb) => {
            const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_');
            cb(null, `${req.params.id}_${Date.now()}_${safe}`);
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 }
});

// POST /api/commandes/:id/document — déposer un PDF sur une commande (admin)
app.post('/api/commandes/:id/document', rateLimit({ windowMs: 15 * 60 * 1000, max: 25, prefix: 'admin-order-document' }), uploadDoc.single('document'), async (req, res) => {
    const publicBaseUrl = getPublicBaseUrl(req);
    const { mdp } = req.body;
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(mdp)) return res.status(403).json({ success:false, error:'Non autorisé' });
    if (!req.file) return res.status(400).json({ success:false, error:'Fichier manquant' });

    const commandes = lireCommandes();
    const idx = commandes.findIndex(c => c.id === req.params.id || c.numero === req.params.id);
    if (idx < 0) return res.status(404).json({ success:false, error:'Commande introuvable' });

    const cmd = commandes[idx];
    const doc = {
        id:       Date.now(),
        nom:      req.body.nom_doc || req.file.originalname,
        fichier:  req.file.filename,
        type:     req.body.type_doc || 'Document', // Devis | Facture | Bon de commande | Autre
        date:     new Date().toLocaleDateString('fr-FR'),
        notif:    req.body.notif === 'true' // Notifier le client par email ?
    };

    if (!cmd.documents) cmd.documents = [];
    cmd.documents.push(doc);
    sauvegarderCommandes(commandes);

    // Email de notification au client si demandé
    if (doc.notif && cmd.email) {
        try {
            const t = createTransporter();
            const lienEspace = `${publicBaseUrl}/client`;
            await t.sendMail({
                from: `"COM' Impression" <${process.env.SMTP_USER}>`,
                to:   cmd.email,
                subject: `📄 ${doc.type} disponible — Commande ${cmd.numero}`,
                html: emailWrapper(`
                    <h2 style="color:#F47B20;margin:0 0 12px;">📄 ${doc.type} disponible</h2>
                    <p style="color:#555;font-size:15px;line-height:1.6;">
                        Bonjour <strong>${cmd.prenom||''}</strong>,<br><br>
                        Votre <strong>${doc.type}</strong> pour la commande <strong>${cmd.numero}</strong> est disponible dans votre espace client.
                    </p>
                    <div style="text-align:center;margin:24px 0;">
                        <a href="${lienEspace}" style="background:#F47B20;color:#fff;padding:12px 28px;border-radius:50px;font-weight:700;text-decoration:none;font-size:15px;box-shadow:0 4px 0 #D4621A;">
                            👤 Accéder à mon espace
                        </a>
                    </div>
                `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)'),
                attachments: getBrandingAttachments()
            });
        } catch(e) { console.warn('Notif doc err:', e.message); }
    }

    res.json({ success:true, doc });
});

// GET /api/commandes/:id/document/:docId — télécharger un document (client authentifié)
app.get('/api/commandes/:id/document/:docId', authClient, (req, res) => {
    const commandes = lireCommandes();
    const cmd = commandes.find(c => (c.id === req.params.id || c.numero === req.params.id) && c.email === req.clientEmail);
    if (!cmd) return res.status(403).json({ success:false });
    const doc = (cmd.documents||[]).find(d => String(d.id) === req.params.docId);
    if (!doc) return res.status(404).json({ success:false });
    const filePath = path.join(DOCS_DIR, doc.fichier);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success:false });
    res.download(filePath, doc.nom.endsWith('.pdf') ? doc.nom : doc.nom+'.pdf');
});

// GET /api/admin/commandes/:id/document/:docId — télécharger (admin)
app.get('/api/admin/commandes/:id/document/:docId', (req, res) => {
    if (!ADMIN_PASSWORD) return res.status(503).send('Mot de passe admin non configure');
    if (!adminPasswordMatches(req.query.mdp)) return res.status(403).send('Non autorisé');
    const commandes = lireCommandes();
    const cmd = commandes.find(c => c.id === req.params.id || c.numero === req.params.id);
    if (!cmd) return res.status(404).send('Commande introuvable');
    const doc = (cmd.documents||[]).find(d => String(d.id) === req.params.docId);
    if (!doc) return res.status(404).send('Document introuvable');
    const filePath = path.join(DOCS_DIR, doc.fichier);
    if (!fs.existsSync(filePath)) return res.status(404).send('Fichier introuvable');
    res.download(filePath, doc.nom.endsWith('.pdf') ? doc.nom : doc.nom+'.pdf');
});

app.listen(process.env.PORT || 3000, () => console.log(`Serveur demarre sur le port ${process.env.PORT || 3000}`));

// ============================================================
// SUIVI DE COMMANDES
// Stockage JSON dans /tmp/commandes.json (Render ephemeral)
// Pour production : remplacer par une base de données (Supabase, etc.)
// ============================================================

// Chemin dynamique : /var/data si disque persistant Render, sinon /tmp
const DATA_DIR = INCIDENT_DATA_DIR;
const COMMANDES_FILE = DATA_DIR + '/commandes.json';
const ADMIN_PWD_SUIVI = ADMIN_PASSWORD;

// POST /api/admin/check — valider le mot de passe admin avant ouverture du dashboard
app.post('/api/admin/check', express.json(), rateLimit({ windowMs: 15 * 60 * 1000, max: 8, prefix: 'admin-check' }), (req, res) => {
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches((req.body || {}).mdp)) {
        return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
    }
    res.json({ success: true });
});

function lireCommandes() {
    try {
        if (fs.existsSync(COMMANDES_FILE)) {
            return JSON.parse(fs.readFileSync(COMMANDES_FILE, 'utf8'));
        }
    } catch(e) { console.error('Erreur lecture commandes:', e.message); }
    return [];
}

function sauvegarderCommandes(commandes) {
    try {
        fs.writeFileSync(COMMANDES_FILE, JSON.stringify(commandes, null, 2));
        return true;
    } catch(e) { console.error('Erreur sauvegarde commandes:', e.message); return false; }
}

function genererCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code; // ex: K7X2-P9QM
}

function genererNumero() {
    const date = new Date();
    const annee = date.getFullYear();
    const commandes = lireCommandes();
    const num = String(commandes.length + 1).padStart(4, '0');
    return `CI-${annee}-${num}`;
}

function formatDate(d) {
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function escapePdfText(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapPdfText(value, maxChars) {
    const words = String(value || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach(word => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxChars && current) {
            lines.push(current);
            current = word;
        } else {
            current = next;
        }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [''];
}

function buildSimplePdfBuffer(definition) {
    const commands = [];
    let y = 800;
    function line(text, options) {
        const opts = Object.assign({ x: 48, size: 11, font: 'F1', gap: 16 }, options || {});
        commands.push(`BT /${opts.font} ${opts.size} Tf 1 0 0 1 ${opts.x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
        y -= opts.gap;
    }
    line("COM' Impression", { font: 'F2', size: 20, gap: 28 });
    line(definition.title || 'Document', { font: 'F2', size: 18, gap: 24 });
    line(`Numero : ${definition.numero || '--'}`, { size: 12, gap: 18 });
    line(`Date : ${definition.date || formatDate(new Date())}`, { size: 12, gap: 18 });
    y -= 6;
    line('Client', { font: 'F2', size: 13, gap: 18 });
    (definition.clientLines || []).forEach(text => line(text, { size: 11, gap: 16 }));
    y -= 6;
    line('Produits', { font: 'F2', size: 13, gap: 18 });
    (definition.productLines || []).forEach(text => {
        wrapPdfText(text, 88).forEach(chunk => line(chunk, { size: 11, gap: 16 }));
    });
    y -= 6;
    if (definition.total) line(`Total TTC : ${definition.total}`, { font: 'F2', size: 13, gap: 18 });
    if (definition.deliveryDate) line(`Livraison souhaitee : ${definition.deliveryDate}`, { size: 11, gap: 16 });
    y -= 12;
    line('COM\' Impression — michael@com-impression.fr — 07 43 69 56 41', { size: 10, gap: 14 });

    const stream = commands.join('\n');
    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >> endobj',
        `4 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream\nendobj`,
        '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
        '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj'
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach(obj => {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += `${obj}\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
}

function buildManualDocumentMeta(type) {
    const clean = String(type || 'commande').trim().toLowerCase();
    if (clean === 'devis') return { key: 'devis', label: 'Devis' };
    if (clean === 'facture') return { key: 'facture', label: 'Facture' };
    return { key: 'commande', label: 'Commande' };
}

// POST /api/commandes/manuelle — créer une commande depuis l'espace admin
app.post('/api/commandes/manuelle', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, prefix: 'admin-manual-order' }), upload.array('fichiers', 20), (req, res) => {
    const d = req.body || {};
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(d.mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    if (!d.panier) return res.status(400).json({ success: false, error: 'Detail commande manquant' });
    try {
        const commandes = lireCommandes();
        const numero = genererNumero();
        const docType = buildManualDocumentMeta(d.doc_type);
        let lignes = [];
        try { lignes = JSON.parse(d.lignes || '[]'); } catch(e) { lignes = []; }
        lignes = (Array.isArray(lignes) ? lignes : []).map(row => {
            const cleanRow = row && typeof row === 'object' ? row : {};
            const optionsLibres = Array.isArray(cleanRow.optionsLibres) ? cleanRow.optionsLibres : [];
            return {
                produit: String(cleanRow.produit || ''),
                qte: String(cleanRow.qte || ''),
                montant: String(cleanRow.montant || ''),
                fichier: String(cleanRow.fichier || ''),
                optionsLibres: optionsLibres.map(option => ({
                    nom: String((option && option.nom) || ''),
                    valeur: String((option && option.valeur) || '')
                })).filter(option => option.nom.trim() || option.valeur.trim())
            };
        });
        const files = req.files || [];
        const documents = files.map((f, index) => {
            const safe = f.originalname.replace(/[^a-zA-Z0-9._-]/g,'_');
            const stored = `${numero}_${Date.now()}_${index}_${safe}`;
            const dest = path.join(DOCS_DIR, stored);
            try { fs.copyFileSync(f.path, dest); } catch(e) {}
            try { fs.unlinkSync(f.path); } catch(e) {}
            return {
                id: Date.now() + index,
                nom: f.originalname,
                fichier: stored,
                type: 'Fichier client',
                date: new Date().toLocaleDateString('fr-FR'),
                notif: false
            };
        });
        const pdfName = `${docType.label}-${numero}.pdf`;
        const pdfStored = path.join(docType.key, `${numero}_${Date.now()}_${docType.key}.pdf`);
        const pdfPath = path.join(DOCS_DIR, pdfStored);
        const pdfBuffer = buildSimplePdfBuffer({
            title: docType.label,
            numero,
            date: formatDate(new Date()),
            clientLines: [
                `${d.prenom || ''} ${d.nom || ''}`.trim() || 'Client',
                d.email || '--',
                d.tel || '--',
                d.type_client ? `Profil : ${d.type_client}` : '',
                d.siret ? `SIRET / structure : ${d.siret}` : ''
            ].filter(Boolean),
            productLines: lignes.map(row => {
                const optionText = (row.optionsLibres || []).map(option => {
                    return `${option.nom || 'Option'} : ${option.valeur || '--'}`;
                }).join(' | ');
                return [
                    row.produit || 'Produit',
                    row.qte ? `Qté : ${row.qte}` : '',
                    row.montant ? `Montant : ${row.montant}` : '',
                    row.fichier ? `Fichier : ${row.fichier}` : '',
                    optionText ? `Options : ${optionText}` : ''
                ].filter(Boolean).join(' — ');
            }),
            total: d.prix_total || '--',
            deliveryDate: d.date_livraison || ''
        });
        fs.writeFileSync(pdfPath, pdfBuffer);
        documents.unshift({
            id: Date.now() - 1,
            nom: pdfName,
            fichier: pdfStored,
            type: docType.label,
            date: new Date().toLocaleDateString('fr-FR'),
            notif: false
        });
        const cmd = {
            id:          numero,
            numero,
            date:        formatDate(new Date()),
            type_document: docType.key,
            type_document_label: docType.label,
            prenom:      d.prenom || '',
            nom:         d.nom || '',
            email:       d.email || '',
            tel:         d.tel || '',
            type_client: d.type_client || 'Particulier',
            siret:       d.siret || '',
            panier:      d.panier || '',
            panier_json: d.panier_json || '',
            lignes:      lignes,
            prix_total:  d.prix_total || '--',
            date_livraison: d.date_livraison || '',
            remise:      d.remise || '',
            code_acces:  genererCode(),
            statut:      'Recue',
            notes:       'Commande creee manuellement depuis l admin.',
            documents:   documents,
            created_at:  new Date().toISOString()
        };
        commandes.push(cmd);
        sauvegarderCommandes(commandes);
        res.json({ success: true, numero: cmd.numero, commande: cmd, typeLabel: docType.label, docName: pdfName });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Enregistrer chaque pré-commande COM'Impression automatiquement
// (hook appelé depuis /api/devis après succès)
function enregistrerCommande(d, panierTexte, prixTotal, numCmdFourni, codeFourni) {
    if ((d.source || '').toLowerCase() !== 'com-impression') return;
    const panierLow = (panierTexte || '').toLowerCase();
    if (panierLow.startsWith('contact') || panierLow.startsWith('partenariat')) return;
    try {
        const commandes = lireCommandes();
        const cmd = {
            id:          numCmdFourni || genererNumero(),
            numero:      numCmdFourni || genererNumero(),
            date:        formatDate(new Date()),
            prenom:      d.prenom || '',
            nom:         d.nom || '',
            email:       d.email || '',
            tel:         d.tel || '',
            type_client: d.type_client || 'Particulier',
            siret:       d.siret || '',
            panier:      panierTexte || '',
            panier_json: d.panier_json || '',
            prix_total:  prixTotal || '--',
            code_acces:  codeFourni || genererCode(),
            statut:      'Recue',
            notes:       '',
            created_at:  new Date().toISOString()
        };
        // Numéro déjà fourni depuis /api/devis
        commandes.push(cmd);
        sauvegarderCommandes(commandes);
        console.log('Commande enregistree:', cmd.numero);
    } catch(e) { console.error('Erreur enregistrement commande:', e.message); }
}

// GET /api/commandes — liste toutes les commandes (admin)
app.get('/api/commandes', rateLimit({ windowMs: 15 * 60 * 1000, max: 40, prefix: 'admin-orders-list' }), (req, res) => {
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(req.query.mdp)) {
        return res.status(401).json({ success: false, error: 'Non autorise' });
    }
    const commandes = lireCommandes();
    res.json({ success: true, commandes: commandes.reverse() }); // plus récentes en premier
});

// POST /api/commandes/:id/statut — changer le statut + email client
app.post('/api/commandes/:id/statut', express.json(), rateLimit({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'admin-order-status' }), async (req, res) => {
    const { statut, mdp } = req.body;
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });
    const publicBaseUrl = getPublicBaseUrl(req);

    const commandes = lireCommandes();
    const idx = commandes.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Commande introuvable' });

    const ancienStatut = commandes[idx].statut;
    commandes[idx].statut = statut;
    commandes[idx].updated_at = new Date().toISOString();
    sauvegarderCommandes(commandes);

    // Email automatique au client si statut change
    const cmd = commandes[idx];
    const STATUTS_LABELS = {
        'Recue':         'Commande bien re\u00e7ue',
        'BAT envoye':    'Votre BAT est pr\u00eat \u00e0 valider',
        'BAT fichier a revoir': 'BAT à revoir',
        'BAT valide':    'BAT valid\u00e9 \u2014 en production',
        'En production': 'Votre commande est en cours de production',
        'En cours de livraison': 'Votre commande est en cours de livraison',
        'Expediee':      'Votre commande est exp\u00e9di\u00e9e !',
        'Annulee':       'Commande annul\u00e9e'
    };
    const STATUTS_MSG = {
        'Recue':         'Nous avons bien re\u00e7u votre commande et allons la traiter rapidement.',
        'BAT envoye':    'Votre bon \u00e0 tirer (BAT) vous a \u00e9t\u00e9 envoy\u00e9 par email. Merci de le valider pour lancer la production.',
        'BAT fichier a revoir': 'Nous avons besoin d\'une correction sur votre BAT ou vos fichiers avant de lancer la production. Merci de revenir vers nous avec les ajustements demandés.',
        'BAT valide':    'Votre BAT a \u00e9t\u00e9 valid\u00e9. Votre commande part en production dans les plus brefs d\u00e9lais.',
        'En production': 'Votre commande est actuellement en cours de fabrication. Livraison pr\u00e9vue sous J+3.',
        'En cours de livraison': 'Votre commande a quitt\u00e9 notre atelier et est actuellement en cours de livraison.',
        'Expediee':      'Votre commande a \u00e9t\u00e9 exp\u00e9di\u00e9e ! Vous recevrez votre colis sous 24-48h.',
        'Annulee':       'Votre commande a \u00e9t\u00e9 annul\u00e9e. N\'h\u00e9sitez pas \u00e0 nous contacter pour plus d\'informations.'
    };

    if (cmd.email && statut !== ancienStatut && statut !== 'Recue') {
        try {
            const transporter = createTransporter();
            const factureAttach = [];
            const accentColor = statut === 'Annulee' ? '#d9553f' : (statut === 'BAT fichier a revoir' ? '#d97706' : '#F47B20');
            const contenu = `
                <div style="display:inline-block;padding:7px 14px;border-radius:999px;background:#fff3e6;color:${accentColor};font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px;">Mise à jour commande</div>
                <h2 style="color:#171310;font-size:28px;line-height:1.15;margin:0 0 14px;">${STATUTS_LABELS[statut] || statut}</h2>
                <p style="color:#5C5C5C;font-size:15px;line-height:1.75;margin:0 0 22px;">
                    Bonjour <strong>${cmd.prenom || cmd.nom || 'cher client'}</strong>,<br><br>
                    ${STATUTS_MSG[statut] || 'Le statut de votre commande a ete mis a jour.'}
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ef;border:1px solid #efd8c0;border-radius:18px;padding:16px 18px;margin:18px 0 22px;">
                    <tr><td style="font-size:14px;padding:5px 0;"><span style="color:#8c827b;width:140px;display:inline-block;">Commande</span><strong>${cmd.numero}</strong></td></tr>
                    <tr><td style="font-size:14px;padding:5px 0;"><span style="color:#8c827b;width:140px;display:inline-block;">Statut</span><strong style="color:${accentColor};">${STATUTS_LABELS[statut] || statut}</strong></td></tr>
                    <tr><td style="font-size:14px;padding:5px 0;"><span style="color:#8c827b;width:140px;display:inline-block;">Montant</span><strong>${escapeHtml(cmd.prix_total || '--')}</strong></td></tr>
                </table>
                <div style="text-align:center;margin:24px 0 26px;">
                    <a href="${publicBaseUrl}/client" style="display:inline-block;background:${accentColor};color:#fff;text-decoration:none;padding:14px 30px;border-radius:999px;font-size:15px;font-weight:800;">Accéder à mon espace client</a>
                </div>
                <p style="font-size:14px;color:#5C5C5C;line-height:1.7;margin-top:20px;">
                    Pour toute question : <a href="mailto:michael@com-impression.fr" style="color:#F47B20;">michael@com-impression.fr</a><br>
                    ou au <strong>07 43 69 56 41</strong>
                </p>`;

            await transporter.sendMail({
                from: `"COM' Impression" <${process.env.SMTP_USER}>`,
                to: cmd.email,
                subject: `Commande ${cmd.numero} — ${STATUTS_LABELS[statut] || statut}`,
                html: emailWrapper(contenu, accentColor, "COM' Impression", publicBaseUrl, 'Montreverd (85) - Vendee'),
                attachments: getBrandingAttachments(factureAttach)
            });
            console.log('Email statut envoye a', cmd.email);
        } catch(e) { console.warn('Email statut non envoye:', e.message); }
    }

    res.json({ success: true, commande: commandes[idx] });
});

// POST /api/commandes/:id/notes — sauvegarder notes internes
app.post('/api/commandes/:id/notes', express.json(), (req, res) => {
    const { notes, mdp } = req.body;
    if (!requireAdminPasswordConfigured(res)) return;
    if (!adminPasswordMatches(mdp)) return res.status(401).json({ success: false, error: 'Non autorise' });

    const commandes = lireCommandes();
    const idx = commandes.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Commande introuvable' });

    commandes[idx].notes = notes;
    commandes[idx].updated_at = new Date().toISOString();
    sauvegarderCommandes(commandes);

    res.json({ success: true });
});
