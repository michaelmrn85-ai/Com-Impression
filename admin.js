(function(){
  'use strict';

  var API_BASE = window.CI_ADMIN_API_BASE || window.location.origin;
  var STATUTS = ['Recue','BAT envoye','BAT fichier a revoir','BAT valide','En production','En cours de livraison','Expediee','Annulee'];
  var STATUT_LABELS = {
    'Recue':'Reçue',
    'BAT envoye':'BAT envoyé',
    'BAT fichier a revoir':'BAT à revoir',
    'BAT valide':'BAT validé',
    'En production':'En production',
    'En cours de livraison':'En cours de livraison',
    'Expediee':'Terminée',
    'Annulee':'Annulée'
  };
  var state = {
    mdp: sessionStorage.getItem('ci_admin_pwd') || '',
    commandes: [],
    scope: 'cours',
    selected: null,
    avis: [],
    siteConfig: null,
    catalog: [],
    clients: [],
    selectedProduct: null,
    selectedClient: null
  };

  var CLIENT_TYPE_OPTIONS = [
    'Particulier',
    'Professionnel',
    'Professionnel sans SIRET',
    'Administration publique (Chorus Pro)',
    'Association'
  ];

  var SITE_PRODUCT_OPTIONS = [
    { id:'fairepart-a5', label:'Faire-part A5', meta:'Mariage, baptême, invitation' },
    { id:'fairepart-a6', label:'Faire-part A6', meta:'Petit format événementiel' },
    { id:'carte-invit', label:'Carte invitation', meta:'Invitations et cartons RSVP' },
    { id:'menu-evt-carte', label:'Menu événementiel', meta:'Mariage, réception, dîner' },
    { id:'plan-table', label:'Plan de table', meta:'Organisation des invités' },
    { id:'panneau-bienv', label:'Panneau de bienvenue', meta:'Accueil événement' },
    { id:'carte-remerci', label:'Carte de remerciement', meta:'Suite de mariage ou baptême' },
    { id:'gobelet-evt', label:'Gobelet personnalisé', meta:'Événement, fête, mariage' },
    { id:'flyer-a5', label:'Flyer A5', meta:'Communication saisonnière' },
    { id:'flyer-a6', label:'Flyer A6', meta:'Petit format promo' },
    { id:'affiche', label:'Affiche', meta:'Visibilité en vitrine ou salle' },
    { id:'menu-resto', label:'Menu restaurant', meta:'Carte ou menu de saison' },
    { id:'totebag', label:'Tote bag', meta:'Goodies et cadeau invité' },
    { id:'bache-av-oe', label:'Bâche avec œillets', meta:'Signalétique extérieure' },
    { id:'impression-doc', label:'Impression document', meta:'Service rapide du quotidien' },
    { id:'plastif-a4', label:'Plastification A4', meta:'Menus, panneaux, affichage' },
    { id:'photo-10x15-bri', label:'Photos 10x15', meta:'Souvenirs et tirages photo' }
  ];

  function $(id){ return document.getElementById(id); }
  function api(path){ return API_BASE.replace(/\/$/,'') + path; }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }
  function setStatus(id,type,msg){
    var el=$(id); if(!el) return;
    el.className='status '+(type==='ok'?'ok':'err');
    el.textContent=msg;
  }
  function clearStatus(id){
    var el=$(id); if(!el) return;
    el.className='status';
    el.textContent='';
  }
  function badgeClass(statut){
    if(statut==='Recue') return 'b-rec';
    if(statut==='BAT envoye'||statut==='BAT valide'||statut==='BAT fichier a revoir') return 'b-bat';
    if(statut==='En production') return 'b-prod';
    if(statut==='En cours de livraison'||statut==='Expediee') return 'b-exp';
    if(statut==='Annulee') return 'b-ann';
    return '';
  }
  function isDone(cmd){ return cmd.statut === 'Expediee'; }
  function isCancelled(cmd){ return cmd.statut === 'Annulee'; }
  function isInProgress(cmd){ return !isDone(cmd) && !isCancelled(cmd); }
  function ordersForScope(scope){
    if(scope==='terminees') return state.commandes.filter(isDone);
    if(scope==='annulees') return state.commandes.filter(isCancelled);
    return state.commandes.filter(isInProgress);
  }
  function updateCounts(){
    $('count-cours').textContent = state.commandes.filter(isInProgress).length;
    $('count-terminees').textContent = state.commandes.filter(isDone).length;
    $('count-annulees').textContent = state.commandes.filter(isCancelled).length;
    if($('count-produits')) $('count-produits').textContent = state.catalog.length;
    if($('count-clients')) $('count-clients').textContent = state.clients.length;
    $('last-update').textContent = 'Dernière mise à jour : ' + new Date().toLocaleString('fr-FR');
  }
  function showDashboard(){
    $('login-card').style.display='none';
    $('dashboard').style.display='block';
  }
  function showLogin(){
    $('login-card').style.display='block';
    $('dashboard').style.display='none';
  }
  function openModal(id){
    var el=$(id); if(el) el.classList.add('open');
  }
  function closeModal(el){
    var modal=el && el.closest ? el.closest('.modal') : el;
    if(modal) modal.classList.remove('open');
  }

  function login(){
    var pwd=($('admin-password').value||'').trim();
    if(!pwd){ setStatus('login-status','err','Entre le mot de passe admin.'); return; }
    clearStatus('login-status');
    $('btn-login').disabled=true;
    $('btn-login').textContent='Connexion...';
    fetch(api('/api/admin/check'),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mdp:pwd})
    })
    .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error||'Mot de passe incorrect'); return d; }); })
    .then(function(){
      state.mdp=pwd;
      sessionStorage.setItem('ci_admin_pwd',pwd);
      showDashboard();
      return Promise.all([loadCommandes(), loadProductsAdmin(false), loadClientsAdmin(false), loadSiteConfig()]);
    })
    .catch(function(err){ setStatus('login-status','err',err.message||'Connexion impossible.'); })
    .finally(function(){
      $('btn-login').disabled=false;
      $('btn-login').textContent='Se connecter';
    });
  }

  function loadCommandes(){
    return fetch(api('/api/commandes'))
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(!data.success) throw new Error(data.error||'Chargement impossible');
        state.commandes = Array.isArray(data.commandes) ? data.commandes : [];
        updateCounts();
        loadAvisAdmin(false);
        if($('modal-orders').classList.contains('open')) renderOrders();
      })
      .catch(function(err){
        $('last-update').textContent = 'Erreur : ' + (err.message || 'chargement impossible');
      });
  }

  function openOrders(scope){
    state.scope=scope;
    var titles={cours:'Commandes en cours',terminees:'Commandes terminées',annulees:'Commandes annulées'};
    $('orders-title').textContent=titles[scope]||'Commandes';
    $('orders-search').value='';
    renderOrders();
    openModal('modal-orders');
  }

  function renderOrders(){
    var list=$('orders-list');
    var q=($('orders-search').value||'').toLowerCase().trim();
    var orders=ordersForScope(state.scope).filter(function(cmd){
      if(!q) return true;
      return [cmd.numero,cmd.prenom,cmd.nom,cmd.email,cmd.tel,cmd.panier,cmd.prix_total,cmd.statut]
        .join(' ').toLowerCase().indexOf(q)!==-1;
    });
    if(!orders.length){
      list.innerHTML='<div class="empty">Aucune commande dans cette section.</div>';
      return;
    }
    list.innerHTML=orders.map(function(cmd){
      var fullName=((cmd.prenom||'')+' '+(cmd.nom||'')).trim()||'Client';
      return '<div class="order">'
        +'<div><div class="num">'+esc(cmd.numero||cmd.id)+'</div><div class="muted">'+esc(cmd.date||'')+'</div></div>'
        +'<div><strong>'+esc(fullName)+'</strong><div class="muted">'+esc(cmd.email||'')+'</div></div>'
        +'<div><span class="badge '+badgeClass(cmd.statut)+'">'+esc(STATUT_LABELS[cmd.statut]||cmd.statut||'Statut')+'</span><div class="muted">'+esc(cmd.prix_total||'--')+'</div></div>'
        +'<button class="btn btn-orange btn-small" data-detail="'+esc(cmd.id||cmd.numero)+'" type="button">Ouvrir</button>'
        +'</div>';
    }).join('');
  }

  function findCommand(id){
    return state.commandes.find(function(c){ return String(c.id)===String(id) || String(c.numero)===String(id); });
  }

  function extractAmount(text){
    var s=String(text||'');
    var explicit=s.match(/Prix\s*:\s*([^—\[]+)/i);
    if(explicit) return explicit[1].trim();
    var amounts=s.match(/(?:dès\s*)?\d+(?:[,.]\d{1,2})?\s*€(?:\s*TTC)?/gi);
    return amounts && amounts.length ? amounts[amounts.length-1].trim() : '--';
  }

  function extractQty(text){
    var s=String(text||'');
    var explicit=s.match(/Qt[ée]\s*:\s*([^—\[]+)/i);
    if(explicit) return explicit[1].trim();
    var q=s.match(/\b\d+\s*(?:ex\.?|exemplaires?|pages?|pcs?|unités?)\b/i);
    return q ? q[0].trim() : '--';
  }

  function extractFile(text){
    var s=String(text||'');
    var bracket=s.match(/\[fichier\s*:\s*([^\]]+)\]/i);
    if(bracket) return bracket[1].trim();
    var plain=s.match(/fichier\s*:\s*([^—\[]+)/i);
    return plain ? plain[1].trim() : '--';
  }

  function extractProduct(text){
    var s=String(text||'').trim();
    if(!s) return '--';
    return s.split('—')[0].replace(/\[fichier\s*:[^\]]+\]/i,'').trim() || s;
  }

  function renderPanierTable(cmd){
    if(Array.isArray(cmd.lignes) && cmd.lignes.length){
      return '<div style="overflow:auto;"><table class="admin-table-mini">'
        +'<thead><tr><th>Produit</th><th>Fichier</th><th>Qté</th><th>Montant TTC</th></tr></thead>'
        +'<tbody>'+cmd.lignes.map(function(row){
          return '<tr><td>'+esc(row.produit||'--')+'</td><td>'+esc(row.fichier||'--')+'</td><td>'+esc(row.qte||'--')+'</td><td>'+esc(row.montant||'--')+'</td></tr>';
        }).join('')+'</tbody>'
        +'<tfoot><tr><td colspan="3">Montant TTC</td><td>'+esc(cmd.prix_total||'--')+'</td></tr></tfoot>'
        +'</table></div>';
    }
    var lines=String(cmd.panier||'').split(/\n|\|/).map(function(l){return l.trim();}).filter(Boolean);
    if(!lines.length) return '<div class="empty">Aucun détail panier.</div>';
    var rows=lines.map(function(line){
      return {
        produit: extractProduct(line),
        fichier: extractFile(line),
        qte: extractQty(line),
        montant: extractAmount(line)
      };
    });
    return '<div style="overflow:auto;"><table class="admin-table-mini">'
      +'<thead><tr><th>Produit</th><th>Fichier</th><th>Qté</th><th>Montant TTC</th></tr></thead>'
      +'<tbody>'+rows.map(function(row){
        return '<tr><td>'+esc(row.produit)+'</td><td>'+esc(row.fichier)+'</td><td>'+esc(row.qte)+'</td><td>'+esc(row.montant)+'</td></tr>';
      }).join('')+'</tbody>'
      +'<tfoot><tr><td colspan="3">Montant TTC</td><td>'+esc(cmd.prix_total||'--')+'</td></tr></tfoot>'
      +'</table></div>';
  }

  function openDetail(id){
    var cmd=findCommand(id); if(!cmd) return;
    state.selected=cmd;
    $('detail-title').textContent='Commande '+(cmd.numero||cmd.id);
    var fullName=((cmd.prenom||'')+' '+(cmd.nom||'')).trim()||'Client';
    var statutOptions=STATUTS.map(function(st){
      return '<option value="'+esc(st)+'" '+(cmd.statut===st?'selected':'')+'>'+esc(STATUT_LABELS[st])+'</option>';
    }).join('');
    var docs=(cmd.documents||[]).map(function(doc){
      var href=api('/api/admin/commandes/'+encodeURIComponent(cmd.id||cmd.numero)+'/document/'+encodeURIComponent(doc.id)+'?mdp='+encodeURIComponent(state.mdp));
      return '<a class="btn btn-light btn-small" href="'+href+'" target="_blank">📄 '+esc(doc.type||'Document')+'</a>';
    }).join(' ');
    var docUpload =
      '<div style="margin-top:14px;padding-top:14px;border-top:1px solid #f2e7df;">'
      +'<h3 style="margin-top:0;">Ajouter un document</h3>'
      +'<div class="field"><label for="detail-doc-type">Type de document</label>'
      +'<select id="detail-doc-type"><option selected>Facture</option><option>Devis</option><option>Bon de commande</option><option>BAT</option><option>Autre</option></select></div>'
      +'<div class="field"><label for="detail-doc-name">Nom affiché</label>'
      +'<input id="detail-doc-name" type="text" value="'+esc('Facture '+(cmd.numero||cmd.id))+'" placeholder="Ex : Facture CI-2026-0009"></div>'
      +'<div class="field"><label for="detail-doc-file">Fichier PDF</label>'
      +'<input id="detail-doc-file" type="file" accept=".pdf,application/pdf"></div>'
      +'<label style="display:flex;align-items:center;gap:8px;margin:10px 0 14px;font-weight:800;">'
      +'<input id="detail-doc-notif" type="checkbox" checked style="width:auto;"> Notifier le client par email</label>'
      +'<button class="btn btn-orange btn-small" id="upload-doc" type="button">Déposer le document</button>'
      +'<div class="status" id="detail-doc-status"></div>'
      +'</div>';
    $('detail-body').innerHTML =
      '<div class="detail-grid">'
      +'<section class="panel"><h3>Client</h3><div class="kv">'
      +'<div><span>Nom</span><strong>'+esc(fullName)+'</strong></div>'
      +'<div><span>Email</span><a href="mailto:'+esc(cmd.email||'')+'">'+esc(cmd.email||'--')+'</a></div>'
      +'<div><span>Téléphone</span><strong>'+esc(cmd.tel||'--')+'</strong></div>'
      +'<div><span>Profil</span><strong>'+esc(cmd.type_client||'Particulier')+'</strong></div>'
      +'<div><span>SIRET</span><strong>'+esc(cmd.siret||'--')+'</strong></div>'
      +'</div></section>'
      +'<section class="panel"><h3>Traitement</h3>'
      +'<div class="field"><label>Statut</label><select id="detail-statut">'+statutOptions+'</select></div>'
      +'<button class="btn btn-orange btn-small" id="save-statut" type="button">Mettre à jour le statut</button>'
      +'<div class="field"><label>Notes internes</label><textarea id="detail-notes" placeholder="Notes visibles uniquement par toi">'+esc(cmd.notes||'')+'</textarea></div>'
      +'<button class="btn btn-dark btn-small" id="save-notes" type="button">Enregistrer les notes</button>'
      +'<div class="status" id="detail-status"></div></section>'
      +'<section class="panel"><h3>Panier</h3>'+renderPanierTable(cmd)+'</section>'
      +'<section class="panel"><h3>Documents disponibles</h3>'+(docs||'<p class="muted">Aucun document déposé pour cette commande.</p>')+docUpload+'</section>'
      +'</div>';
    openModal('modal-detail');
  }

  function saveStatut(){
    var cmd=state.selected; if(!cmd) return;
    var statut=$('detail-statut').value;
    fetch(api('/api/commandes/'+encodeURIComponent(cmd.id)+'/statut'),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({statut:statut,mdp:state.mdp})
    })
    .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error||'Mise à jour impossible'); return d; }); })
    .then(function(data){
      setStatus('detail-status','ok','Statut mis à jour.');
      if(data.commande) Object.assign(cmd,data.commande);
      return loadCommandes();
    })
    .catch(function(err){ setStatus('detail-status','err',err.message||'Erreur statut.'); });
  }

  function saveNotes(){
    var cmd=state.selected; if(!cmd) return;
    fetch(api('/api/commandes/'+encodeURIComponent(cmd.id)+'/notes'),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({notes:$('detail-notes').value||'',mdp:state.mdp})
    })
    .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error||'Sauvegarde impossible'); return d; }); })
    .then(function(){
      cmd.notes=$('detail-notes').value||'';
      setStatus('detail-status','ok','Notes enregistrées.');
    })
    .catch(function(err){ setStatus('detail-status','err',err.message||'Erreur notes.'); });
  }

  function uploadDocument(){
    var cmd=state.selected; if(!cmd) return;
    var fileInput=$('detail-doc-file');
    var file=fileInput && fileInput.files ? fileInput.files[0] : null;
    if(!file){ setStatus('detail-doc-status','err','Sélectionne un fichier PDF.'); return; }
    if(file.type && file.type !== 'application/pdf'){ setStatus('detail-doc-status','err','Le document doit être un PDF.'); return; }
    var btn=$('upload-doc');
    var notifyClient=!!(($('detail-doc-notif')||{}).checked);
    var fd=new FormData();
    fd.append('document',file,file.name);
    fd.append('type_doc',($('detail-doc-type')||{}).value||'Facture');
    fd.append('nom_doc',(($('detail-doc-name')||{}).value||file.name).trim());
    fd.append('notif',notifyClient?'true':'false');
    fd.append('mdp',state.mdp);
    if(btn){ btn.disabled=true; btn.textContent='Dépôt en cours...'; }
    clearStatus('detail-doc-status');
    fetch(api('/api/commandes/'+encodeURIComponent(cmd.id||cmd.numero)+'/document'),{
      method:'POST',
      body:fd
    })
    .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error||'Dépôt impossible'); return d; }); })
    .then(function(){
      return loadCommandes().then(function(){
        var fresh=findCommand(cmd.id||cmd.numero);
        if(fresh){
          state.selected=fresh;
          openDetail(fresh.id||fresh.numero);
          setStatus('detail-doc-status','ok','Document déposé.'+(notifyClient?' Email client envoyé si possible.':''));
        }
      });
    })
    .catch(function(err){ setStatus('detail-doc-status','err',err.message||'Erreur dépôt document.'); })
    .finally(function(){
      if(btn){ btn.disabled=false; btn.textContent='Déposer le document'; }
    });
  }

  function renderAvisList(){
    var list = $('avis-list');
    if(!list) return;
    if(!state.avis.length){
      list.innerHTML='<div class="empty">Aucun avis en attente.</div>';
      return;
    }
    list.innerHTML = state.avis.map(function(avis){
      return '<div class="panel">'
        +'<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px;">'
        +'<div><h3 style="margin-bottom:4px;">'+esc(avis.prenom||'Client')+'</h3><div class="muted">'+esc(avis.date||'')+(avis.ville?' — '+esc(avis.ville):'')+(avis.produit?' — '+esc(avis.produit):'')+'</div></div>'
        +'<div style="font-size:1rem;color:#F47B20;white-space:nowrap;">'+esc('★'.repeat(parseInt(avis.note,10)||5))+'</div>'
        +'</div>'
        +'<div style="font-size:.92rem;line-height:1.6;color:#333;margin-bottom:14px;">'+esc(avis.texte||'').replace(/\n/g,'<br>')+'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        +'<button class="btn btn-orange btn-small" data-avis-action="valider" data-avis-id="'+esc(avis.id)+'" type="button">Valider</button>'
        +'<button class="btn btn-light btn-small" data-avis-action="supprimer" data-avis-id="'+esc(avis.id)+'" type="button">Supprimer</button>'
        +'</div>'
        +'</div>';
    }).join('');
  }

  function loadAvisAdmin(openAfterLoad){
    return fetch(api('/api/avis/pending?mdp='+encodeURIComponent(state.mdp)))
      .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error||'Avis introuvables'); return d; }); })
      .then(function(data){
        state.avis = Array.isArray(data.avis) ? data.avis : [];
        var count = $('count-avis'); if(count) count.textContent = state.avis.length;
        var title = $('avis-title-count'); if(title) title.textContent = state.avis.length+' avis en attente';
        renderAvisList();
        if(openAfterLoad) openModal('modal-avis');
      })
      .catch(function(){
        state.avis = [];
        var count = $('count-avis'); if(count) count.textContent = '0';
        renderAvisList();
      });
  }

  function traiterAvis(id, action){
    var target = action === 'valider'
      ? fetch(api('/api/avis/'+encodeURIComponent(id)+'/valider'), {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ mdp: state.mdp })
        })
      : fetch(api('/api/avis/'+encodeURIComponent(id)), {
          method:'DELETE',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ mdp: state.mdp })
        });
    return target
      .then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Action impossible'); return d; }); })
      .then(function(){ return loadAvisAdmin(false); });
  }

  function renderSiteProductOptions(selectedIds){
    var wrap = $('site-products-list');
    if(!wrap) return;
    var selected = Array.isArray(selectedIds) ? selectedIds : [];
    wrap.innerHTML = SITE_PRODUCT_OPTIONS.map(function(item){
      var checked = selected.indexOf(item.id) !== -1 ? 'checked' : '';
      return '<label class="season-item">'
        +'<input type="checkbox" class="site-product-check" value="'+esc(item.id)+'" '+checked+'>'
        +'<div><strong>'+esc(item.label)+'</strong><span>'+esc(item.meta)+'</span></div>'
        +'</label>';
    }).join('');
  }

  function getSelectedSiteProductIds(){
    return Array.prototype.slice.call(document.querySelectorAll('.site-product-check:checked')).map(function(input){
      return input.value;
    });
  }

  function renderHeroImagePreview(src){
    var preview = $('site-hero-image-preview');
    if(!preview) return;
    if(src){
      preview.innerHTML = '<img src="'+esc(src)+'" alt="Aperçu bandeau">';
    } else {
      preview.textContent = 'Aperçu de l’image';
    }
  }

  function remplirSiteConfig(config){
    $('site-top-banner').value = config.topBanner || '';
    $('site-hero-badge').value = config.heroBadge || '';
    $('site-hero-slogan').value = config.heroSlogan || '';
    $('site-hero-line1').value = config.heroLine1 || '';
    $('site-hero-highlight').value = config.heroHighlight || '';
    $('site-hero-line2').value = config.heroLine2 || '';
    $('site-hero-text').value = config.heroText || '';
    $('site-panel-title').value = config.heroPanelTitle || '';
    $('site-panel-text').value = config.heroPanelText || '';
    $('site-panel-items').value = (config.heroPanelItems || []).join('\n');
    state.siteConfig = Object.assign({}, state.siteConfig || {}, { heroImage: config.heroImage || '' });
    renderHeroImagePreview((state.siteConfig && state.siteConfig.heroImage) || '');
    $('site-products-title').value = config.productsTitle || '';
    $('site-products-accent').value = config.productsAccent || '';
    $('site-products-subtitle').value = config.productsSubtitle || '';
    renderSiteProductOptions(config.seasonalProductIds || []);
    $('site-popup-message').value = config.message || config.popupMessage || '';
  }

  function loadSiteConfig(){
    clearStatus('site-status');
    return fetch(api('/api/site-config'))
      .then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Configuration indisponible'); return d; }); })
      .then(function(data){
        state.siteConfig = data.config || {};
        return fetch(api('/api/incident'))
          .then(function(r){ return r.json(); })
          .then(function(incidentData){
            var incident = (incidentData && incidentData.incident) || {};
            remplirSiteConfig({
              topBanner: state.siteConfig.topBanner,
              heroBadge: state.siteConfig.heroBadge,
              heroSlogan: state.siteConfig.heroSlogan,
              heroLine1: state.siteConfig.heroLine1,
              heroHighlight: state.siteConfig.heroHighlight,
              heroLine2: state.siteConfig.heroLine2,
              heroText: state.siteConfig.heroText,
              heroImage: state.siteConfig.heroImage,
              heroPanelTitle: state.siteConfig.heroPanelTitle,
              heroPanelText: state.siteConfig.heroPanelText,
              heroPanelItems: state.siteConfig.heroPanelItems || [],
              productsTitle: state.siteConfig.productsTitle,
              productsAccent: state.siteConfig.productsAccent,
              productsSubtitle: state.siteConfig.productsSubtitle,
              seasonalProductIds: state.siteConfig.seasonalProductIds || [],
              message: incident.message || ''
            });
          });
      });
  }

  function saveSiteConfig(){
    var payload = {
      mdp: state.mdp,
      topBanner: $('site-top-banner').value || '',
      heroBadge: $('site-hero-badge').value || '',
      heroLine1: $('site-hero-line1').value || '',
      heroHighlight: $('site-hero-highlight').value || '',
      heroLine2: $('site-hero-line2').value || '',
      heroSlogan: $('site-hero-slogan').value || '',
      heroText: $('site-hero-text').value || '',
      heroImage: (state.siteConfig && state.siteConfig.heroImage) || '',
      heroPanelTitle: $('site-panel-title').value || '',
      heroPanelText: $('site-panel-text').value || '',
      heroPanelItems: ($('site-panel-items').value || '').split('\n').map(function(item){ return item.trim(); }).filter(Boolean),
      productsTitle: $('site-products-title').value || '',
      productsAccent: $('site-products-accent').value || '',
      productsSubtitle: $('site-products-subtitle').value || '',
      seasonalProductIds: getSelectedSiteProductIds()
    };
    var incidentPayload = {
      mdp: state.mdp,
      active: !!($('site-popup-message').value || '').trim(),
      title: 'Information client',
      message: $('site-popup-message').value || ''
    };
    return Promise.all([
      fetch(api('/api/admin/site-config'), {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      }).then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Publication impossible'); return d; }); }),
      fetch(api('/api/incident'), {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(incidentPayload)
      }).then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Popup client impossible'); return d; }); })
    ]).then(function(){
      setStatus('site-status','ok','Réglages publiés sur le site.');
    }).catch(function(err){
      setStatus('site-status','err',err.message||'Erreur publication site.');
    });
  }

  function flattenCatalog(catalog){
    return (catalog || []).reduce(function(items, gamme){
      return items.concat((gamme.products || []).map(function(product){
        return {
          gammeTitle: gamme.title,
          legacyCat: gamme.legacyCat,
          product: product
        };
      }));
    }, []);
  }

  function loadProductsAdmin(openAfterLoad){
    return fetch(api('/api/admin/catalog?mdp='+encodeURIComponent(state.mdp)))
      .then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Catalogue indisponible'); return d; }); })
      .then(function(data){
        state.catalog = flattenCatalog((data.catalog && data.catalog.gammes) || []);
        updateCounts();
        renderProductsList();
        if(openAfterLoad) openModal('modal-products');
      });
  }

  function renderProductsList(){
    var list=$('products-list');
    if(!list) return;
    var q=(($('products-search')||{}).value||'').toLowerCase().trim();
    var items=state.catalog.filter(function(entry){
      if(!q) return true;
      return [entry.gammeTitle, entry.product.ref, entry.product.title, entry.product.summary].join(' ').toLowerCase().indexOf(q)!==-1;
    });
    if(!items.length){
      list.innerHTML='<div class="empty">Aucun produit trouvé.</div>';
      return;
    }
    list.innerHTML=items.map(function(entry){
      return '<div class="order">'
        +'<div><div class="num">'+esc(entry.product.ref||'--')+'</div><div class="muted">'+esc(entry.gammeTitle||'')+'</div></div>'
        +'<div><strong>'+esc(entry.product.title||'Produit')+'</strong><div class="muted">'+esc(entry.product.summary||'')+'</div></div>'
        +'<div><span class="badge b-rec">'+esc(entry.product.priceLabel||'Sur devis')+'</span><div class="muted">'+esc((entry.product.quantityOptions||[]).join(', ')||'Lots libres')+'</div></div>'
        +'<button class="btn btn-orange btn-small" data-edit-product="'+esc(entry.legacyCat)+'::'+esc(entry.product.id)+'" type="button">Modifier</button>'
        +'</div>';
    }).join('');
  }

  function findAdminProduct(key){
    return state.catalog.find(function(entry){
      return (entry.legacyCat+'::'+entry.product.id)===key;
    });
  }

  function openProductEditor(key){
    var entry=key ? findAdminProduct(key) : null;
    state.selectedProduct=entry || {
      gammeTitle:'',
      legacyCat:'compro',
      product:{
        ref:'Nouvelle reference',
        id:'',
        title:'',
        priceLabel:'',
        summary:'',
        quantityOptions:[],
        options:{},
        quantityPricing:[],
        uploadEnabled:true,
        hasDimensions:false,
        requiresQuantityInput:false
      },
      isNew:true
    };
    $('product-edit-title').textContent=(state.selectedProduct.isNew?'Creation produit':'Edition produit')+' — '+((state.selectedProduct.product && state.selectedProduct.product.title)||'Produit');
    var entryRef = state.selectedProduct;
    var paperOptions = ((entryRef.product.options||{})[Object.keys(entryRef.product.options||{}).find(function(k){ return /papier|grammage/i.test(k); })]||[]);
    var finishOptions = ((entryRef.product.options||{})[Object.keys(entryRef.product.options||{}).find(function(k){ return /finit|pellic|vernis|soft/i.test(k); })]||[]);
    var gammeOptions = [
      { value:'compro', label:"Com'Pro" },
      { value:'comext', label:"Com'Exterieur" },
      { value:'comevt', label:"Com'Evenementiel" },
      { value:'comperso', label:"Com'Personnalisee" },
      { value:'comservices', label:"Com'Services" }
    ].map(function(item){
      return '<option value="'+item.value+'" '+(entryRef.legacyCat===item.value?'selected':'')+'>'+item.label+'</option>';
    }).join('');
    $('product-edit-body').innerHTML=
      '<div class="site-grid">'
      +'<div class="field"><label>Reference</label><input value="'+esc(entryRef.product.ref||'')+'" disabled></div>'
      +'<div class="field"><label>Gamme</label><select id="product-edit-gamme">'+gammeOptions+'</select></div>'
      +'</div>'
      +'<div class="site-grid">'
      +'<div class="field"><label>Nom</label><input id="product-edit-name" value="'+esc(entryRef.product.title||'')+'"></div>'
      +'<div class="field"><label>Prix de depart</label><input id="product-edit-price" value="'+esc(entryRef.product.priceLabel||'')+'" placeholder="15,90 EUR"></div>'
      +'</div>'
      +'<div class="field"><label>Description</label><textarea id="product-edit-summary">'+esc(entryRef.product.summary||'')+'</textarea></div>'
      +'<div class="site-grid">'
      +'<div class="field"><label>Lots / quantites</label><textarea id="product-edit-qty" placeholder="100,250,500">'+esc((entryRef.product.quantityOptions||[]).join(', '))+'</textarea></div>'
      +'<div class="field"><label>Papiers / grammages</label><textarea id="product-edit-paper" placeholder="350g couche demi mat, 400g premium">'+esc(paperOptions.join(', '))+'</textarea></div>'
      +'</div>'
      +'<div class="field"><label>Finitions</label><textarea id="product-edit-finish" placeholder="Pelliculage mat, Soft touch">'+esc(finishOptions.join(', '))+'</textarea></div>'
      +'<div class="field"><label>Tarifs par lot (format quantite=total, un par ligne)</label><textarea id="product-edit-pricing" placeholder="100=15.90&#10;250=24.90">'+esc((entryRef.product.quantityPricing||[]).map(function(row){ return row.quantity+'='+row.total; }).join('\n'))+'</textarea></div>'
      +'<div class="site-grid">'
      +'<label style="display:flex;align-items:center;gap:8px;margin:10px 0 14px;font-weight:800;"><input id="product-edit-upload" type="checkbox" style="width:auto;" '+(entryRef.product.uploadEnabled!==false?'checked':'')+'> Upload actif sur la fiche produit</label>'
      +'<label style="display:flex;align-items:center;gap:8px;margin:10px 0 14px;font-weight:800;"><input id="product-edit-dimensions" type="checkbox" style="width:auto;" '+(entryRef.product.hasDimensions?'checked':'')+'> Produit avec dimensions libres</label>'
      +'</div>'
      +'<button class="btn btn-orange" id="product-edit-save" type="button">'+(entryRef.isNew?'Creer le produit':'Enregistrer le produit')+'</button>'
      +'<div class="status" id="product-edit-status"></div>';
    openModal('modal-product-edit');
  }

  function saveProductEditor(){
    var entry=state.selectedProduct; if(!entry) return;
    var pricing=String(($('product-edit-pricing').value||'')).split('\n').map(function(line){
      var parts=line.split('=');
      return { quantity:(parts[0]||'').trim(), total:(parts[1]||'').trim() };
    }).filter(function(row){ return row.quantity && row.total; });
    var endpoint = entry.isNew ? '/api/admin/products' : ('/api/admin/products/'+encodeURIComponent(entry.legacyCat)+'/'+encodeURIComponent(entry.product.id));
    fetch(api(endpoint),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        mdp:state.mdp,
        legacyCat:($('product-edit-gamme').value||entry.legacyCat||'').trim(),
        title:($('product-edit-name').value||'').trim(),
        summary:($('product-edit-summary').value||'').trim(),
        priceLabel:($('product-edit-price').value||'').trim(),
        quantityOptions:($('product-edit-qty').value||'').trim(),
        paperOptions:($('product-edit-paper').value||'').trim(),
        finishOptions:($('product-edit-finish').value||'').trim(),
        quantityPricing:pricing,
        uploadEnabled:!!(($('product-edit-upload')||{}).checked),
        hasDimensions:!!(($('product-edit-dimensions')||{}).checked)
      })
    })
    .then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Sauvegarde impossible'); return d; }); })
    .then(function(){
      setStatus('product-edit-status','ok',entry.isNew?'Produit cree.':'Produit mis a jour.');
      return loadProductsAdmin(false);
    })
    .catch(function(err){ setStatus('product-edit-status','err',err.message||'Erreur sauvegarde produit.'); });
  }

  function loadClientsAdmin(openAfterLoad){
    return fetch(api('/api/admin/clients?mdp='+encodeURIComponent(state.mdp)))
      .then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Clients indisponibles'); return d; }); })
      .then(function(data){
        state.clients = Array.isArray(data.clients) ? data.clients : [];
        updateCounts();
        renderClientsList();
        if(openAfterLoad) openModal('modal-clients');
      });
  }

  function renderClientsList(){
    var list=$('clients-list');
    if(!list) return;
    var q=(($('clients-search')||{}).value||'').toLowerCase().trim();
    var items=state.clients.filter(function(client){
      if(!q) return true;
      return [client.prenom, client.nom, client.email, client.societe, client.siret, client.mode_reglement, client.type_client].join(' ').toLowerCase().indexOf(q)!==-1;
    });
    if(!items.length){
      list.innerHTML='<div class="empty">Aucun client trouvé.</div>';
      return;
    }
    list.innerHTML=items.map(function(client){
      return '<div class="order">'
        +'<div><div class="num">'+esc(((client.prenom||'')+' '+(client.nom||'')).trim()||client.email||'Client')+'</div><div class="muted">'+esc(client.email||'')+'</div></div>'
        +'<div><strong>'+esc(client.type_client||'Particulier')+'</strong><div class="muted">'+esc(client.societe||client.siret||'')+'</div></div>'
        +'<div><span class="badge b-bat">'+esc(client.mode_reglement||'CB')+'</span><div class="muted">'+esc(String(client.commandes_count||0))+' commande(s)</div></div>'
        +'<button class="btn btn-orange btn-small" data-edit-client="'+esc(client.id)+'" type="button">Modifier</button>'
        +'</div>';
    }).join('');
  }

  function findAdminClient(id){
    return state.clients.find(function(client){ return String(client.id)===String(id); });
  }

  function openClientEditor(id){
    var client=id ? findAdminClient(id) : null;
    state.selectedClient=client || {
      id:'',
      prenom:'',
      nom:'',
      societe:'',
      siret:'',
      email:'',
      telephone:'',
      type_client:'Particulier',
      mode_reglement:'CB',
      adresse:'',
      cp:'',
      ville:'',
      isNew:true
    };
    var current = state.selectedClient;
    $('client-edit-title').textContent=(current.isNew?'Creation client':'Edition client')+' — '+(((current.prenom||'')+' '+(current.nom||'')).trim()||current.email||'Client');
    var typeOptions = CLIENT_TYPE_OPTIONS.map(function(label){
      return '<option '+(current.type_client===label?'selected':'')+'>'+esc(label)+'</option>';
    }).join('');
    $('client-edit-body').innerHTML=
      '<div class="site-grid">'
      +'<div class="field"><label>Profil client</label><select id="client-edit-type">'+typeOptions+'</select></div>'
      +'<div class="field"><label>Mode de reglement</label><select id="client-edit-payment"><option '+(current.mode_reglement==='CB'?'selected':'')+'>CB</option><option '+(current.mode_reglement==='Virement'?'selected':'')+'>Virement</option></select></div>'
      +'<div class="field"><label>Prenom</label><input id="client-edit-prenom" value="'+esc(current.prenom||'')+'"></div>'
      +'<div class="field"><label>Nom</label><input id="client-edit-nom" value="'+esc(current.nom||'')+'"></div>'
      +'<div class="field"><label>Societe / structure</label><input id="client-edit-societe" value="'+esc(current.societe||'')+'"></div>'
      +'<div class="field"><label>SIRET</label><input id="client-edit-siret" value="'+esc(current.siret||'')+'"></div>'
      +'<div class="field"><label>Email</label><input id="client-edit-email" value="'+esc(current.email||'')+'" '+(current.isNew?'':'disabled')+'></div>'
      +'<div class="field"><label>Telephone</label><input id="client-edit-telephone" value="'+esc(current.telephone||'')+'"></div>'
      +'</div>'
      +'<div class="field"><label>Adresse</label><input id="client-edit-adresse" value="'+esc(current.adresse||'')+'"></div>'
      +'<div class="site-grid">'
      +'<div class="field"><label>Code postal</label><input id="client-edit-cp" value="'+esc(current.cp||'')+'"></div>'
      +'<div class="field"><label>Ville</label><input id="client-edit-ville" value="'+esc(current.ville||'')+'"></div>'
      +'</div>'
      +'<button class="btn btn-orange" id="client-edit-save" type="button">'+(current.isNew?'Creer le client':'Enregistrer le client')+'</button>'
      +'<div class="status" id="client-edit-status"></div>';
    openModal('modal-client-edit');
  }

  function saveClientEditor(){
    var client=state.selectedClient; if(!client) return;
    var endpoint = client.isNew ? '/api/admin/clients' : ('/api/admin/clients/'+encodeURIComponent(client.id));
    fetch(api(endpoint),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        mdp:state.mdp,
        email:($('client-edit-email').value||'').trim(),
        prenom:($('client-edit-prenom').value||'').trim(),
        nom:($('client-edit-nom').value||'').trim(),
        societe:($('client-edit-societe').value||'').trim(),
        siret:($('client-edit-siret').value||'').trim(),
        telephone:($('client-edit-telephone').value||'').trim(),
        type_client:($('client-edit-type').value||'').trim(),
        mode_reglement:($('client-edit-payment').value||'').trim(),
        adresse:($('client-edit-adresse').value||'').trim(),
        cp:($('client-edit-cp').value||'').trim(),
        ville:($('client-edit-ville').value||'').trim()
      })
    })
    .then(function(r){ return r.json().then(function(d){ if(!r.ok || !d.success) throw new Error(d.error||'Sauvegarde impossible'); return d; }); })
    .then(function(){
      setStatus('client-edit-status','ok',client.isNew?'Client cree.':'Client mis a jour.');
      return loadClientsAdmin(false);
    })
    .catch(function(err){ setStatus('client-edit-status','err',err.message||'Erreur sauvegarde client.'); });
  }

  function parseAmount(value){
    var n=parseFloat(String(value||'').replace(/\s/g,'').replace('€','').replace(',','.'));
    return isNaN(n) ? 0 : n;
  }

  function formatAmount(value){
    return (Math.round(value*100)/100).toFixed(2).replace('.',',')+' €';
  }

  function addManualLine(data){
    var wrap=$('manual-lines'); if(!wrap) return;
    var row=document.createElement('div');
    row.className='manual-line';
    row.innerHTML=
      '<div class="field"><label>Produit</label><input class="manual-product" placeholder="Cartes de visite" value="'+esc(data&&data.produit||'')+'"></div>'
      +'<div class="field"><label>Upload fichier</label><input class="manual-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.ai,.eps,.svg,.zip"></div>'
      +'<div class="field"><label>Qté</label><input class="manual-qty" placeholder="250 ex." value="'+esc(data&&data.qte||'')+'"></div>'
      +'<div class="field"><label>Montant TTC</label><input class="manual-amount" placeholder="35,90 €" value="'+esc(data&&data.montant||'')+'"></div>'
      +'<button class="btn-icon manual-remove-line" type="button" title="Supprimer la ligne">×</button>';
    wrap.appendChild(row);
  }

  function refreshManualTotal(){
    var sum=0;
    document.querySelectorAll('#manual-lines .manual-amount').forEach(function(input){
      sum+=parseAmount(input.value);
    });
    if(sum>0) $('manual-total').value=formatAmount(sum);
  }

  function getManualRows(){
    return Array.prototype.slice.call(document.querySelectorAll('#manual-lines .manual-line')).map(function(row){
      var fileInput=row.querySelector('.manual-file');
      var file=fileInput && fileInput.files ? fileInput.files[0] : null;
      return {
        produit:(row.querySelector('.manual-product')||{}).value||'',
        qte:(row.querySelector('.manual-qty')||{}).value||'',
        montant:(row.querySelector('.manual-amount')||{}).value||'',
        file:file,
        fileName:file ? file.name : ''
      };
    }).filter(function(row){
      return row.produit.trim() || row.qte.trim() || row.montant.trim() || row.file;
    });
  }

  function buildManualPanier(rows){
    return rows.map(function(row){
      return (row.produit.trim()||'Produit')
        +' — fichier: '+(row.fileName||'--')
        +' — Qté: '+(row.qte.trim()||'--')
        +' — Prix: '+(row.montant.trim()||'--');
    }).join('\n');
  }

  function resetManualForm(){
    ['manual-prenom','manual-nom','manual-email','manual-tel','manual-type-client','manual-siret','manual-total','manual-livraison'].forEach(function(id){
      var el=$(id); if(el) el.value='';
    });
    var type=$('manual-type-client'); if(type) type.value='Particulier';
    var lines=$('manual-lines'); if(lines) lines.innerHTML='';
    addManualLine();
    clearStatus('manual-status');
  }

  function createManualOrder(){
    var rows=getManualRows();
    var fd=new FormData();
    var prenom=($('manual-prenom').value||'').trim();
    var nom=($('manual-nom').value||'').trim();
    if(!prenom && !nom){ setStatus('manual-status','err','Indique au moins un prénom ou un nom.'); return; }
    if(!rows.length){ setStatus('manual-status','err','Ajoute au moins une ligne produit.'); return; }
    fd.append('prenom',prenom);
    fd.append('nom',nom);
    fd.append('email',($('manual-email').value||'').trim());
    fd.append('tel',($('manual-tel').value||'').trim());
    fd.append('type_client',($('manual-type-client').value||'Particulier').trim());
    fd.append('siret',($('manual-siret').value||'').trim());
    fd.append('panier',buildManualPanier(rows));
    fd.append('prix_total',($('manual-total').value||'').trim()||formatAmount(rows.reduce(function(sum,row){return sum+parseAmount(row.montant);},0)));
    fd.append('date_livraison',($('manual-livraison').value||'').trim());
    fd.append('lignes',JSON.stringify(rows.map(function(row){
      return {produit:row.produit,qte:row.qte,montant:row.montant,fichier:row.fileName};
    })));
    fd.append('mdp',state.mdp);
    rows.forEach(function(row){
      if(row.file) fd.append('fichiers',row.file,row.file.name);
    });
    var btn=$('manual-create');
    btn.disabled=true;
    btn.textContent='Création...';
    clearStatus('manual-status');
    fetch(api('/api/commandes/manuelle'),{
      method:'POST',
      body:fd
    })
    .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error||'Création impossible'); return d; }); })
    .then(function(data){
      setStatus('manual-status','ok','Commande créée : '+(data.numero||'OK'));
      return loadCommandes();
    })
    .catch(function(err){ setStatus('manual-status','err',err.message||'Erreur création commande.'); })
    .finally(function(){
      btn.disabled=false;
      btn.textContent='Créer la commande';
    });
  }

  document.addEventListener('DOMContentLoaded',function(){
    if(state.mdp){
      showDashboard();
      Promise.all([loadCommandes(), loadProductsAdmin(false), loadClientsAdmin(false)]).catch(function(){
        sessionStorage.removeItem('ci_admin_pwd');
        state.mdp='';
        showLogin();
        setStatus('login-status','err','Reconnecte-toi à l’admin.');
      });
    } else { showLogin(); }
    $('btn-login').addEventListener('click',login);
    $('admin-password').addEventListener('keydown',function(e){ if(e.key==='Enter') login(); });
    $('btn-refresh').addEventListener('click',loadCommandes);
    $('orders-reload').addEventListener('click',loadCommandes);
    if($('products-reload')) $('products-reload').addEventListener('click',function(){ loadProductsAdmin(false); });
    if($('clients-reload')) $('clients-reload').addEventListener('click',function(){ loadClientsAdmin(false); });
    if($('products-create')) $('products-create').addEventListener('click',function(){ openProductEditor(); });
    if($('clients-create')) $('clients-create').addEventListener('click',function(){ openClientEditor(); });
    $('orders-search').addEventListener('input',renderOrders);
    if($('products-search')) $('products-search').addEventListener('input',renderProductsList);
    if($('clients-search')) $('clients-search').addEventListener('input',renderClientsList);
    $('btn-logout').addEventListener('click',function(){
      sessionStorage.removeItem('ci_admin_pwd');
      state.mdp='';
      showLogin();
    });
    document.querySelectorAll('[data-open-scope]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var scope=btn.getAttribute('data-open-scope');
        if(scope==='site'){ loadSiteConfig().then(function(){ openModal('modal-site'); }); return; }
        if(scope==='avis'){ loadAvisAdmin(true); return; }
        if(scope==='manual'){ resetManualForm(); openModal('modal-manual'); return; }
        if(scope==='produits'){ loadProductsAdmin(true); return; }
        if(scope==='clients'){ loadClientsAdmin(true); return; }
        openOrders(scope);
      });
    });
    document.addEventListener('click',function(e){
      var close=e.target.closest('[data-close]');
      if(close){ closeModal(close); return; }
      if(e.target.classList && e.target.classList.contains('modal')) closeModal(e.target);
      var detail=e.target.closest('[data-detail]');
      if(detail) openDetail(detail.getAttribute('data-detail'));
      if(e.target && e.target.id==='save-statut') saveStatut();
      if(e.target && e.target.id==='save-notes') saveNotes();
      if(e.target && e.target.id==='upload-doc') uploadDocument();
      if(e.target && e.target.id==='manual-add-line') addManualLine();
      if(e.target && e.target.id==='product-edit-save') saveProductEditor();
      if(e.target && e.target.id==='client-edit-save') saveClientEditor();
      var avisBtn = e.target.closest ? e.target.closest('[data-avis-id]') : null;
      if(avisBtn){
        traiterAvis(avisBtn.getAttribute('data-avis-id'), avisBtn.getAttribute('data-avis-action'));
      }
      var productBtn = e.target.closest ? e.target.closest('[data-edit-product]') : null;
      if(productBtn) openProductEditor(productBtn.getAttribute('data-edit-product'));
      var clientBtn = e.target.closest ? e.target.closest('[data-edit-client]') : null;
      if(clientBtn) openClientEditor(clientBtn.getAttribute('data-edit-client'));
      if(e.target && e.target.classList && e.target.classList.contains('manual-remove-line')){
        var line=e.target.closest('.manual-line');
        if(line) line.remove();
        if(!document.querySelector('#manual-lines .manual-line')) addManualLine();
        refreshManualTotal();
      }
    });
    document.addEventListener('input',function(e){
      if(e.target && e.target.classList && e.target.classList.contains('manual-amount')) refreshManualTotal();
    });
    var heroFile = $('site-hero-image-file');
    if(heroFile) heroFile.addEventListener('change', function(){
      var file = this.files && this.files[0];
      if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        state.siteConfig = state.siteConfig || {};
        state.siteConfig.heroImage = ev.target.result || '';
        renderHeroImagePreview(state.siteConfig.heroImage);
      };
      reader.readAsDataURL(file);
    });
    var clearHero = $('site-hero-image-clear');
    if(clearHero) clearHero.addEventListener('click', function(){
      state.siteConfig = state.siteConfig || {};
      state.siteConfig.heroImage = '';
      if($('site-hero-image-file')) $('site-hero-image-file').value = '';
      renderHeroImagePreview('');
    });
    var siteSave=$('site-save');
    if(siteSave) siteSave.addEventListener('click',saveSiteConfig);
    var avisReload=$('avis-reload');
    if(avisReload) avisReload.addEventListener('click',function(){ loadAvisAdmin(false); });
    var manualCreate=$('manual-create');
    if(manualCreate) manualCreate.addEventListener('click',createManualOrder);
  });
})();
