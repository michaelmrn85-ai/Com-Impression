const express    = require('express');
const path       = require('path');
const { execFile } = require('child_process');
// Stripe optionnel — ne bloque pas le démarrage si package absent
let stripeClient = null;
try {
    if (process.env.STRIPE_SECRET_KEY) {
        stripeClient = require('stripe')(process.env.STRIPE_SECRET_KEY);
        console.log('Stripe initialisé OK');
    } else {
        console.warn('STRIPE_SECRET_KEY non définie — paiements désactivés');
    }
} catch(e) {
    console.warn('Package stripe non installé — npm install stripe requis');
}
const cors       = require('cors');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const fs         = require('fs');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

const upload = multer({ dest: '/tmp/', limits: { fileSize: 70 * 1024 * 1024 } });

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

function emailWrapper(content, couleur, nomBrand, lien, sousTitre) {
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f3ef;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ef;padding:30px 10px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1);">
      <tr><td style="background:${couleur};padding:28px 32px;text-align:center;">
        <div style="display:inline-block;background:rgba(0,0,0,0.15);border-radius:12px;padding:10px 24px;margin-bottom:8px;">
          <span style="font-family:Arial,sans-serif;font-weight:900;font-size:28px;color:#fff;letter-spacing:-0.5px;">COM&apos;</span>
          <span style="font-family:Arial,sans-serif;font-weight:400;font-size:28px;color:rgba(255,255,255,0.9);letter-spacing:-0.5px;">Impression</span>
        </div>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.75);font-size:12px;font-family:Arial,sans-serif;">${sousTitre}</p>
      </td></tr>
      <tr><td style="padding:32px;">${content}</td></tr>
      <tr><td style="background:#1a1a1a;padding:20px 32px;text-align:center;">
        <p style="margin:0;color:rgba(255,255,255,.5);font-size:12px;">
          &copy; 2025 <a href="${lien}" style="color:${couleur};text-decoration:none;">${nomBrand}</a>
        </p>
        <p style="margin:6px 0 0;color:rgba(255,255,255,.3);font-size:11px;">Message automatique - merci de ne pas y repondre directement.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function blocClient(d, couleur) {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ef;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Nom</span><strong>${d.prenom||''} ${d.nom||''}</strong></td></tr>
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Email</span><a href="mailto:${d.email}" style="color:${couleur};font-weight:bold;">${d.email}</a></td></tr>
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Téléphone</span>${d.tel||'--'}</td></tr>
      ${d.adresse?`<tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Adresse</span>${d.adresse}</td></tr>`:''}
      <tr><td style="padding:4px 0;font-size:14px;"><span style="color:#888;width:120px;display:inline-block;">Profil</span>${d.type_client||'Particulier'}${d.siret?' -- SIRET : '+d.siret:''}</td></tr>
    </table>`;
}

function blocPanier(panierTexte, prixTotal, couleur, d) {
    const lignes = (panierTexte||'').split(/\n|\|/).filter(Boolean)
        .map(l => {
            const t = l.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;');
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
            <td align="right" style="font-size:22px;font-weight:900;color:${couleur};">${prixTotal}</td>
          </tr>
          ${(d.payment_status==='paye') ? `<tr><td colspan="2" style="padding-top:8px;border-top:1px solid #f5dcc8;margin-top:8px;">
            <span style="background:#22c55e;color:#fff;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:700;">✅ PAYÉ PAR CARTE BANCAIRE</span>
            ${d.payment_id ? `<span style="font-size:11px;color:#888;margin-left:8px;">Réf. Stripe : ${d.payment_id}</span>` : ''}
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
            ${blocFichiers(files, couleur)}
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
                  ${d.payment_id ? `<tr><td colspan="2" style="font-size:11px;color:#888;padding-top:6px;">Référence Stripe : ${d.payment_id}</td></tr>` : ''}
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

        const transporter = createTransporter();
        const adminEmail  = process.env.ADMIN_EMAIL || 'michael@com-impression.fr';
        const attachments = files.map(f => ({ filename: f.originalname, path: f.path }));
        const sujet = isCI
            ? `${isContact?'Contact':isPartenariat?'Partenariat':'Commande'} COM' Impression -- ${d.prenom||''} ${d.nom||''}`
            : `IMPRYLO -- ${d.nom||''}`;

        const pdfAttachments = attachments;

        await transporter.sendMail({
            from: `"${nomBrand} Web" <${process.env.SMTP_USER}>`,
            to: adminEmail, replyTo: d.email,
            subject: sujet, html: emailWrapper(contenuAdmin, couleur, nomBrand, lien, sousTitre),
            attachments: pdfAttachments
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
                     attachments: (typeof pdfPath !== 'undefined' && pdfPath && !isContact && !isPartenariat) ? [{ filename: `Bon-de-commande-${numCmd}.pdf`, path: pdfPath }] : []
                });
            } catch(e) { console.warn('Email client non envoye:', e.message); }
        }

        files.forEach(f => { try { fs.unlinkSync(f.path); } catch(e) {} });
        // Enregistrer dans le suivi de commandes (avec le même code que dans l'email)
        enregistrerCommande(d, panierTexte, prixTotal, numCmd, codeAcces);
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Erreur /api/devis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/create-payment-intent — créer un paiement Stripe
app.post('/api/create-payment-intent', express.json(), async (req, res) => {
    try {
        const { amount, currency, description } = req.body;
        console.log('PaymentIntent request — amount:', amount, 'currency:', currency);
        if (!amount || amount < 50) return res.status(400).json({ error: 'Montant invalide (min 0,50 EUR), reçu: ' + amount });
        if (!stripeClient) return res.status(503).json({ error: 'Stripe non configuré sur le serveur' });

        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: Math.round(amount),
            currency: currency || 'eur',
            description: description || 'Impression de document — COM Impression',
            metadata: { source: 'com-impression' }
        });

        console.log('PaymentIntent créé:', paymentIntent.id);
        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Erreur Stripe détaillée:', error.type, error.message);
        res.status(500).json({ error: error.message, type: error.type });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'com-impression.html')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.js', (req, res) => res.sendFile(path.join(__dirname, 'admin.js')));
