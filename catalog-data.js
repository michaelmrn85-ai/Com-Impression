(function () {
  var refCounter = 1;

  function product(id, title, priceLabel, priceValue, summary, tags, extras) {
    return Object.assign({
      ref: "COM" + String(refCounter++).padStart(4, "0"),
      id: id,
      title: title,
      priceLabel: priceLabel,
      priceValue: priceValue,
      summary: summary,
      tags: tags
    }, extras || {});
  }

  function buildPricing(base, quantities, factors) {
    if (typeof base !== "number" || !Array.isArray(quantities) || !Array.isArray(factors)) return [];
    return quantities.map(function (quantity, index) {
      var factor = factors[index] == null ? factors[factors.length - 1] : factors[index];
      return {
        quantity: quantity,
        total: Math.round(base * factor * 100) / 100
      };
    });
  }

  function enrichCatalog(catalog) {
    var gammeDefaults = {
      "com-pro": {
        finishOptions: ["Standard", "Premium", "Recto-Verso"],
        quantityPricing: function (product) {
          return buildPricing(product.priceValue, [100, 250, 500, 1000], [1, 1.55, 2.35, 3.95]);
        }
      },
      "com-exterieur": {
        finishOptions: ["Standard", "Renforcee", "Pose exterieure"],
        quantityPricing: function (product) {
          return buildPricing(product.priceValue, [1, 2, 5, 10], [1, 1.8, 4.1, 7.8]);
        }
      },
      "com-evenementiel": {
        finishOptions: ["Standard", "Premium", "Avec enveloppes"],
        quantityPricing: function (product) {
          return buildPricing(product.priceValue, [25, 50, 100, 250], [1, 1.45, 2.15, 3.8]);
        }
      },
      "com-personnalisee": {
        finishOptions: ["Standard", "Premium", "Broderie / option haute finition"],
        quantityPricing: function (product) {
          return buildPricing(product.priceValue, [1, 5, 10, 25], [1, 3.9, 7.2, 15.6]);
        }
      },
      "com-services": {
        finishOptions: ["Standard", "Couleur", "Premium"],
        quantityPricing: function (product) {
          return buildPricing(product.priceValue, [1, 10, 50, 100], [1, 8.5, 36, 68]);
        }
      }
    };

    var overrides = {
      "carte-cd": {
        finishOptions: ["350g couche demi mat", "Pelliculage mat", "Pelliculage soft touch"],
        quantityPricing: buildPricing(15.49, [100, 250, 500, 1000], [1, 1.58, 2.48, 4.08])
      },
      "flyer-a5": {
        finishOptions: ["135g brillant", "170g brillant", "250g demi mat"],
        quantityPricing: buildPricing(27.49, [100, 250, 500, 1000], [1, 1.64, 2.55, 4.18])
      },
      "brochure-a4": {
        finishOptions: ["8 pages", "16 pages", "24 pages"],
        quantityPricing: buildPricing(63.90, [25, 50, 100, 250], [1, 1.7, 2.9, 5.4])
      },
      "bache-av-oe": {
        finishOptions: ["510g avec oeillets", "510g renforcee", "Grand vent"],
        quantityPricing: buildPricing(37.49, [1, 2, 5, 10], [1, 1.82, 4.28, 8.1])
      },
      "beach-flag": {
        finishOptions: ["Taille S", "Taille M", "Taille L"],
        quantityPricing: buildPricing(134.49, [1, 2, 5, 10], [1, 1.9, 4.5, 8.8])
      },
      "tshirt": {
        finishOptions: ["Impression recto", "Recto / verso", "Coupe equipe"],
        quantityPricing: buildPricing(32.90, [1, 5, 10, 25], [1, 4.6, 8.7, 20.9])
      },
      "polo": {
        finishOptions: ["Broderie coeur", "Broderie coeur + dos", "Premium equipe"],
        quantityPricing: buildPricing(56.49, [1, 5, 10, 25], [1, 4.55, 8.65, 20.6])
      },
      "gobelet": {
        finishOptions: ["12 cL", "18 cL", "Quadri HD"],
        quantityPricing: buildPricing(47.90, [10, 50, 100, 250], [1, 1.9, 3.15, 5.7])
      },
      "faire-part-a5-evt": {
        finishOptions: ["Sans enveloppe", "Enveloppes blanches", "Enveloppes couleur"],
        quantityPricing: buildPricing(48.90, [25, 50, 100, 250], [1, 1.43, 2.18, 3.82])
      },
      "impression-doc": {
        finishOptions: ["80g noir et blanc", "80g couleur", "90g premium"],
        quantityPricing: buildPricing(0.05, [1, 10, 50, 100], [1, 8, 34, 62])
      }
    };

    (catalog.gammes || []).forEach(function (gamme) {
      var defaults = gammeDefaults[gamme.slug] || {};
      (gamme.products || []).forEach(function (product) {
        if (!product.finishOptions && defaults.finishOptions) {
          product.finishOptions = defaults.finishOptions.slice();
        }
        if (!product.quantityPricing && typeof defaults.quantityPricing === "function" && typeof product.priceValue === "number") {
          product.quantityPricing = defaults.quantityPricing(product);
        }
        var override = overrides[product.id];
        if (override) {
          Object.keys(override).forEach(function (key) {
            product[key] = override[key];
          });
        }
      });
    });

    return catalog;
  }

  window.CI_CATALOG = enrichCatalog({
    gammes: [
      {
        slug: "com-pro",
        title: "Com'Pro",
        description: "Tous les supports print pour entreprises, commerces, restaurants et independants qui veulent une communication propre et efficace.",
        tags: ["cartes", "flyers", "brochures", "restaurant", "papeterie"],
        products: [
          product("carte-cd", "Carte de visite (coin droit)", "dès 15,49 EUR", 15.49, "Carte 8,5 x 5,4 cm pour pros, commerces et reseau local.", ["carte de visite", "entreprise", "reseau", "prospection"]),
          product("carte-ca", "Carte de visite (coin arrondi)", "dès 35,90 EUR", 35.90, "Version premium au toucher plus doux et a la silhouette plus moderne.", ["carte de visite", "premium", "arrondi", "commerce"]),
          product("carte-a6", "Carte de visite A6", "dès 33,49 EUR", 33.49, "Grand format pour presenter offre, tarif, promo ou infos essentielles.", ["carte a6", "promotion", "presentation", "entreprise"]),
          product("flyer-a5", "Flyer A5", "dès 27,49 EUR", 27.49, "Support rapide pour diffusion locale, ouverture, promo ou evenement.", ["flyer", "a5", "tract", "prospectus"]),
          product("flyer-a6", "Flyer A6", "dès 25,90 EUR", 25.90, "Petit format facile a distribuer en boites aux lettres ou comptoir.", ["flyer", "a6", "distribution", "promo"]),
          product("depliant", "Depliant", "dès 72,90 EUR", 72.90, "Support plie ideal pour menus, offres detaillees ou presentation d'activite.", ["depliant", "pliant", "menu", "brochure"]),
          product("brochure-a4", "Brochure agrafee A4", "dès 63,90 EUR", 63.90, "Catalogue ou dossier agrafe grand format pour communication claire.", ["brochure", "a4", "catalogue", "dossier"]),
          product("brochure-a5", "Brochure agrafee A5", "dès 63,90 EUR", 63.90, "Brochure plus compacte pour salons, accueil et remise client.", ["brochure", "a5", "catalogue", "salon"]),
          product("affiche", "Affiche", "dès 22,90 EUR", 22.90, "Affiches A4 a A0 pour vitrines, evenementiel et communication visible.", ["affiche", "poster", "vitrine", "grand format"]),
          product("chemise-a4", "Chemise A4", "dès 155,90 EUR", 155.90, "Chemise de presentation pour devis, contrats et documents commerciaux.", ["chemise", "a4", "documents", "entreprise"]),
          product("chemise-a5", "Chemise A5", "dès 107,49 EUR", 107.49, "Petit format pratique pour menus, offres et kits de bienvenue.", ["chemise", "a5", "accueil", "presentation"]),
          product("fairepart-a6", "Faire-part A6", "dès 37,49 EUR", 37.49, "Faire-part compact pour annonces, invitations ou occasions speciales.", ["faire-part", "a6", "invitation", "annonce"]),
          product("fairepart-a5", "Faire-part A5", "dès 42,49 EUR", 42.49, "Format plus visible pour invitations, annonces et messages premium.", ["faire-part", "a5", "invitation", "premium"]),
          product("carte-fidel", "Carte de fidelite", "dès 15,49 EUR", 15.49, "Carte simple pour booster les retours clients en point de vente.", ["fidelite", "commerce", "boutique", "carte client"]),
          product("carte-fidel-pliee", "Carte de fidelite pliee", "dès 112,49 EUR", 112.49, "Version a volets pour plus de tampons, d'offres ou d'informations.", ["fidelite", "pliee", "commerce", "boutique"]),
          product("sac-kraft-bt", "Sac kraft bouteille", "dès 146,90 EUR", 146.90, "Sac personnalise pour cave, epicerie fine et boutique cadeaux.", ["sac kraft", "bouteille", "boutique", "emballage"]),
          product("sac-kraft-24", "Sac kraft 24x11x32", "dès 141,90 EUR", 141.90, "Sac kraft imprime pour ventes boutique, takeaway et packaging.", ["sac kraft", "shopping", "emballage", "boutique"]),
          product("enveloppe", "Enveloppe imprimee", "dès 75,90 EUR", 75.90, "Enveloppes pros pour courrier, factures et communication d'entreprise.", ["enveloppe", "courrier", "papeterie", "entreprise"]),
          product("menu-resto", "Menu restaurant", "dès 15,49 EUR", 15.49, "Menus simples ou plies pour restauration, snack et bar.", ["menu", "restaurant", "snack", "bar"]),
          product("set-table", "Set de table", "dès 35,90 EUR", 35.90, "Support utile et visuel pour restaurants, brasseries et evenements.", ["set de table", "restaurant", "table", "restauration"]),
          product("accroche-porte", "Accroche-porte", "dès 33,90 EUR", 33.90, "Support malin pour hotel, gite, campagne locale ou offre speciale.", ["accroche-porte", "hotel", "gite", "promotion"]),
          product("chevalet", "Chevalet de table", "dès 82,90 EUR", 82.90, "Chevalet comptoir pour table, accueil, menu ou promo instantanee.", ["chevalet", "table", "comptoir", "menu"]),
          product("livre-photo", "Livre photo", "dès 102,49 EUR", 102.49, "Livre relie pour portfolio, souvenir client ou presentation soignee.", ["livre photo", "portfolio", "souvenir", "presentation"])
        ]
      },
      {
        slug: "com-exterieur",
        title: "Com'Exterieur",
        description: "Les supports exterieurs et grand format pour facade, stand, chantier, evenement et visibilite terrain.",
        tags: ["bache", "panneau", "roll-up", "beach flag", "exterieur"],
        products: [
          product("bache-ss-oe", "Bache sans oeillet", "dès 36,49 EUR", 36.49, "Bache simple pour affichage, habillage et communication exterieure.", ["bache", "grand format", "exterieur", "banderole"]),
          product("bache-av-oe", "Bache avec oeillets", "dès 37,49 EUR", 37.49, "Bache prete a poser pour cloture, facade, evenement ou chantier.", ["bache", "oeillets", "exterieur", "chantier"]),
          product("bache-micro", "Bache micro-perforee", "dès 34,90 EUR", 34.90, "Support adapte au vent pour facade, grillage ou zone exposee.", ["bache", "micro-perforee", "vent", "facade"]),
          product("tissu-fourreau", "Tissu avec fourreaux", "dès 64,90 EUR", 64.90, "Visuel textile pour structure, decor ou stand plus premium.", ["tissu", "fourreaux", "stand", "decor"]),
          product("adhesif-vinyle", "Adhesif vinyle", "Sur devis", null, "Adhesif pour vitrine, vehicule, signaletique ou decor sur mesure.", ["adhesif", "vinyle", "vitrine", "covering"]),
          product("barr-std", "Habillage barriere 200 cm", "dès 205,90 EUR", 205.90, "Habillage evenementiel pour canaliser et brander un espace.", ["barriere", "habillage", "evenement", "branding"]),
          product("barr-long", "Habillage barriere 250 cm", "dès 209,49 EUR", 209.49, "Version longue pour grands flux ou perimeteres de manifestation.", ["barriere", "habillage", "manifestation", "branding"]),
          product("akylux-ss", "Panneau Akylux sans percage", "dès 43,90 EUR", 43.90, "Panneau alveolaire leger pour communication temporaire ou terrain.", ["akylux", "panneau", "immobilier", "exterieur"]),
          product("akylux-av", "Panneau Akylux perce", "dès 45,90 EUR", 45.90, "Version percee pour fixation rapide sur grille, portail ou support.", ["akylux", "panneau", "percage", "exterieur"]),
          product("panneau-immo", "Panneau immobilier V", "dès 52,49 EUR", 52.49, "Panneau agence et vente/location pour terrain et facade.", ["immobilier", "panneau", "vente", "location"]),
          product("panneau-permis", "Panneau permis de construire", "45,90 EUR", 45.90, "Panneau conforme pour chantier, declaration et affichage reglementaire.", ["chantier", "permis", "construction", "reglementaire"]),
          product("alu-dibond-ss", "Alu-Dibond sans entretoises", "dès 130,90 EUR", 130.90, "Plaque rigide premium pour enseigne, plaque pro ou signaletique durable.", ["dibond", "enseigne", "plaque", "premium"]),
          product("alu-dibond-av", "Alu-Dibond avec entretoises", "dès 178,90 EUR", 178.90, "Finition plus haut de gamme avec fixation visible et propre.", ["dibond", "entretoises", "plaque", "premium"]),
          product("plaque-aimant", "Plaque aimantee", "dès 95,90 EUR", 95.90, "Support magnetique pour vehicule, habillage temporaire ou promo mobile.", ["aimant", "vehicule", "magnetique", "mobile"]),
          product("rollup-ext", "Roll-Up exterieur", "dès 273,90 EUR", 273.90, "Roll-up deployee pour usage exterieur et zones de passage.", ["roll-up", "exterieur", "stand", "signaletique"]),
          product("beach-flag", "Beach Flag plume", "dès 134,49 EUR", 134.49, "Oriflamme visible de loin pour point de vente, salon ou plage.", ["beach flag", "oriflamme", "drapeau", "exterieur"]),
          product("stop-trottoir", "Stop-trottoir A1", "dès 169,90 EUR", 169.90, "Chevalet de rue pour capter le regard devant boutique ou restauration.", ["stop-trottoir", "rue", "boutique", "restaurant"]),
          product("arche-drapeau", "Arche drapeau", "dès 488,49 EUR", 488.49, "Entree visuelle forte pour course, animation ou evenement de marque.", ["arche", "drapeau", "entree", "evenement"]),
          product("barnum", "Barnum 3x3 m", "dès 2 087,90 EUR", 2087.90, "Structure premium pour marche, salon, evenement ou operation terrain.", ["barnum", "tente", "stand", "evenement"]),
          product("paravent", "Paravent de plage", "dès 125,90 EUR", 125.90, "Paravent textile pour espace balise ou zone reservee.", ["paravent", "plage", "textile", "evenement"]),
          product("transat", "Transat bois", "dès 132,49 EUR", 132.49, "Mobilier personnalise pour terrasse, stand ou lounge branding.", ["transat", "mobilier", "terrasse", "branding"]),
          product("chaise-cinema", "Chaise cinema", "dès 244,49 EUR", 244.49, "Assise signature pour evenement, tournage, marque ou coin photo.", ["chaise", "cinema", "mobilier", "evenement"]),
          product("parasol", "Parasol publicitaire", "dès 513,90 EUR", 513.90, "Protection et visibilite sur terrasse, plage ou point de vente exterieur.", ["parasol", "terrasse", "plage", "publicitaire"]),
          product("colonne-gonf", "Colonne gonflable", "dès 467,90 EUR", 467.90, "Totem gonflable tres visible pour depart, podium ou zone animation.", ["colonne", "gonflable", "totem", "evenement"])
        ]
      },
      {
        slug: "com-evenementiel",
        title: "Com'Evenementiel",
        description: "Les supports pour mariages, ceremonies, salons, receptions et temps forts qui doivent marquer les esprits.",
        tags: ["faire-part", "mariage", "reception", "ceremonie", "plan de table"],
        products: [
          product("faire-part-a5-evt", "Faire-Part A5", "dès 48,90 EUR", 48.90, "Faire-part elegant pour mariage, bapteme, naissance ou reception.", ["faire-part", "a5", "mariage", "ceremonie"]),
          product("faire-part-pli", "Faire-Part avec pli vernis selectif", "dès 266,49 EUR", 266.49, "Version premium a fort impact pour moments importants.", ["faire-part", "plie", "vernis selectif", "premium"]),
          product("faire-part-a6-evt", "Faire-Part A6", "dès 45,90 EUR", 45.90, "Format compact et soigne pour invitation ou annonce de date.", ["faire-part", "a6", "mariage", "invitation"]),
          product("magnet-save", "Magnet Save The Date", "dès 57,90 EUR", 57.90, "Format souvenir qui reste visible longtemps chez vos invites.", ["save the date", "magnet", "mariage", "souvenir"]),
          product("carte-invit", "Carte d'invitation / reponse A6", "dès 45,49 EUR", 45.49, "Carte d'invitation ou carton reponse assorti a votre univers.", ["invitation", "reponse", "ceremonie", "mariage"]),
          product("menu-evt-carte", "Menu carte A5", "dès 32,49 EUR", 32.49, "Menu de table simple, elegant et facile a harmoniser.", ["menu", "table", "mariage", "reception"]),
          product("menu-evt-chev", "Menu chevalet", "dès 82,90 EUR", 82.90, "Menu plie pour decorer la table tout en donnant les infos utiles.", ["menu", "chevalet", "table", "reception"]),
          product("plan-table", "Plan de table PVC", "dès 43,49 EUR", 43.49, "Plan de table rigide pour accueil de reception et orientation des invites.", ["plan de table", "accueil", "mariage", "reception"]),
          product("panneau-bienv", "Panneau de bienvenue", "dès 36,49 EUR", 36.49, "Panneau d'accueil pour entree de salle, ceremonie ou evenement prive.", ["bienvenue", "panneau", "ceremonie", "mariage"]),
          product("beach-flag-evt", "Beach Flag evenementiel", "dès 87,90 EUR", 87.90, "Signal evenementiel pour domaine, animation, course ou stand.", ["beach flag", "evenement", "drapeau", "signal"]),
          product("arche-gonf", "Arche gonflable", "dès 559,90 EUR", 559.90, "Arche monumentale pour ligne de depart, entree ou activation de marque.", ["arche", "gonflable", "evenement", "entree"]),
          product("transat-evt", "Transat personnalise", "dès 67,49 EUR", 67.49, "Mobilier de detente pour mariage, cocktail ou espace lounge.", ["transat", "lounge", "mariage", "cocktail"]),
          product("rollup-evt", "Roll-Up enrouleur", "dès 44,90 EUR", 44.90, "Roll-up pour photo booth, accueil, salon ou coin sponsors.", ["roll-up", "salon", "accueil", "stand"]),
          product("carte-remerci", "Carte de remerciement A6", "dès 45,90 EUR", 45.90, "Carte finale pour remercier clients, invites ou participants.", ["remerciement", "a6", "mariage", "souvenir"])
        ]
      },
      {
        slug: "com-personnalisee",
        title: "Com'Personnalisee",
        description: "Textile, goodies et objets personnalises pour equipes, marques, associations, cadeaux clients et operations terrain.",
        tags: ["textile", "goodies", "objets", "broderie", "cadeaux"],
        products: [
          product("tshirt", "T-shirt unisexe impression directe", "32,90 EUR", 32.90, "T-shirt personnalise pour equipe, evenement ou image de marque.", ["t-shirt", "textile", "impression", "entreprise"]),
          product("tshirt-broderie", "T-shirt personnalise broderie", "56,90 EUR", 56.90, "Version premium avec broderie poitrine pour un rendu durable.", ["t-shirt", "broderie", "premium", "uniforme"]),
          product("polo", "Polo brode", "56,49 EUR", 56.49, "Polo pro ideal pour accueil, commerce, salon et equipement equipe.", ["polo", "broderie", "entreprise", "equipe"]),
          product("veste", "Veste softshell", "102,49 EUR", 102.49, "Veste de travail ou d'equipe, deperlante et valorisante.", ["veste", "softshell", "broderie", "uniforme"]),
          product("chemise", "Chemise avec broderie incluse", "108,49 EUR", 108.49, "Chemise plus habillee pour direction, accueil ou service premium.", ["chemise", "broderie", "premium", "accueil"]),
          product("casquette", "Casquette personnalisee", "52,49 EUR", 52.49, "Objet textile visible pour marque, association ou campagne terrain.", ["casquette", "goodie", "marque", "evenement"]),
          product("casquette-broderie", "Casquette broderie", "83,90 EUR", 83.90, "Casquette brodee pour equipe terrain, marque ou operation speciale.", ["casquette", "broderie", "terrain", "marque"]),
          product("totebag", "Tote bag Carolina", "52,90 EUR", 52.90, "Sac coton personnalise pour boutique, salon, cadeau client ou packaging.", ["totebag", "sac", "coton", "goodie"]),
          product("gobelet", "Gobelet personnalise 12cL/18cL", "dès 47,90 EUR", 47.90, "Gobelet reutilisable pour festivals, bars, assos et communication durable.", ["gobelet", "reutilisable", "festival", "goodie"]),
          product("mug", "Mug personnalise", "des 5 EUR/u", 5.00, "Mug imprime pour cadeau, bureau, box client ou vente personnalisee.", ["mug", "tasse", "cadeau", "objet publicitaire"]),
          product("totebag-evt", "Tote bag evenementiel", "dès 52,90 EUR", 52.90, "Tote bag quadri pour welcome pack, mariage ou operation de marque.", ["totebag", "evenement", "welcome pack", "cadeau"]),
          product("gobelet-evt", "Gobelet evenementiel", "dès 47,90 EUR", 47.90, "Gobelet quadri pour ceremonie, fete, reception et grands rassemblements.", ["gobelet", "evenement", "ceremonie", "fete"])
        ]
      },
      {
        slug: "com-services",
        title: "Com'Services",
        description: "Impressions, plastifications et tirages utiles au quotidien, avec un service simple, local et rapide.",
        tags: ["documents", "photos", "plastification", "tirages", "copie"],
        products: [
          product("impression-doc", "Impression de document", "dès 0,05 EUR/page", 0.05, "Impression noir et blanc ou couleur pour dossiers, cours et documents courants.", ["impression", "documents", "copie", "a4"]),
          product("plastif-a4", "Plastification A4", "0,50 EUR/u", 0.50, "Protection rapide et propre pour affiches, menus, fiches et supports utiles.", ["plastification", "a4", "protection", "documents"]),
          product("photo-10x15-bri", "Photo 10x15 brillant", "0,22 EUR/u", 0.22, "Petit tirage photo brillant pour souvenirs, album ou evenement.", ["photo", "10x15", "brillant", "tirage"]),
          product("photo-13x18-bri", "Photo 13x18 brillant", "0,52 EUR/u", 0.52, "Tirage plus grand pour cadre, cadeau ou photo d'exposition.", ["photo", "13x18", "brillant", "tirage"]),
          product("photo-10x15-sat", "Photo 10x15 satin", "0,55 EUR/u", 0.55, "Version satin pour un rendu plus doux et moins refletant.", ["photo", "10x15", "satin", "tirage"]),
          product("photo-a4-sat", "Photo A4 satin", "1,52 EUR/u", 1.52, "Grand tirage satin pour encadrement, presentation ou expo.", ["photo", "a4", "satin", "agrandissement"]),
          product("photo-a4-bri", "Photo A4 brillant", "0,64 EUR/u", 0.64, "Tirage A4 brillant pour affichage, portfolio ou cadeau.", ["photo", "a4", "brillant", "agrandissement"])
        ]
      },
      {
        slug: "com-gourmand",
        title: "Com'Gourmand",
        description: "Une future gamme de gourmandises personnalisees pour vos evenements, vos cadeaux clients et vos moments de marque.",
        tags: ["bientot", "gourmandises", "cadeaux", "evenements", "personnalisation"],
        comingSoon: true,
        products: []
      }
    ]
  });
})();