app.get('/com-impression.js', (req, res) => res.sendFile(path.join(__dirname, 'com-impression.js')));

// ── INCIDENT PUBLIC SITE ────────────────────────────────────────────────────
const INCIDENT_DATA_DIR = (() => {
    try { fs.mkdirSync('/var/data', { recursive: true }); return '/var/data'; }
    catch(e) { return '/tmp'; }
})();
const INCIDENT_FILE = path.join(INCIDENT_DATA_DIR, 'incident.json');
const SITE_CONFIG_FILE = path.join(INCIDENT_DATA_DIR, 'site-config.json');

function defaultSiteConfig() {
    return {
        topBanner: '🎨 Imprimerie en ligne – Livraison gratuite sur toute la France',
        heroBadge: '🎨 Imprimerie en ligne – Livraison gratuite sur toute la France',
        heroLine1: "L'impression",
        heroHighlight: 'colorée',
        heroLine2: 'qui fait la différence !',
        heroSlogan: 'Saison des mariages & baptêmes — Invitations, plans de table, menus…',
        heroText: 'Cartes de visite, flyers, affiches, bâches et bien plus — conçus en Vendée, à Montreverd (85), livrés partout en France.',
        heroImage: '',
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
    return {
        topBanner: (raw && raw.topBanner) || base.topBanner,
        heroBadge: (raw && raw.heroBadge) || base.heroBadge,
        heroLine1: (raw && raw.heroLine1) || base.heroLine1,
        heroHighlight: (raw && raw.heroHighlight) || base.heroHighlight,
        heroLine2: (raw && raw.heroLine2) || base.heroLine2,
        heroSlogan: (raw && raw.heroSlogan) || base.heroSlogan,
        heroText: (raw && raw.heroText) || base.heroText,
        heroImage: (raw && raw.heroImage) || base.heroImage,
        productsTitle: (raw && raw.productsTitle) || base.productsTitle,
        productsAccent: (raw && raw.productsAccent) || base.productsAccent,
        productsSubtitle: (raw && raw.productsSubtitle) || base.productsSubtitle,
        seasonalProductIds: ids.length ? ids : base.seasonalProductIds.slice(),
        updated_at: (raw && raw.updated_at) || ''
    };
}

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
    const adminPwd = process.env.ADMIN_PWD || 'comimpression2025';
    if (mdp !== adminPwd) return res.status(401).json({ success: false, error: 'Non autorise' });

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

app.post('/api/admin/site-config', express.json(), (req, res) => {
    const adminPwd = process.env.ADMIN_PWD || 'comimpression2025';
    const body = req.body || {};
    if (body.mdp !== adminPwd) return res.status(401).json({ success: false, error: 'Non autorise' });
    try {
        const config = sauvegarderSiteConfig(body);
        res.json({ success: true, config });
    } catch(e) {
        console.error('Erreur sauvegarde site-config:', e.message);
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
const AVIS_FILE = '/var/data/avis.json';
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

app.post('/api/avis/:id/valider', express.json(), (req,res)=>{
    if(req.body.mdp!==process.env.ADMIN_PWD) return res.status(403).json({success:false});
    const avis=lireAvis(); const idx=avis.findIndex(a=>a.id===parseInt(req.params.id));
    if(idx<0) return res.status(404).json({success:false});
    avis[idx].valide=true; sauvegarderAvis(avis); res.json({success:true});
});

// GET /api/avis/pending — tous les avis en attente (admin)
app.get('/api/avis/pending', (req, res) => {
    const {mdp} = req.query;
    if(mdp !== process.env.ADMIN_PWD) return res.status(403).json({success:false});
    res.json({success:true, avis: lireAvis().filter(a => !a.valide)});
});

app.delete('/api/avis/:id', express.json(), (req,res)=>{
    if(req.body.mdp!==process.env.ADMIN_PWD) return res.status(403).json({success:false});
    sauvegarderAvis(lireAvis().filter(a=>a.id!==parseInt(req.params.id)));
    res.json({success:true});
});


// ══════════════════════════════════════════════════════════════════════════════
// ESPACE CLIENT — Auth par lien magique + Carte de fidélité
// ══════════════════════════════════════════════════════════════════════════════

const CLIENTS_FILE  = '/var/data/clients.json';
// Créer /var/data si inexistant (au cas où)
try { if(!fs.existsSync('/var/data')) fs.mkdirSync('/var/data', {recursive:true}); } catch(e) { console.warn('/var/data non accessible:', e.message); }
const TOKENS_FILE   = '/var/data/tokens.json';
const CRYPTO        = require('crypto');

function lireClients()  { try { return JSON.parse(fs.readFileSync(CLIENTS_FILE,'utf8')); } catch(e) { return []; } }
function sauvegarderClients(d) { try { fs.writeFileSync(CLIENTS_FILE, JSON.stringify(d,null,2)); } catch(e) {} }
function lireTokens()   { try { return JSON.parse(fs.readFileSync(TOKENS_FILE,'utf8')); } catch(e) { return []; } }
function sauvegarderTokens(d) { try { fs.writeFileSync(TOKENS_FILE, JSON.stringify(d,null,2)); } catch(e) {} }
function normaliserEmail(email) { return String(email || '').trim().toLowerCase(); }
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
app.post('/api/client/register', express.json(), async (req, res) => {
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
        client.adresse = String(req.body.adresse || '').trim();
        client.cp = String(req.body.cp || '').trim();
        client.ville = String(req.body.ville || '').trim();
        client.password_hash = hashPassword(password);
        client.email_verified = false;
        client.updated_at = new Date().toISOString();
        sauvegarderClients(clients);

        const token = CRYPTO.randomBytes(32).toString('hex');
        const tokens = lireTokens().filter(t => t.expire > Date.now());
        tokens.push({ token, email, expire: Date.now()+30*60*1000, type:'verify-client' });
        sauvegarderTokens(tokens);
        const lien = `${publicBaseUrl}?client_token=${token}`;
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
                `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)')
            });
        } catch(e) { console.warn('Email confirmation compte non envoyé:', e.message); }

        const sessionToken = creerSessionClient(email);
        res.json({ success:true, session_token: sessionToken, client: safeClient(client) });
    } catch(e) {
        console.error('Erreur register client:', e);
        res.status(500).json({ success:false, error:e.message });
    }
});

// POST /api/client/password-login — connexion email + mot de passe
app.post('/api/client/password-login', express.json(), (req, res) => {
    const email = normaliserEmail(req.body.email);
    const password = String(req.body.password || '');
    const client = lireClients().find(c => c.email === email);
    if (!client || !verifierPassword(password, client.password_hash)) {
        return res.status(401).json({ success:false, error:'Email ou mot de passe incorrect' });
    }
    const sessionToken = creerSessionClient(email);
    res.json({ success:true, session_token: sessionToken, client: safeClient(client) });
});

// POST /api/client/forgot-password — demande de réinitialisation
app.post('/api/client/forgot-password', express.json(), async (req, res) => {
    const publicBaseUrl = getPublicBaseUrl(req);
    const email = normaliserEmail(req.body.email);
    if (!email || !email.includes('@')) return res.status(400).json({ success:false, error:'Email invalide' });
    const client = lireClients().find(c => c.email === email);
    if (client && client.password_hash) {
        const token = CRYPTO.randomBytes(32).toString('hex');
        const tokens = lireTokens().filter(t => t.expire > Date.now());
        tokens.push({ token, email, expire: Date.now()+30*60*1000, type:'reset-password' });
        sauvegarderTokens(tokens);
        const lien = `${publicBaseUrl}?reset_client_token=${token}`;
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
                `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)')
            });
        } catch(e) { console.warn('Email reset non envoyé:', e.message); }
    }
    res.json({ success:true });
});

// POST /api/client/reset-password — valider un nouveau mot de passe
app.post('/api/client/reset-password', express.json(), (req, res) => {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (password.length < 8) return res.status(400).json({ success:false, error:'Mot de passe trop court' });
    const tokens = lireTokens();
    const entry = tokens.find(t => t.token === token && t.expire > Date.now() && t.type === 'reset-password');
    if (!entry) return res.status(401).json({ success:false, error:'Lien expiré ou invalide' });
    const clients = lireClients();
    const idx = clients.findIndex(c => c.email === entry.email);
    if (idx < 0) return res.status(404).json({ success:false, error:'Compte introuvable' });
    clients[idx].password_hash = hashPassword(password);
    clients[idx].updated_at = new Date().toISOString();
    sauvegarderClients(clients);
    sauvegarderTokens(tokens.filter(t => t.token !== token));
    const sessionToken = creerSessionClient(entry.email);
    res.json({ success:true, session_token: sessionToken, client: safeClient(clients[idx]) });
});

// POST /api/client/login — demander un lien magique
app.post('/api/client/login', express.json(), async (req, res) => {
    const publicBaseUrl = getPublicBaseUrl(req);
    const email = normaliserEmail(req.body.email);
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Email invalide' });

    // Générer token
    const token  = CRYPTO.randomBytes(32).toString('hex');
    const expire = new Date(Date.now() + 30*60*1000); // 30 min
    const tokens = lireTokens().filter(t => t.expire > Date.now()); // nettoyer expirés
    tokens.push({ token, email, expire: expire.getTime() });
    sauvegarderTokens(tokens);

    const lienMagique = `${publicBaseUrl}?client_token=${token}`;
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
            `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)')
        });
        res.json({ success: true });
    } catch(e) {
        console.error('Email magic link err:', e.message);
        res.status(500).json({ success: false, error: 'Erreur envoi email' });
    }
});

// GET /api/client/auth?token=xxx — valider le token
app.get('/api/client/auth', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false });
    const tokens = lireTokens();
    const entry  = tokens.find(t => t.token === token && t.expire > Date.now());
    if (!entry) return res.status(401).json({ success: false, error: 'Lien expiré ou invalide' });
    const sessionToken = creerSessionClient(entry.email);
    const client = getOuCreerClient(entry.email);
    if (entry.type === 'verify-client') {
        client.email_verified = true;
        client.updated_at = new Date().toISOString();
        sauvegarderClient(client);
    }
    sauvegarderTokens(lireTokens().filter(t => t.token !== token));
    res.json({ success: true, session_token: sessionToken, client: safeClient(client) });
});

// Middleware auth session
function authClient(req, res, next) {
    const token = req.headers['x-session-token'] || req.query.session_token;
    if (!token) return res.status(401).json({ success: false, error: 'Non connecté' });
    const sessions = lireTokens();
    const session  = sessions.find(t => t.token === token && t.expire > Date.now() && t.type === 'session');
    if (!session) return res.status(401).json({ success: false, error: 'Session expirée' });
    req.clientEmail = session.email;
    next();
}

function safeClient(c) {
    return { id:c.id, email:c.email, prenom:c.prenom, nom:c.nom,
             adresse:c.adresse||'', cp:c.cp||'', ville:c.ville||'',
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
const DOCS_DIR = '/var/data/documents';
if (!fs.existsSync(DOCS_DIR)) { try { fs.mkdirSync(DOCS_DIR, { recursive:true }); } catch(e){} }

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
app.post('/api/commandes/:id/document', uploadDoc.single('document'), async (req, res) => {
    const publicBaseUrl = getPublicBaseUrl(req);
    const { mdp } = req.body;
    if (mdp !== ADMIN_PWD_SUIVI) return res.status(403).json({ success:false, error:'Non autorisé' });
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
            const lienEspace = `${publicBaseUrl}?client_token=notif`;
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
                `, '#F47B20', "COM' Impression", publicBaseUrl, 'Montreverd (85)')
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
    if (req.query.mdp !== ADMIN_PWD_SUIVI) return res.status(403).send('Non autorisé');
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
const DATA_DIR = (() => {
    const fs2 = require('fs');
    try { fs2.mkdirSync('/var/data', { recursive: true }); return '/var/data'; }
    catch(e) { return '/tmp'; }
})();
const COMMANDES_FILE = DATA_DIR + '/commandes.json';
const ADMIN_PWD_SUIVI = process.env.ADMIN_PWD || 'comimpression2025';

// POST /api/admin/check — valider le mot de passe admin avant ouverture du dashboard
app.post('/api/admin/check', express.json(), (req, res) => {
    if ((req.body || {}).mdp !== ADMIN_PWD_SUIVI) {
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

// POST /api/commandes/manuelle — créer une commande depuis l'espace admin
app.post('/api/commandes/manuelle', upload.array('fichiers', 20), (req, res) => {
    const d = req.body || {};
    if (d.mdp !== ADMIN_PWD_SUIVI) return res.status(401).json({ success: false, error: 'Non autorise' });
    if (!d.panier) return res.status(400).json({ success: false, error: 'Detail commande manquant' });
    try {
        const commandes = lireCommandes();
        const numero = genererNumero();
        let lignes = [];
        try { lignes = JSON.parse(d.lignes || '[]'); } catch(e) { lignes = []; }
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
        const cmd = {
            id:          numero,
            numero,
            date:        formatDate(new Date()),
            prenom:      d.prenom || '',
            nom:         d.nom || '',
            email:       d.email || '',
            tel:         d.tel || '',
            type_client: d.type_client || 'Particulier',
            siret:       d.siret || '',
            panier:      d.panier || '',
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
        res.json({ success: true, numero: cmd.numero, commande: cmd });
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

// GET /api/commandes — liste toutes les commandes
app.get('/api/commandes', (req, res) => {
    const commandes = lireCommandes();
    res.json({ success: true, commandes: commandes.reverse() }); // plus récentes en premier
});

// POST /api/commandes/:id/statut — changer le statut + email client
app.post('/api/commandes/:id/statut', express.json(), async (req, res) => {
    const { statut, mdp } = req.body;
    if (mdp !== ADMIN_PWD_SUIVI) return res.status(401).json({ success: false, error: 'Non autorise' });

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
        'BAT valide':    'BAT valid\u00e9 \u2014 en production',
        'En production': 'Votre commande est en cours de production',
        'En cours de livraison': 'Votre commande est en cours de livraison',
        'Expediee':      'Votre commande est exp\u00e9di\u00e9e !',
        'Annulee':       'Commande annul\u00e9e'
    };
    const STATUTS_MSG = {
        'Recue':         'Nous avons bien re\u00e7u votre commande et allons la traiter rapidement.',
        'BAT envoye':    'Votre bon \u00e0 tirer (BAT) vous a \u00e9t\u00e9 envoy\u00e9 par email. Merci de le valider pour lancer la production.',
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
            const contenu = `
                <h2 style="color:#F47B20;font-size:20px;margin:0 0 12px;">${STATUTS_LABELS[statut] || statut}</h2>
                <p style="color:#5C5C5C;font-size:15px;line-height:1.6;margin:0 0 20px;">
                    Bonjour <strong>${cmd.prenom || cmd.nom || 'cher client'}</strong>,<br><br>
                    ${STATUTS_MSG[statut] || 'Le statut de votre commande a ete mis a jour.'}
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ef;border-radius:10px;padding:14px 18px;margin:16px 0;">
                    <tr><td style="font-size:14px;padding:4px 0;"><span style="color:#888;width:130px;display:inline-block;">Numero</span><strong>${cmd.numero}</strong></td></tr>
                    <tr><td style="font-size:14px;padding:4px 0;"><span style="color:#888;width:130px;display:inline-block;">Statut</span><strong style="color:#F47B20;">${statut}</strong></td></tr>
                </table>
                <p style="font-size:14px;color:#5C5C5C;line-height:1.6;margin-top:20px;">
                    Pour toute question : <a href="mailto:michael@com-impression.fr" style="color:#F47B20;">michael@com-impression.fr</a><br>
                    ou au <strong>07 43 69 56 41</strong>
                </p>`;

            await transporter.sendMail({
                from: `"COM' Impression" <${process.env.SMTP_USER}>`,
                to: cmd.email,
                subject: `Commande ${cmd.numero} — ${STATUTS_LABELS[statut] || statut}`,
                html: emailWrapper(contenu, '#F47B20', "COM' Impression", 'https://com-impression.fr', 'Montreverd (85) - Vendee'),
                attachments: factureAttach
            });
            console.log('Email statut envoye a', cmd.email);
        } catch(e) { console.warn('Email statut non envoye:', e.message); }
    }

    res.json({ success: true, commande: commandes[idx] });
});

// POST /api/commandes/:id/notes — sauvegarder notes internes
app.post('/api/commandes/:id/notes', express.json(), (req, res) => {
    const { notes, mdp } = req.body;
    if (mdp !== ADMIN_PWD_SUIVI) return res.status(401).json({ success: false, error: 'Non autorise' });

    const commandes = lireCommandes();
    const idx = commandes.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Commande introuvable' });

    commandes[idx].notes = notes;
    commandes[idx].updated_at = new Date().toISOString();
    sauvegarderCommandes(commandes);

    res.json({ success: true });
});
