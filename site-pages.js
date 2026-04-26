(function () {
  var IS_FILE_PROTOCOL = window.location.protocol === "file:";
  var API_BASE = window.location.origin;
  var CART_KEY = "ci_cart_v4";
  var CART_COUNT_KEY = "ci_cart_count";
  var SESSION_KEY = "ci_session_token";
  var USER_NAME_KEY = "ci_user_name";
  var catalogLoadPromise = null;

  function $(id) {
    return document.getElementById(id);
  }

  function resolveAppUrl(target) {
    var value = String(target || "");
    var routeMap = {
      "/": "./com-impression.html",
      "/produits": "./produits.html",
      "/produit": "./produit.html",
      "/panier": "./panier.html",
      "/client": "./client.html",
      "/rendez-vous": "./rendez-vous.html",
      "/mentions-legales": "./mentions-legales.html",
      "/cgv": "./cgv.html",
      "/faq": "./faq.html",
      "/admin": "./admin.html"
    };
    if (!IS_FILE_PROTOCOL) return value;
    if (routeMap[value]) return routeMap[value];
    var parts = value.split("?");
    if (routeMap[parts[0]]) return routeMap[parts[0]] + (parts[1] ? "?" + parts[1] : "");
    return value;
  }

  function goTo(target) {
    window.location.href = resolveAppUrl(target);
  }

  function rewriteInternalLinks() {
    document.querySelectorAll("a[href^='/']").forEach(function (link) {
      var href = link.getAttribute("href");
      link.setAttribute("href", resolveAppUrl(href));
    });
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function euro(amount) {
    if (typeof amount !== "number" || isNaN(amount)) return "Sur devis";
    return amount.toFixed(2).replace(".", ",") + " EUR";
  }

  function normalizePriceLabel(label) {
    return String(label || "").replace(/EUR/g, "EUR").replace(/des/g, "des");
  }

  function buildFallbackRef(seed) {
    var text = String(seed || "");
    var sum = 0;
    for (var i = 0; i < text.length; i += 1) {
      sum += text.charCodeAt(i) * (i + 1);
    }
    return "COM" + String((sum % 9999) + 1).padStart(4, "0");
  }

  function extractPaperFinishFromSelections(selections) {
    var paper = [];
    var finish = [];
    Object.keys(selections || {}).forEach(function (key) {
      if (/papier|grammage/i.test(key)) paper.push(selections[key]);
      if (/finit|pellic|vernis|soft/i.test(key)) finish.push(selections[key]);
    });
    return [paper.join(" / "), finish.join(" / ")].filter(Boolean).join(" • ");
  }

  function getOptionFirstValue(product, matcher) {
    var options = (product && product.options) || {};
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; i += 1) {
      if (matcher(keys[i])) return (options[keys[i]] || [])[0] || "";
    }
    return "";
  }

  function splitPaperAndWeight(value) {
    var text = String(value || "").trim();
    var weightMatch = text.match(/\b\d+\s*g\b/i);
    var weight = weightMatch ? weightMatch[0].replace(/\s+/g, "") : "";
    var paper = weight ? text.replace(weightMatch[0], "").replace(/^[\s,-]+|[\s,-]+$/g, "") : text;
    return { paper: paper, weight: weight };
  }

  function isClientConfigKey(key) {
    if (/recto|verso/i.test(key)) return true;
    if (/papier|grammage|impression|finit|pellic|vernis|soft/i.test(key)) return false;
    return true;
  }

  function isImpressionDocumentProduct(product) {
    return String((product && product.id) || "") === "impression-doc";
  }

  function isClientConfigKeyForProduct(product, key) {
    if (isImpressionDocumentProduct(product) && /grammage|format|couleur|impression|recto|verso/i.test(key)) return true;
    return isClientConfigKey(key);
  }

  function countPdfPagesFromFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/\.pdf$/i.test(file.name || "")) {
        reject(new Error("Ajoutez un PDF pour detecter le nombre de pages."));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Lecture du PDF impossible.")); };
      reader.onload = function () {
        try {
          var bytes = new Uint8Array(reader.result || []);
          var text = "";
          var chunkSize = 8192;
          for (var i = 0; i < bytes.length; i += chunkSize) {
            text += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, i, i + chunkSize));
          }
          var matches = text.match(/\/Type\s*\/Page\b/g) || [];
          var count = matches.length;
          if (!count) throw new Error("Nombre de pages non detecte.");
          resolve(count);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function renderFixedProductInfo(product) {
    var paperRaw = getOptionFirstValue(product, function (key) { return /papier|grammage/i.test(key); });
    var finishRaw = getOptionFirstValue(product, function (key) { return /finit|pellic|vernis|soft/i.test(key); });
    var paperInfo = splitPaperAndWeight(paperRaw);
    var rows = [
      { label: "Reference produit", value: getProductRef(product) },
      { label: "Taille", value: product.sizeInfo || "-" },
      { label: "Type de papier", value: paperInfo.paper || paperRaw || "-" },
      { label: "Grammage", value: paperInfo.weight || "-" },
      { label: "Finition", value: finishRaw || "-" }
    ];
    return '<div class="product-fixed-info">' + rows.map(function (row) {
      return '<div class="product-fixed-row"><strong>' + esc(row.label) + '</strong><span>' + esc(row.value) + '</span></div>';
    }).join("") + '</div>';
  }

  function uniqueValues(list) {
    var values = [];
    (list || []).forEach(function (value) {
      var text = String(value || "").trim();
      if (text && values.indexOf(text) === -1) values.push(text);
    });
    return values;
  }

  function getProductPricingRows(product) {
    return Array.isArray(product && product.quantityPricing) ? product.quantityPricing : [];
  }

  function getProductQuantityModes(product) {
    var rows = getProductPricingRows(product);
    var modes = [];
    if (rows.some(function (row) { return row.type === "lot"; })) modes.push("lot");
    if (rows.some(function (row) { return row.type === "unitaire"; }) || product.requiresQuantityInput) modes.push("unitaire");
    if (rows.some(function (row) { return row.type === "dimensions"; }) || product.hasDimensions) modes.push("dimensions");
    if (!modes.length) modes.push(product.requiresQuantityInput ? "unitaire" : "lot");
    return modes;
  }

  function normaliseOptionKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s*[-/]\s*/g, " ")
      .replace(/\s+/g, " ");
  }

  function matchesSelectedSide(row, selections) {
    var side = normaliseOptionKey((row && row.finish) || "");
    if (!side) return true;
    return Object.values(selections || {}).some(function (value) {
      return normaliseOptionKey(value) === side;
    });
  }

  function getLotQuantityOptions(product, selections) {
    return uniqueValues(getProductPricingRows(product).filter(function (row) {
      return row.type === "lot" && matchesSelectedSide(row, selections);
    }).map(function (row) {
      return row.quantity;
    }));
  }

  function uploadProductFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return Promise.resolve([]);
    var uploads = [];
    return files.reduce(function (chain, file) {
      return chain.then(function () {
        var formData = new FormData();
        formData.append("fichier", file);
        return fetch(API_BASE + "/api/cart-upload", {
          method: "POST",
          body: formData
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (json) {
              if (!response.ok || !json.success) throw new Error(json.error || ("HTTP " + response.status));
              return json;
            });
          })
          .then(function (json) {
            uploads.push(json.upload);
          });
      });
    }, Promise.resolve()).then(function () {
      return uploads;
    });
  }

  function readCart() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    localStorage.setItem(CART_COUNT_KEY, String(cart.length));
    updateHeaderState();
  }

  function getCartTotal(cart) {
    var total = 0;
    var hasEstimate = false;
    cart.forEach(function (item) {
      if (typeof item.priceValue !== "number" || isNaN(item.priceValue)) {
        hasEstimate = true;
        return;
      }
      total += item.priceValue;
    });
    return {
      label: hasEstimate ? (total > 0 ? euro(total) + " + devis" : "Sur devis") : euro(total),
      numeric: hasEstimate ? null : total
    };
  }

  function setStatus(el, type, message) {
    if (!el) return;
    el.className = "status show " + type;
    el.textContent = message;
  }

  function clearStatus(el) {
    if (!el) return;
    el.className = "status";
    el.textContent = "";
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function updateHeaderState() {
    var cart = readCart();
    var count = String(cart.length);
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = count;
    });

    var storedName = localStorage.getItem(USER_NAME_KEY) || "";
    document.querySelectorAll("[data-account-label]").forEach(function (el) {
      el.textContent = storedName || "Mon compte";
    });
  }

  function ensureGlobalSiteUi() {
    if ($("ci-global-site-ui")) return;
    var style = document.createElement("style");
    style.id = "ci-global-site-ui";
    style.textContent =
      ".site-announcement{background:#171310;color:#fff;padding:10px 18px;text-align:center;font-weight:700;font-size:.95rem;line-height:1.4;}" +
      ".site-announcement[hidden]{display:none!important;}" +
      ".site-popup-overlay{position:fixed;inset:0;background:rgba(23,19,16,.42);display:none;align-items:center;justify-content:center;padding:20px;z-index:90;backdrop-filter:blur(5px);}" +
      ".site-popup-overlay.open{display:flex;}" +
      ".site-popup-card{width:min(560px,100%);background:#fff;border:1px solid #eee3d9;border-radius:18px;padding:24px;box-shadow:0 28px 70px rgba(23,19,16,.24);position:relative;display:grid;gap:16px;}" +
      ".site-popup-head{display:flex;align-items:flex-start;gap:14px;padding-right:46px;}" +
      ".site-popup-mark{width:42px;height:42px;border-radius:14px;background:#ff751f;color:#fff;display:grid;place-items:center;font-weight:900;font-size:1.3rem;flex:0 0 auto;}" +
      ".site-popup-card h3{margin:0;font-family:'Sora',sans-serif;font-size:1.45rem;line-height:1.15;}" +
      ".site-popup-card p{margin:0;color:#5f5751;font-size:1rem;line-height:1.65;white-space:pre-line;}" +
      ".site-popup-close{position:absolute;top:18px;right:18px;width:38px;height:38px;border-radius:999px;border:1px solid #eee3d9;background:#fffaf5;color:#171310;font-size:1.4rem;cursor:pointer;}" +
      ".site-popup-actions{display:flex;justify-content:flex-end;padding-top:2px;}" +
      ".site-popup-actions .btn-light{width:auto;}" +
      ".cart-added-popup .site-popup-card{max-width:520px;}" +
      ".cart-added-popup .site-popup-actions{justify-content:flex-start;gap:12px;flex-wrap:wrap;}" +
      ".cart-added-popup .site-popup-item{font-weight:800;color:#171310;}" +
      ".cart-added-popup .site-popup-meta{color:#7a6f67;font-size:.96rem;}";
    document.head.appendChild(style);
  }

  function renderSiteAnnouncement(config) {
    ensureGlobalSiteUi();
    var text = (config && config.topBanner) ? String(config.topBanner).trim() : "";
    var existing = $("site-announcement");
    if (!text) {
      if (existing) existing.hidden = true;
      return;
    }
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "site-announcement";
      existing.className = "site-announcement";
      var header = document.querySelector("header.topbar");
      if (header && header.parentNode) {
        header.parentNode.insertBefore(existing, header);
      } else {
        document.body.insertBefore(existing, document.body.firstChild);
      }
    }
    existing.hidden = false;
    existing.textContent = text;
  }

  function renderSitePopup(incident) {
    ensureGlobalSiteUi();
    var existing = $("site-popup-overlay");
    if (!incident || !incident.active || !String(incident.message || "").trim()) {
      if (existing) {
        existing.classList.remove("open");
        existing.setAttribute("hidden", "hidden");
      }
      return;
    }
    var popupKey = "ci_popup_seen_" + String(incident.updated_at || incident.message);
    if (sessionStorage.getItem(popupKey)) return;
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "site-popup-overlay";
      existing.className = "site-popup-overlay";
      existing.innerHTML =
        '<div class="site-popup-card">'
          + '<button class="site-popup-close" type="button" aria-label="Fermer">×</button>'
          + '<div class="site-popup-head"><div class="site-popup-mark">i</div><div><div class="pill">Information client</div><h3 id="site-popup-title"></h3></div></div>'
          + '<p id="site-popup-message"></p>'
          + '<div class="site-popup-actions"><button class="btn-light" id="site-popup-ok" type="button">J\'ai compris</button></div>'
        + '</div>';
      document.body.appendChild(existing);
      existing.addEventListener("click", function (event) {
        if (event.target === existing) {
          existing.classList.remove("open");
          existing.setAttribute("hidden", "hidden");
        }
      });
      existing.querySelector(".site-popup-close").addEventListener("click", function () {
        existing.classList.remove("open");
        existing.setAttribute("hidden", "hidden");
      });
      existing.querySelector("#site-popup-ok").addEventListener("click", function () {
        existing.classList.remove("open");
        existing.setAttribute("hidden", "hidden");
      });
    }
    $("site-popup-title").textContent = incident.title || "Information client";
    $("site-popup-message").textContent = incident.message || "";
    existing.removeAttribute("hidden");
    existing.classList.add("open");
    sessionStorage.setItem(popupKey, "1");
  }

  function showCartAddedPopup(item) {
    ensureGlobalSiteUi();
    var existing = $("cart-added-popup");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "cart-added-popup";
      existing.className = "site-popup-overlay cart-added-popup";
      existing.setAttribute("hidden", "hidden");
      existing.innerHTML =
        '<div class="site-popup-card">'
          + '<button class="site-popup-close" type="button" aria-label="Fermer">×</button>'
          + '<div class="pill">Panier</div>'
          + '<h3>Produit ajoute au panier</h3>'
          + '<p class="site-popup-item" id="cart-added-popup-title"></p>'
          + '<p class="site-popup-meta" id="cart-added-popup-meta"></p>'
          + '<div class="site-popup-actions">'
            + '<button class="btn-light" id="cart-added-continue" type="button">Continuer mes achats</button>'
            + '<a class="btn" id="cart-added-open-cart" href="' + esc(resolveAppUrl("/panier")) + '">Voir le panier</a>'
          + '</div>'
        + '</div>';
      document.body.appendChild(existing);
      existing.addEventListener("click", function (event) {
        if (event.target === existing) {
          existing.classList.remove("open");
          existing.setAttribute("hidden", "hidden");
        }
      });
      existing.querySelector(".site-popup-close").addEventListener("click", function () {
        existing.classList.remove("open");
        existing.setAttribute("hidden", "hidden");
      });
      existing.querySelector("#cart-added-continue").addEventListener("click", function () {
        existing.classList.remove("open");
        existing.setAttribute("hidden", "hidden");
      });
    }
    $("cart-added-popup-title").textContent = (item && item.title) ? item.title : "Votre produit";
    $("cart-added-popup-meta").textContent = [
      item && item.quantity ? ("Quantite : " + item.quantity) : "",
      item && item.priceValue != null ? ("Total TTC : " + euro(item.priceValue)) : (item && item.priceLabel ? ("Total TTC : " + item.priceLabel) : ""),
      item && item.uploadNames && item.uploadNames.length ? ("Fichiers : " + item.uploadNames.join(", ")) : ""
    ].filter(Boolean).join(" • ");
    existing.removeAttribute("hidden");
    existing.classList.add("open");
  }

  function loadGlobalSiteContent() {
    fetch(API_BASE + "/api/site-config")
      .then(function (response) { return response.json().catch(function () { return {}; }); })
      .then(function (json) {
        if (json && json.config) renderSiteAnnouncement(json.config);
      })
      .catch(function () {});

    fetch(API_BASE + "/api/incident")
      .then(function (response) { return response.json().catch(function () { return {}; }); })
      .then(function (json) {
        if (json && json.incident) renderSitePopup(json.incident);
      })
      .catch(function () {});
  }

  function bindShell() {
    updateHeaderState();
    rewriteInternalLinks();
    if (!IS_FILE_PROTOCOL) loadGlobalSiteContent();

    document.querySelectorAll("[data-account-button]").forEach(function (button) {
      button.addEventListener("click", function () {
        goTo("/client");
      });
    });

    document.querySelectorAll("[data-cart-button]").forEach(function (button) {
      button.addEventListener("click", function () {
        goTo("/panier");
      });
    });

    document.querySelectorAll("[data-search-form]").forEach(function (form) {
      var input = form.querySelector("input[type='search']");
      if (!input) return;
      var dropdown = document.createElement("div");
      dropdown.className = "search-suggestions";
      dropdown.hidden = true;
      form.appendChild(dropdown);

      function closeSuggestions() {
        dropdown.hidden = true;
        dropdown.innerHTML = "";
      }

      function openSuggestions(items) {
        if (!items.length) {
          closeSuggestions();
          return;
        }
        dropdown.innerHTML = items.map(function (entry) {
          return '<button class="search-suggestion" type="button" data-search-product="' + esc(entry.product.id) + '" data-search-gamme="' + esc(entry.gammeSlug) + '">'
            + '<strong>' + esc(entry.product.title) + '</strong>'
            + '<span>' + esc(entry.gammeTitle) + '</span>'
          + '</button>';
        }).join("");
        dropdown.hidden = false;
        dropdown.querySelectorAll("[data-search-product]").forEach(function (button) {
          button.addEventListener("click", function () {
            closeSuggestions();
            goTo(buildProductUrl(button.getAttribute("data-search-gamme"), button.getAttribute("data-search-product")));
          });
        });
      }

      function buildSuggestions(query) {
        var normalizedQuery = normalizeSearchText(query);
        if (!normalizedQuery || normalizedQuery.length < 2) {
          closeSuggestions();
          return;
        }
        loadCatalogFromApi().then(function () {
          var visible = flattenProducts()
            .map(function (entry) {
              var title = normalizeSearchText(entry.product.title);
              var gamme = normalizeSearchText(entry.gammeTitle);
              var tags = normalizeSearchText((entry.product.tags || []).join(" "));
              var words = title.split(/\s+/).filter(Boolean);
              var score = 0;
              if (title.indexOf(normalizedQuery) === 0) score = 5;
              else if (words.some(function (word) { return word.indexOf(normalizedQuery) === 0; })) score = 4;
              else if (gamme.indexOf(normalizedQuery) === 0) score = 3;
              else if (title.indexOf(normalizedQuery) !== -1) score = 2;
              else if (tags.indexOf(normalizedQuery) !== -1) score = 1;
              return { entry: entry, score: score };
            })
            .filter(function (item) { return item.score > 0; })
            .sort(function (a, b) {
              if (b.score !== a.score) return b.score - a.score;
              return String(a.entry.product.title || "").localeCompare(String(b.entry.product.title || ""), "fr");
            })
            .slice(0, 6)
            .map(function (item) { return item.entry; });
          openSuggestions(visible);
        });
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var query = input.value.trim();
        closeSuggestions();
        goTo(query ? "/produits?q=" + encodeURIComponent(query) : "/produits");
      });
      input.addEventListener("input", function () {
        buildSuggestions(input.value);
      });
      input.addEventListener("focus", function () {
        if (input.value.trim()) buildSuggestions(input.value);
      });
      input.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeSuggestions();
      });
      document.addEventListener("click", function (event) {
        if (!form.contains(event.target)) closeSuggestions();
      });
    });
  }

  function flattenProducts() {
    var gammes = (window.CI_CATALOG && window.CI_CATALOG.gammes) || [];
    var list = [];
    gammes.forEach(function (gamme) {
      (gamme.products || []).forEach(function (product) {
        list.push({
          gammeSlug: gamme.slug,
          gammeTitle: gamme.title,
          gammeDescription: gamme.description,
          gammeLegacyCat: gamme.legacyCat,
          product: product
        });
      });
    });
    return list;
  }

  function loadCatalogFromApi() {
    if (catalogLoadPromise) return catalogLoadPromise;
    catalogLoadPromise = fetch(API_BASE + "/api/catalog-config")
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (json) {
          if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
          return json;
        });
      })
      .then(function (json) {
        if (json && json.catalog && json.catalog.gammes) {
          window.CI_CATALOG = json.catalog;
        }
        return window.CI_CATALOG || { gammes: [] };
      })
      .catch(function () {
        return window.CI_CATALOG || { gammes: [] };
      });
    return catalogLoadPromise;
  }

  function findProduct(productId) {
    var found = null;
    flattenProducts().some(function (entry) {
      if (entry.product.id === productId) {
        found = entry;
        return true;
      }
      return false;
    });
    return found;
  }

  function buildProductUrl(gammeSlug, productId) {
    var params = [];
    if (gammeSlug) params.push("gamme=" + encodeURIComponent(gammeSlug));
    if (productId) params.push("produit=" + encodeURIComponent(productId));
    return "/produit" + (params.length ? "?" + params.join("&") : "");
  }

  function getProductRef(product) {
    if (product && product.ref) return product.ref;
    var found = product && product.id ? findProduct(product.id) : null;
    if (found && found.product && found.product.ref) return found.product.ref;
    return buildFallbackRef(product && (product.id || product.productId || product.title));
  }

  function formatDateFr(value) {
    if (!value) return "";
    var date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function easterDate(year) {
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function dateKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function addDays(date, days) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function frenchHolidayKeys(year) {
    var easter = easterDate(year);
    var fixed = [
      new Date(year, 0, 1),
      new Date(year, 4, 1),
      new Date(year, 4, 8),
      new Date(year, 6, 14),
      new Date(year, 7, 15),
      new Date(year, 10, 1),
      new Date(year, 10, 11),
      new Date(year, 11, 25)
    ];
    var movable = [addDays(easter, 1), addDays(easter, 39), addDays(easter, 50)];
    var keys = {};
    fixed.concat(movable).forEach(function (date) {
      keys[dateKey(date)] = true;
    });
    return keys;
  }

  function addDeliveryDays(startDate, days) {
    var remaining = Math.max(0, Math.round(Number(days) || 0));
    var date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    var holidayCache = {};
    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      var year = date.getFullYear();
      if (!holidayCache[year]) holidayCache[year] = frenchHolidayKeys(year);
      if (date.getDay() === 0 || holidayCache[year][dateKey(date)]) continue;
      remaining -= 1;
    }
    return date;
  }

  function getEstimatedDeliveryDate(product) {
    var days = Number(product && product.deliveryDelayDays);
    if (isNaN(days) || days < 0) return "";
    return formatDateFr(addDeliveryDays(new Date(), days));
  }

  function buildOrderRows(cart) {
    return cart.map(function (item) {
      var unitLabel = item.priceUnit != null ? euro(item.priceUnit) : (item.quantity && item.priceValue != null ? euro(item.priceValue / item.quantity) : (item.priceLabel || "Sur devis"));
      return {
        ref: item.ref || getProductRef(item),
        label: item.title,
        quantity: item.quantity,
        finishLabel: item.paperFinish || "",
        unitLabel: unitLabel,
        totalLabel: item.priceValue != null ? euro(item.priceValue) : (item.priceLabel || "Sur devis"),
        purchaseValue: item.purchaseValue == null ? null : item.purchaseValue,
        notes: item.notes || "",
        gamme: item.gamme || "",
        deliveryDate: item.deliveryDate || "",
        configuration: item.configuration || item.finish || ""
      };
    });
  }

  function addToCart(product, gamme, quantity, notes) {
    var cart = readCart();
    var qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    var configuration = arguments.length > 4 ? arguments[4] : "";
    var paperFinish = arguments.length > 5 ? arguments[5] : "";
    var totalValue = arguments.length > 6 ? arguments[6] : null;
    var uploads = arguments.length > 7 ? arguments[7] : [];
    var purchaseValue = arguments.length > 8 ? arguments[8] : null;
    var unitValue = typeof totalValue === "number" && qty > 0 ? totalValue / qty : (typeof product.priceValue === "number" ? product.priceValue : null);
    var cartItem = {
      id: product.id + "-" + Date.now(),
      productId: product.id,
      ref: getProductRef(product),
      title: product.title,
      gamme: gamme.title,
      quantity: qty,
      notes: notes || "",
      finish: paperFinish || "",
      paperFinish: paperFinish || "",
      deliveryDate: getEstimatedDeliveryDate(product),
      configuration: configuration || "",
      priceUnit: typeof unitValue === "number" ? unitValue : null,
      priceValue: typeof totalValue === "number" ? totalValue : (typeof product.priceValue === "number" ? product.priceValue * qty : null),
      purchaseValue: typeof purchaseValue === "number" ? purchaseValue : null,
      priceLabel: product.priceLabel,
      uploadTokens: (uploads || []).map(function (item) { return item.token; }),
      uploadNames: (uploads || []).map(function (item) { return item.originalname; })
    };
    cart.push(cartItem);
    writeCart(cart);
    showCartAddedPopup(cartItem);
  }

  function buildPanierText(cart) {
    return buildOrderRows(cart).map(function (item) {
      var parts = [
        item.ref,
        item.label,
        "Qte: " + item.quantity,
        item.finishLabel ? "Finition papier: " + item.finishLabel : "",
        item.deliveryDate ? "Livraison estimee: " + item.deliveryDate : "",
        "Total TTC: " + item.totalLabel
      ].filter(Boolean);
      if (item.configuration) parts.push("Configuration: " + item.configuration);
      if ((item.uploadNames || []).length) parts.push("Fichiers: " + item.uploadNames.join(", "));
      if (item.notes) parts.push("Note: " + item.notes);
      return parts.join(" - ");
    }).join("\n");
  }

  function mountProductDetail(detail, entry) {
    if (!detail) return;
    if (!entry) {
      detail.innerHTML = '<div class="empty-state">Produit introuvable.</div>';
      return;
    }
    var product = entry.product;
    var productLegacyCat = product.legacyCat || entry.gammeLegacyCat || "";
    var selections = Object.assign({}, product.defaultSelections || {});

    detail.innerHTML =
      '<div class="panel product-detail-page">'
        + '<div class="product-detail-header">'
          + '<div>'
            + '<div class="pill">' + esc(entry.gammeTitle) + '</div>'
            + '<h1 class="product-page-title">' + esc(product.title) + '</h1>'
          + '</div>'
          + '<div class="product-detail-pricebox"><div class="muted">Prix de depart</div><div class="total" id="product-price-display">' + esc(normalizePriceLabel(product.priceLabel)) + '</div></div>'
        + '</div>'
        + renderProductHeroMedia(entry)
        + '<div class="product-detail-layout">'
          + '<div class="product-detail-config">'
            + renderFixedProductInfo(product)
            + '<div id="product-config-fields"></div>'
            + '<div class="field" id="product-quantity-field"></div>'
            + (product.hasDimensions ? '<div class="field product-dimensions-box" id="product-dimensions"><label>Dimensions</label><div class="inline-fields"><input id="product-width" type="number" min="' + String((product.minDimensionsCm && product.minDimensionsCm.width) || 0) + '" placeholder="Largeur cm"><input id="product-height" type="number" min="' + String((product.minDimensionsCm && product.minDimensionsCm.height) || 0) + '" placeholder="Hauteur cm"></div><p>Indiquez votre format en centimetres.</p></div>' : '')
            + (product.uploadEnabled !== false ? '<div class="field product-upload-box"><label for="product-files">Fichiers</label><input id="product-files" type="file" multiple></div>' : '')
            + '<div class="field"><label for="product-notes">Precisions</label><textarea id="product-notes" placeholder="Infos utiles, demande particuliere, delai..."></textarea></div>'
            + '<div class="status" id="product-price-status"></div>'
          + '</div>'
          + '<aside class="summary-box product-side-summary">'
            + '<div class="pill">Votre selection</div>'
            + '<div class="product-side-current"><strong>' + esc(product.title) + '</strong><span>' + esc(entry.gammeTitle) + '</span></div>'
            + '<div class="product-side-meta"><strong>Reference</strong><span>' + esc(getProductRef(product)) + '</span></div>'
            + (getEstimatedDeliveryDate(product) ? '<div class="product-side-meta"><strong>Livraison estimee</strong><span>' + esc(getEstimatedDeliveryDate(product)) + '</span></div>' : '')
            + '<div class="product-side-meta"><strong>Fichier</strong><span id="product-upload-summary">Aucun fichier</span></div>'
            + '<div class="product-side-meta"><strong>Total TTC</strong><span class="product-price" id="product-total-summary">' + esc(normalizePriceLabel(product.priceLabel)) + '</span></div>'
            + '<div class="hero-actions product-detail-actions">'
              + '<button class="btn" id="add-to-cart-btn" type="button">Ajouter au panier</button>'
              + '<a class="btn-light" href="' + esc(resolveAppUrl("/panier")) + '">Voir le panier</a>'
              + '<a class="btn-light" href="' + esc(resolveAppUrl("/rendez-vous?produit=" + encodeURIComponent(product.title))) + '">Prendre rendez-vous</a>'
            + '</div>'
          + '</aside>'
        + '</div>'
      + '</div>';

    var configWrap = $("product-config-fields");
    var quantityField = $("product-quantity-field");
    var priceDisplay = $("product-price-display");
    var priceStatus = $("product-price-status");
    var totalSummary = $("product-total-summary");
    var uploadSummary = $("product-upload-summary");
    var currentPriceLabel = product.priceLabel;
    var currentPriceValue = product.priceValue;
    var currentPurchaseValue = null;
    var currentQuantityOptions = Array.isArray(product.quantityOptions) ? product.quantityOptions.slice() : [];
    var quantityModes = getProductQuantityModes(product);
    var selectedQuantityMode = isImpressionDocumentProduct(product) ? "unitaire" : (quantityModes[0] || "lot");
    var documentPageCount = 1;
    var documentCopies = 1;

    if (configWrap) {
      configWrap.className = "product-config-grid";
      configWrap.innerHTML = (product.optionKeys || []).filter(function (key) {
        return isClientConfigKeyForProduct(product, key);
      }).map(function (key) {
        var selectId = "product-opt-" + key.replace(/[^a-z0-9]/gi, "_");
        return '<div class="field"><label for="' + esc(selectId) + '">' + esc(key) + '</label><select data-product-option="' + esc(key) + '" id="' + esc(selectId) + '">' + (product.options[key] || []).map(function (option) {
          var selected = selections[key] === option ? ' selected' : '';
          return '<option value="' + esc(option) + '"' + selected + '>' + esc(option) + '</option>';
        }).join("") + '</select></div>';
      }).join("");
    }

    function renderQuantityField(selectedValue) {
      if (!quantityField) return;
      if (isImpressionDocumentProduct(product)) {
        documentPageCount = parseInt(selectedValue || documentPageCount || 1, 10);
        if (isNaN(documentPageCount) || documentPageCount < 1) documentPageCount = 1;
        quantityField.innerHTML = '<label>Quantite</label>'
          + '<div class="inline-fields">'
            + '<div class="field"><label for="product-doc-pages">Pages detectees</label><input id="product-doc-pages" type="number" min="1" value="' + esc(String(documentPageCount)) + '" disabled><p>Calcule automatiquement depuis le PDF.</p></div>'
            + '<div class="field"><label for="product-doc-copies">Nombre d exemplaires</label><input id="product-doc-copies" type="number" min="1" value="' + esc(String(documentCopies || 1)) + '"><p>Indiquez combien d exemplaires imprimer.</p></div>'
          + '</div>';
        return;
      }
      var modeHtml = quantityModes.length > 1
        ? '<div class="quantity-mode-grid">' + quantityModes.map(function (mode) {
            var label = mode === "unitaire" ? "Unitaire" : (mode === "dimensions" ? "Dimensions" : "Quantite lot");
            return '<button type="button" class="quantity-chip' + (mode === selectedQuantityMode ? ' active' : '') + '" data-qty-mode="' + esc(mode) + '">' + esc(label) + '</button>';
          }).join("") + '</div>'
        : '';
      if (selectedQuantityMode === "unitaire") {
        quantityField.innerHTML = '<label for="product-qty-input">Quantite</label>' + modeHtml + '<div class="quantity-stack"><input id="product-qty-input" type="number" min="1" value="' + esc(selectedValue || "1") + '"><p>Entre directement la quantite souhaitee.</p></div>';
        return;
      }
      if (selectedQuantityMode === "dimensions") {
        quantityField.innerHTML = '<label>Quantite</label>' + modeHtml + '<p>Le prix depend des dimensions indiquees.</p>';
        return;
      }
      currentQuantityOptions = getLotQuantityOptions(product, selections);
      if (currentQuantityOptions.length) {
        var selected = selectedValue || String(currentQuantityOptions[0]);
        quantityField.innerHTML = '<label>Quantite</label>' + modeHtml + '<div class="quantity-grid">' + currentQuantityOptions.map(function (qty) {
          var value = String(qty);
          return '<button type="button" class="quantity-chip' + (value === selected ? ' active' : '') + '" data-qty-choice="' + esc(value) + '">' + esc(value) + ' ex.</button>';
        }).join("") + '</div><input id="product-qty-select" type="hidden" value="' + esc(selected) + '">';
        return;
      }
      quantityField.innerHTML = '<label for="product-qty-input">Quantite</label>' + modeHtml + '<div class="quantity-stack"><input id="product-qty-input" type="number" min="1" value="' + esc(selectedValue || "1") + '"></div>';
    }

    function readSelectedQuantity() {
      if (isImpressionDocumentProduct(product)) {
        return String(documentPageCount || 1);
      }
      var qtySelect = $("product-qty-select");
      var qtyInput = $("product-qty-input");
      return qtySelect ? qtySelect.value : ((qtyInput && qtyInput.value) || "1");
    }

    function refreshSelectionsFromDom() {
      document.querySelectorAll("[data-product-option]").forEach(function (select) {
        selections[select.getAttribute("data-product-option")] = select.value;
      });
    }

    function refreshUploadSummary() {
      if (!uploadSummary) return;
      var files = Array.prototype.slice.call((($("product-files") || {}).files) || []);
      uploadSummary.textContent = files.length ? files.map(function (file) { return file.name; }).join(", ") : "Aucun fichier";
      if (!isImpressionDocumentProduct(product) || !files.length) return;
      countPdfPagesFromFile(files[0])
        .then(function (pageCount) {
          selectedQuantityMode = "unitaire";
          documentPageCount = pageCount;
          renderQuantityField(String(pageCount));
          requestPricing(String(pageCount)).then(function () {
            setStatus(priceStatus, "ok", "PDF detecte : " + pageCount + " page" + (pageCount > 1 ? "s" : "") + ".");
          });
        })
        .catch(function () {
          setStatus(priceStatus, "err", "Nombre de pages non detecte. Entrez la quantite de pages manuellement.");
        });
    }

    function requestPricing(keepQuantity) {
      refreshSelectionsFromDom();
      clearStatus(priceStatus);
      var selectedQuantity = keepQuantity || readSelectedQuantity();
      var copiesInput = $("product-doc-copies");
      if (isImpressionDocumentProduct(product)) {
        documentCopies = parseInt((copiesInput && copiesInput.value) || documentCopies || 1, 10);
        if (isNaN(documentCopies) || documentCopies < 1) documentCopies = 1;
      }
      var payload = {
        legacyCat: productLegacyCat,
        productId: product.id,
        selections: selections,
        quantityMode: selectedQuantityMode,
        quantity: selectedQuantity,
        copies: isImpressionDocumentProduct(product) ? String(documentCopies || 1) : "",
        width: (($("product-width") || {}).value || ""),
        height: (($("product-height") || {}).value || "")
      };
      return fetch(API_BASE + "/api/catalog-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          currentQuantityOptions = Array.isArray(json.quantityOptions) ? json.quantityOptions.slice() : currentQuantityOptions;
          renderQuantityField(json.quantityValue || selectedQuantity || "");
          currentPriceLabel = json.priceLabel || product.priceLabel;
          currentPriceValue = typeof json.priceValue === "number" ? json.priceValue : null;
          currentPurchaseValue = typeof json.purchaseValue === "number" ? json.purchaseValue : null;
          if (priceDisplay) priceDisplay.textContent = normalizePriceLabel(currentPriceLabel);
          if (totalSummary) totalSummary.textContent = currentPriceValue != null ? euro(currentPriceValue) : normalizePriceLabel(currentPriceLabel);
          var qtySelect = $("product-qty-select");
          var qtyInput = $("product-qty-input");
          var docCopiesInput = $("product-doc-copies");
          if (qtySelect) {
            quantityField.querySelectorAll("[data-qty-choice]").forEach(function (button) {
              button.addEventListener("click", function () {
                qtySelect.value = button.getAttribute("data-qty-choice");
                requestPricing(qtySelect.value);
              });
            });
          }
          if (qtyInput) qtyInput.oninput = function () { requestPricing(qtyInput.value); };
          if (docCopiesInput) docCopiesInput.oninput = function () { requestPricing(readSelectedQuantity()); };
          quantityField.querySelectorAll("[data-qty-mode]").forEach(function (button) {
            button.addEventListener("click", function () {
              selectedQuantityMode = button.getAttribute("data-qty-mode") || selectedQuantityMode;
              renderQuantityField(selectedQuantityMode === "unitaire" ? "1" : "");
              requestPricing(readSelectedQuantity());
            });
          });
          return json;
        })
        .catch(function (error) {
          if (IS_FILE_PROTOCOL) {
            clearStatus(priceStatus);
            renderQuantityField(selectedQuantity || "");
            if (priceDisplay) priceDisplay.textContent = normalizePriceLabel(currentPriceLabel);
            if (totalSummary) totalSummary.textContent = currentPriceValue != null ? euro(currentPriceValue) : normalizePriceLabel(currentPriceLabel);
            return;
          }
          setStatus(priceStatus, "err", error.message || "Impossible de recalculer le prix.");
        });
    }

    renderQuantityField(selectedQuantityMode === "unitaire" ? "1" : (product.quantityOptions && product.quantityOptions.length ? String(product.quantityOptions[0]) : "1"));
    document.querySelectorAll("[data-product-option]").forEach(function (select) {
      select.addEventListener("change", function () {
        currentQuantityOptions = getLotQuantityOptions(product, selections);
        requestPricing();
      });
    });
    if ($("product-width")) $("product-width").addEventListener("input", function () { requestPricing(); });
    if ($("product-height")) $("product-height").addEventListener("input", function () { requestPricing(); });
    if ($("product-files")) $("product-files").addEventListener("change", refreshUploadSummary);
    refreshUploadSummary();
    requestPricing();

    var addButton = $("add-to-cart-btn");
    if (addButton) {
      addButton.addEventListener("click", function () {
        refreshSelectionsFromDom();
        var selectionSummary = Object.keys(selections).map(function (key) {
          return key + ": " + selections[key];
        }).join(" • ");
        if (isImpressionDocumentProduct(product)) {
          selectionSummary = [selectionSummary, "Pages: " + String(documentPageCount || 1), "Exemplaires: " + String(documentCopies || 1)].filter(Boolean).join(" • ");
        }
        var paperFinish = extractPaperFinishFromSelections(selections);
        var productFiles = ($("product-files") || {}).files || [];
        addButton.disabled = true;
        addButton.textContent = productFiles.length ? "Upload en cours..." : "Ajout en cours...";
        uploadProductFiles(productFiles)
          .then(function (uploads) {
            addToCart(
              product,
              { title: entry.gammeTitle },
              isImpressionDocumentProduct(product) ? String(documentCopies || 1) : readSelectedQuantity(),
              $("product-notes").value.trim(),
              selectionSummary,
              paperFinish,
              currentPriceValue,
              uploads,
              currentPurchaseValue
            );
            if ($("product-files")) $("product-files").value = "";
            addButton.textContent = "Ajoute au panier";
            setTimeout(function () {
              addButton.textContent = "Ajouter au panier";
            }, 1400);
          })
          .catch(function (error) {
            setStatus(priceStatus, "err", error.message || "Impossible de televerser les fichiers produit.");
            addButton.textContent = "Ajouter au panier";
          })
          .finally(function () {
            addButton.disabled = false;
          });
      });
    }
  }

  function initProductsPage() {
    var filters = $("gamme-filters");
    var grid = $("products-grid");
    var query = new URLSearchParams(window.location.search);
    var gammes = [];
    var activeGamme = query.get("gamme") || "";
    var searchQuery = (query.get("q") || "").toLowerCase().trim();

    function renderFilters() {
      if (!filters) return;
      filters.innerHTML = ['<button type="button" class="filter-btn' + (!activeGamme ? " active" : "") + '" data-gamme="">Toutes les gammes</button>'].concat(gammes.map(function (gamme) {
        return '<button type="button" class="filter-btn' + (gamme.slug === activeGamme ? " active" : "") + '" data-gamme="' + esc(gamme.slug) + '">' + esc(gamme.title) + "</button>";
      })).join("");
    }

    function getVisibleProducts() {
      return flattenProducts().filter(function (entry) {
        var sameGamme = !activeGamme || entry.gammeSlug === activeGamme;
        var haystack = [entry.gammeTitle, entry.product.title, entry.product.summary, (entry.product.tags || []).join(" ")].join(" ").toLowerCase();
        var sameSearch = !searchQuery || haystack.indexOf(searchQuery) !== -1;
        return sameGamme && sameSearch;
      });
    }

    function getActiveGamme() {
      return gammes.find(function (gamme) {
        return gamme.slug === activeGamme;
      }) || null;
    }

    function renderGrid() {
      if (!grid) return;
      var visible = getVisibleProducts();
      var currentGamme = getActiveGamme();

      if (currentGamme && currentGamme.comingSoon && !searchQuery) {
        grid.innerHTML = '<div class="empty-state">Cette gamme sera ajoutee prochainement au catalogue en ligne.</div>';
        return;
      }

      if (!visible.length) {
        grid.innerHTML = '<div class="empty-state">Aucun produit ne correspond a cette recherche.</div>';
        return;
      }

      grid.innerHTML = visible.map(function (entry) {
        return '<article class="card product-card">'
          + (entry.product.imageUrl ? '<div class="product-card-media"><img src="' + esc(entry.product.imageUrl) + '" alt="' + esc(entry.product.title) + '"></div>' : '')
          + '<div class="pill">' + esc(entry.gammeTitle) + '</div>'
          + '<h3 class="card-title">' + esc(entry.product.title) + '</h3>'
          + '<p>' + esc(entry.product.summary) + '</p>'
          + '<div class="product-price">' + esc(normalizePriceLabel(entry.product.priceLabel)) + '</div>'
          + '<footer>'
            + '<button type="button" class="btn-light" data-open-product="' + esc(entry.product.id) + '">Voir le detail</button>'
          + '</footer>'
        + '</article>';
      }).join("");

      grid.querySelectorAll("[data-open-product]").forEach(function (button) {
        button.addEventListener("click", function () {
          goTo(buildProductUrl(activeGamme, button.getAttribute("data-open-product")));
        });
      });
    }

    if (filters) {
      filters.addEventListener("click", function (event) {
        var button = event.target.closest("[data-gamme]");
        if (!button) return;
        activeGamme = button.getAttribute("data-gamme");
        renderFilters();
        renderGrid();
      });
    }
    loadCatalogFromApi().then(function (catalog) {
      gammes = (catalog && catalog.gammes) || [];
      if (!activeGamme && !searchQuery) {
        activeGamme = gammes[0] && gammes[0].slug;
      }
      renderFilters();
      renderGrid();
    });
  }

  function initProductPage() {
    var root = $("product-page-root");
    if (!root) return;
    var query = new URLSearchParams(window.location.search);
    var productId = query.get("produit") || "";
    var gammeSlug = query.get("gamme") || "";
    var backLink = $("product-back-link");

    loadCatalogFromApi().then(function (catalog) {
      var gammes = (catalog && catalog.gammes) || [];
      var entry = findProduct(productId);
      if (!entry && gammeSlug) {
        gammes.some(function (gamme) {
          if (gamme.slug !== gammeSlug) return false;
          if (!gamme.products || !gamme.products.length) return false;
          entry = {
            gammeSlug: gamme.slug,
            gammeTitle: gamme.title,
            gammeDescription: gamme.description,
            gammeLegacyCat: gamme.legacyCat,
            product: gamme.products[0]
          };
          return true;
        });
      }

      if (backLink) {
        backLink.setAttribute("href", resolveAppUrl("/produits" + (entry ? "?gamme=" + encodeURIComponent(entry.gammeSlug) : "")));
      }

      mountProductDetail(root, entry);
    });
  }

  function renderProductHeroMedia(entry) {
    if (!entry || !entry.product) return '';
    if (entry.product.imageUrl) {
      return '<div class="product-hero-media"><img src="' + esc(entry.product.imageUrl) + '" alt="' + esc(entry.product.title || 'Produit') + '"></div>';
    }
    return '';
  }

  function initCartPage() {
    var list = $("cart-items");
    var total = $("cart-total");
    var empty = $("cart-empty");
    var mainView = $("cart-main-view");
    var successView = $("order-success-view");
    var successSummary = $("order-success-summary");
    var goProducts = $("cart-go-products");
    var validateBtn = $("cart-validate");
    var validateStatus = $("cart-validate-status");
    var guestFields = $("cart-guest-fields");
    var clientSummary = $("cart-client-summary");
    var authModal = $("checkout-auth-modal");
    var authStatus = $("checkout-auth-status");
    var paymentModal = $("checkout-payment-modal");
    var paymentTotal = $("checkout-payment-total");
    var sumupBtn = $("cart-pay");
    var sumupStatus = $("sumup-status");
    var sumupWidget = null;
    var currentSumupCheckoutId = "";
    var currentSumupAmount = null;
    var sessionToken = localStorage.getItem(SESSION_KEY);
    var connectedClient = null;
    var cartValidated = false;
    var appliedPromo = null;
    var selectedPaymentMethod = "CB";
    var SUMUP_PENDING_KEY = "ci_sumup_pending_checkout";
    var minimumAlert = $("cart-minimum-alert");
    var footerMinimumAlert = $("cart-footer-minimum-alert");

    if (goProducts) {
      goProducts.addEventListener("click", function () {
        goTo("/produits");
      });
    }

    function invalidateCheckout() {
      cartValidated = false;
      appliedPromo = null;
      clearStatus(validateStatus);
      clearStatus(sumupStatus);
      updatePayableTotal();
    }

    function getBaseCartTotalInfo() {
      return getCartTotal(readCart());
    }

    function getPayableTotalInfo() {
      var totalInfo = getBaseCartTotalInfo();
      if (typeof totalInfo.numeric !== "number") return totalInfo;
      if (!appliedPromo || !appliedPromo.discount) return totalInfo;
      var discounted = Math.max(0, totalInfo.numeric * (1 - (appliedPromo.discount / 100)));
      return {
        numeric: Math.round(discounted * 100) / 100,
        label: euro(Math.round(discounted * 100) / 100)
      };
    }

    function updatePayableTotal() {
      var payable = getPayableTotalInfo();
      var underSumupMinimum = typeof payable.numeric === "number" && payable.numeric > 0 && payable.numeric < 1;
      if ($("cart-payable-total")) $("cart-payable-total").textContent = payable.label || "0,00 EUR";
      if (paymentTotal) paymentTotal.textContent = payable.label || "0,00 EUR";
      if (minimumAlert) minimumAlert.hidden = !underSumupMinimum;
      if (footerMinimumAlert) footerMinimumAlert.hidden = !underSumupMinimum;
      if (validateBtn) validateBtn.disabled = underSumupMinimum && selectedPaymentMethod === "CB";
      if (sumupBtn) sumupBtn.disabled = underSumupMinimum;
    }

    function openAuthModal() {
      if (authModal) {
        authModal.hidden = false;
        authModal.removeAttribute("hidden");
        authModal.classList.add("open");
      }
      clearStatus(authStatus);
    }

    function closeAuthModal() {
      if (authModal) {
        authModal.hidden = true;
        authModal.setAttribute("hidden", "hidden");
        authModal.classList.remove("open");
      }
      clearStatus(authStatus);
    }

    function openPaymentModal() {
      if (paymentModal) {
        paymentModal.hidden = false;
        paymentModal.removeAttribute("hidden");
        paymentModal.classList.add("open");
      }
      clearStatus(sumupStatus);
      updatePayableTotal();
    }

    function closePaymentModal() {
      if (paymentModal) {
        paymentModal.hidden = true;
        paymentModal.setAttribute("hidden", "hidden");
        paymentModal.classList.remove("open");
      }
      clearStatus(sumupStatus);
    }

    function resetPaymentButton() {
      if (!sumupBtn) return;
      sumupBtn.disabled = false;
      sumupBtn.textContent = "Payer avec SumUp";
    }

    function renderOrderSuccess(orderData) {
      if (mainView) mainView.hidden = true;
      if (successView) successView.hidden = false;
      if (!successSummary) return;
      var rows = (orderData && orderData.rows) || [];
      successSummary.innerHTML =
        '<div class="summary-box">'
          + '<div class="split-line"><strong>Client</strong><span>' + esc(orderData.customerName || "") + '</span></div>'
          + (orderData.numero ? '<div class="split-line"><strong>Commande</strong><span>' + esc(orderData.numero) + '</span></div>' : '')
          + (orderData.codeAcces ? '<div class="split-line"><strong>Code suivi</strong><span>' + esc(orderData.codeAcces) + '</span></div>' : '')
          + '<div class="split-line"><strong>Email</strong><span>' + esc(orderData.customerEmail || "") + '</span></div>'
          + '<div class="split-line"><strong>' + esc(orderData.paymentStatus === "paye" ? "Total regle" : "Total TTC") + '</strong><span class="product-price">' + esc(orderData.totalLabel || "0,00 EUR") + '</span></div>'
          + (orderData.paymentMethod ? '<div class="split-line"><strong>Paiement</strong><span>' + esc(orderData.paymentMethod) + '</span></div>' : '')
          + (orderData.paymentStatus === "paye" ? '<div class="split-line"><strong>Points fidelite</strong><span>' + esc(String(orderData.pointsAdded || 0)) + ' point(s)' + (orderData.loyaltyTotal != null ? ' · Total : ' + esc(String(orderData.loyaltyTotal)) : '') + '</span></div>' : '')
          + '<div class="split-line"><strong>Email client</strong><span>' + esc(orderData.clientMailSent ? "Envoye" : "Non confirme") + '</span></div>'
          + (orderData.promoCode ? '<div class="split-line"><strong>Code reduction</strong><span>' + esc(orderData.promoCode) + ' · ' + esc(String(orderData.promoDiscount || 0)) + '%</span></div>' : '')
        + '</div>'
        + '<div class="cart-table">'
          + '<div class="cart-table-head cart-table-row">'
            + '<div>Produit</div><div class="cart-file-cell">Fichier</div><div class="cart-total-cell">Total TTC</div><div></div>'
          + '</div>'
          + '<div class="cart-table-body">'
            + rows.map(function (item) {
              return '<div class="cart-table-row">'
                + '<div class="cart-label"><div class="cart-cell-value"><strong>' + esc(item.title || "") + '</strong><div class="muted">' + esc(item.ref || "") + '</div>' + (item.quantity ? '<div class="muted">Quantite: ' + esc(item.quantity) + '</div>' : '') + (item.deliveryDate ? '<div class="muted">Livraison estimee: ' + esc(item.deliveryDate) + '</div>' : '') + '</div></div>'
                + '<div class="cart-file-cell"><span class="cart-cell-value">' + esc(((item.uploadNames || []).length ? item.uploadNames.join(", ") : "Aucun fichier")) + '</span></div>'
                + '<div class="cart-total-cell product-price"><span class="cart-cell-value">' + esc(item.priceValue != null ? euro(item.priceValue) : item.priceLabel || "-") + '</span></div>'
                + '<div></div>'
              + '</div>';
            }).join("")
          + '</div>'
        + '</div>';
    }

    function renderClientIdentity() {
      if (!clientSummary || !guestFields) return;

      if (connectedClient) {
        var addressBits = [connectedClient.adresse, connectedClient.cp, connectedClient.ville].filter(Boolean);
        clientSummary.hidden = false;
        guestFields.hidden = true;
        clientSummary.innerHTML =
          '<div class="pill">Client connecte</div>'
          + '<div class="client-summary-name">' + esc([connectedClient.prenom, connectedClient.nom].filter(Boolean).join(" ").trim() || connectedClient.email || "Client") + '</div>'
          + '<div class="muted">' + esc(connectedClient.email || "") + '</div>'
          + (addressBits.length
            ? '<div class="muted">' + esc(addressBits.join(" ")) + '</div>'
            : '<div class="muted">Les coordonnees de votre compte seront utilisees pour la commande.</div>')
          + '<div class="client-summary-link"><a href="' + esc(resolveAppUrl("/client")) + '">Modifier mes informations</a></div>';
      } else {
        clientSummary.hidden = true;
        clientSummary.innerHTML = "";
        guestFields.hidden = false;
      }
      renderPaymentMethods();
    }

    function clientPaymentMode() {
      return String((connectedClient && connectedClient.mode_reglement) || "CB").trim() || "CB";
    }

    function isPaymentMethodAllowed(method) {
      if (method === "CB") return true;
      return !!connectedClient && clientPaymentMode() === method;
    }

    function renderPaymentMethods() {
      var buttons = document.querySelectorAll("[data-payment-method]");
      if (!buttons.length) return;
      if (!isPaymentMethodAllowed(selectedPaymentMethod)) selectedPaymentMethod = "CB";
      buttons.forEach(function (button) {
        var method = button.getAttribute("data-payment-method") || "CB";
        var allowed = isPaymentMethodAllowed(method);
        button.disabled = !allowed;
        button.classList.toggle("active", selectedPaymentMethod === method);
        button.title = allowed ? "" : "Ce moyen de paiement doit etre active dans votre fiche client.";
      });
      if (validateBtn) validateBtn.textContent = selectedPaymentMethod === "CB" ? "Paiement" : "Valider la commande";
      updatePayableTotal();
    }

    function getCustomerDetails(targetStatus) {
      if (connectedClient) {
        if (!connectedClient.email) {
          setStatus(targetStatus || validateStatus, "err", "Votre compte est incomplet. Merci de verifier vos informations client.");
          return null;
        }
        return {
          prenom: (connectedClient.prenom || "").trim(),
          nom: (connectedClient.nom || "").trim(),
          email: (connectedClient.email || "").trim(),
          tel: (connectedClient.telephone || connectedClient.tel || "").trim(),
          adresse: [connectedClient.adresse, connectedClient.cp, connectedClient.ville].filter(Boolean).join(", ")
        };
      }

      var prenomField = $("checkout-prenom");
      var nomField = $("checkout-nom");
      var emailField = $("checkout-email");
      var telField = $("checkout-tel");
      var adresseField = $("checkout-adresse");
      var prenom = prenomField ? prenomField.value.trim() : "";
      var nom = nomField ? nomField.value.trim() : "";
      var email = emailField ? emailField.value.trim() : "";
      var tel = telField ? telField.value.trim() : "";
      var adresse = adresseField ? adresseField.value.trim() : "";

      if (!prenom || !nom || !email) {
        setStatus(targetStatus || validateStatus, "err", "Prenom, nom et email sont obligatoires pour valider le panier.");
        return null;
      }

      return {
        prenom: prenom,
        nom: nom,
        email: email,
        tel: tel,
        adresse: adresse
      };
    }

    function renderCart() {
      var cart = readCart();
      var totalInfo = getCartTotal(cart);
      invalidateCheckout();
      if (!cart.length) {
        if (empty) empty.hidden = false;
        if (list) list.innerHTML = "";
        if (total) total.textContent = "0,00 EUR";
        updatePayableTotal();
        return;
      }

      if (empty) empty.hidden = true;
      if (total) total.textContent = totalInfo.label;
      updatePayableTotal();

      if (list) {
        list.innerHTML =
          '<div class="cart-table">'
            + '<div class="cart-table-head cart-table-row">'
              + '<div>Produit</div>'
              + '<div class="cart-file-cell">Fichier</div>'
              + '<div class="cart-total-cell">Total TTC</div>'
              + '<div class="cart-action">Action</div>'
            + '</div>'
            + '<div class="cart-table-body">'
              + cart.map(function (item) {
                return '<div class="cart-table-row">'
                  + '<div class="cart-label"><span class="cart-mobile-label">Produit</span><div class="cart-cell-value"><strong>' + esc(item.title) + '</strong><div class="muted">' + esc(item.ref || getProductRef(item)) + '</div>' + (item.quantity ? '<div class="muted">Quantite: ' + esc(item.quantity) + '</div>' : '') + (item.paperFinish ? '<div class="muted">' + esc(item.paperFinish) + '</div>' : '') + (item.deliveryDate ? '<div class="muted">Livraison estimee: ' + esc(item.deliveryDate) + '</div>' : '') + '</div></div>'
                  + '<div class="cart-file-cell"><span class="cart-mobile-label">Fichier</span><span class="cart-cell-value">' + esc(((item.uploadNames || []).length ? item.uploadNames.join(", ") : "Aucun fichier")) + '</span></div>'
                  + '<div class="cart-total-cell product-price"><span class="cart-mobile-label">Total TTC</span><span class="cart-cell-value">' + esc(item.priceValue != null ? euro(item.priceValue) : item.priceLabel || "-") + '</span></div>'
                  + '<div class="cart-action"><span class="cart-mobile-label">Action</span><span class="cart-cell-value"><button class="cart-remove-btn" type="button" data-remove-cart="' + esc(item.id) + '" aria-label="Supprimer">×</button></span></div>'
                + '</div>';
              }).join("")
            + '</div>'
            + '<div class="cart-table-foot">'
              + '<div class="cart-table-row">'
                + '<div><strong>Total TTC</strong></div>'
                + '<div></div>'
                + '<div class="cart-total-cell total">' + esc(totalInfo.label) + '</div>'
                + '<div></div>'
              + '</div>'
            + '</div>'
          + '</div>';

        list.querySelectorAll("[data-remove-cart]").forEach(function (button) {
          button.addEventListener("click", function () {
            var removed = null;
            var cartItems = readCart().filter(function (item) {
              if (item.id === button.getAttribute("data-remove-cart")) {
                removed = item;
                return false;
              }
              return true;
            });
            (removed && removed.uploadTokens || []).forEach(function (token) {
              fetch(API_BASE + "/api/cart-upload/" + encodeURIComponent(token), { method: "DELETE" }).catch(function () {});
            });
            writeCart(cartItems);
            renderCart();
          });
        });
      }
    }

    function ensureSumupWidget() {
      if (!paymentModal || paymentModal.hidden || !window.SumUpCard) {
        setStatus(sumupStatus, "err", "Le module de paiement SumUp ne s'est pas charge.");
        return Promise.reject(new Error("SumUp indisponible."));
      }
      var totalInfo = getPayableTotalInfo();
      if (typeof totalInfo.numeric !== "number") {
        setStatus(sumupStatus, "err", "Le paiement CB est disponible uniquement pour les produits a tarif chiffre.");
        return Promise.reject(new Error("Montant SumUp invalide."));
      }
      if (sumupWidget && currentSumupCheckoutId && currentSumupAmount === totalInfo.numeric) {
        return Promise.resolve(sumupWidget);
      }
      var mount = paymentModal.querySelector("#sumup-card-element");
      if (!mount) {
        setStatus(sumupStatus, "err", "Le champ de carte bancaire est introuvable.");
        return Promise.reject(new Error("Champ SumUp introuvable."));
      }
      mount.innerHTML = "";
      function verifySumupCheckout(attempt) {
        return fetch(API_BASE + "/api/sumup/verify-checkout/" + encodeURIComponent(currentSumupCheckoutId))
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (payload) {
              if (!response.ok || !payload.success) throw new Error(payload.error || ("HTTP " + response.status));
              return payload;
            });
          })
          .then(function (payload) {
            if (payload.paid) return payload;
            var status = String(payload.status || "").toUpperCase();
            if (status === "FAILED" || status === "CANCELLED" || status === "DECLINED") {
              throw new Error("Paiement refuse ou annule par SumUp. Statut : " + status + ".");
            }
            if (attempt >= 8) {
              throw new Error(status ? ("Paiement non valide chez SumUp. Statut : " + status + ".") : "Le paiement SumUp n'est pas encore valide.");
            }
            return new Promise(function (resolve) {
              setTimeout(resolve, 1500);
            }).then(function () {
              return verifySumupCheckout(attempt + 1);
            });
          });
      }
      return fetch(API_BASE + "/api/sumup/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalInfo.numeric,
          currency: "EUR",
          description: "Commande COM' Impression"
        })
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok || !json.success) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          currentSumupCheckoutId = json.checkoutId || "";
          currentSumupAmount = totalInfo.numeric;
          sumupWidget = window.SumUpCard.mount({
            id: "sumup-card-element",
            checkoutId: currentSumupCheckoutId,
            showSubmitButton: false,
            onResponse: function (type, body) {
              var responseType = String(type || "").toLowerCase();
              var responseMessage = body && (body.message || body.error_message || body.error || body.detail);
              if (responseType === "invalid") {
                setStatus(sumupStatus, "err", "Les coordonnees bancaires sont invalides.");
                resetPaymentButton();
                return;
              }
              if (responseType === "sent") {
                setStatus(sumupStatus, "ok", "Paiement transmis a SumUp, verification en cours...");
                return;
              }
              if (responseType === "auth-screen") {
                setStatus(sumupStatus, "ok", "Validation bancaire en cours...");
                return;
              }
              if (responseType === "failure" || responseType === "failed" || responseType === "error") {
                setStatus(sumupStatus, "err", responseMessage || "Paiement refuse ou annule par SumUp.");
                resetPaymentButton();
                return;
              }
              if (responseType !== "success") {
                setStatus(sumupStatus, "err", responseMessage || "Reponse SumUp inconnue. Le paiement n'a pas ete valide.");
                resetPaymentButton();
                return;
              }
              verifySumupCheckout(1)
                .then(function () {
                  return submitOrder({
                    payment_id: currentSumupCheckoutId,
                    payment_status: "paye"
                  });
                })
                .then(function () {
                  setStatus(validateStatus, "ok", "Paiement accepte et commande enregistree.");
                  setStatus(sumupStatus, "ok", "Paiement SumUp accepte.");
                })
                .catch(function (error) {
                  setStatus(sumupStatus, "err", error.message || "Impossible de finaliser le paiement SumUp.");
                })
                .finally(function () {
                  resetPaymentButton();
                });
            }
          });
          return sumupWidget;
        });
    }

    function validateCheckoutBasics(targetStatus) {
      clearStatus(targetStatus || validateStatus);
      var cart = readCart();
      if (!cart.length) {
        setStatus(targetStatus || validateStatus, "err", "Votre panier est vide.");
        return false;
      }
      if (!getCustomerDetails(targetStatus || validateStatus)) {
        return false;
      }
      return true;
    }

    function confirmValidatedCheckout(targetStatus) {
      if (!connectedClient) {
        openAuthModal();
        setStatus(targetStatus || validateStatus, "err", "Connectez-vous ou creez votre compte avant de valider le panier.");
        return false;
      }
      if (!validateCheckoutBasics(targetStatus || validateStatus)) return false;
      cartValidated = true;
      var totalInfo = getPayableTotalInfo();
      if (typeof totalInfo.numeric !== "number") {
        setStatus(targetStatus || validateStatus, "err", "Le paiement CB est disponible uniquement pour les produits a tarif chiffre.");
        return false;
      }
      if (totalInfo.numeric < 1) {
        setStatus(targetStatus || validateStatus, "err", "Le paiement SumUp est autorise uniquement a partir de 1,00 EUR.");
        return false;
      }
      setStatus(targetStatus || validateStatus, "ok", "Panier valide. Redirection vers SumUp en cours.");
      return true;
    }

    function startHostedSumupCheckout(targetStatus) {
      if (!confirmValidatedCheckout(targetStatus || sumupStatus)) return Promise.resolve(false);
      var totalInfo = getPayableTotalInfo();
      if (typeof totalInfo.numeric !== "number") {
        setStatus(targetStatus || sumupStatus, "err", "Le paiement CB est disponible uniquement pour les produits a tarif chiffre.");
        return Promise.resolve(false);
      }
      var pending = {
        createdAt: Date.now(),
        amount: totalInfo.numeric,
        totalLabel: totalInfo.label,
        promo: appliedPromo,
        rows: readCart()
      };
      setStatus(targetStatus || sumupStatus, "ok", "Ouverture de la page SumUp...");
      return fetch(API_BASE + "/api/sumup/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalInfo.numeric,
          currency: "EUR",
          description: "Commande COM' Impression",
          hosted: true,
          redirect_url: window.location.origin + resolveAppUrl("/panier?sumup_return=1")
        })
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok || !json.success) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          if (!json.hostedCheckoutUrl) throw new Error("SumUp n'a pas renvoye de page de paiement.");
          pending.checkoutId = json.checkoutId || "";
          sessionStorage.setItem(SUMUP_PENDING_KEY, JSON.stringify(pending));
          window.location.href = json.hostedCheckoutUrl;
          return true;
        })
        .catch(function (error) {
          setStatus(targetStatus || sumupStatus, "err", error.message || "Impossible d'ouvrir SumUp.");
          resetPaymentButton();
          return false;
        });
    }

    function submitDeferredPaymentOrder(method, targetStatus) {
      if (!connectedClient) {
        openAuthModal();
        setStatus(targetStatus || validateStatus, "err", "Connectez-vous ou creez votre compte avant de valider le panier.");
        return Promise.resolve(false);
      }
      if (!isPaymentMethodAllowed(method)) {
        setStatus(targetStatus || validateStatus, "err", "Ce moyen de paiement n'est pas active sur votre fiche client.");
        return Promise.resolve(false);
      }
      if (!validateCheckoutBasics(targetStatus || validateStatus)) return Promise.resolve(false);
      setStatus(targetStatus || validateStatus, "ok", "Enregistrement de la commande...");
      return submitOrder({
        mode_reglement: method,
        payment_status: method === "Administration Chorus" ? "attente_chorus" : "attente_virement"
      }).then(function () {
        setStatus(targetStatus || validateStatus, "ok", "Commande enregistree. Paiement : " + method + ".");
        return true;
      }).catch(function (error) {
        setStatus(targetStatus || validateStatus, "err", error.message || "Impossible d'enregistrer la commande.");
        return false;
      });
    }

    function handleHostedSumupReturn() {
      var query = new URLSearchParams(window.location.search || "");
      if (!query.get("sumup_return")) return Promise.resolve(false);

      var pending = {};
      try {
        pending = JSON.parse(sessionStorage.getItem(SUMUP_PENDING_KEY) || "{}") || {};
      } catch (error) {
        pending = {};
      }

      var checkoutId = query.get("checkout_id") || query.get("checkoutId") || pending.checkoutId || "";
      if (!checkoutId) {
        setStatus(validateStatus, "err", "Retour SumUp sans reference de paiement.");
        return Promise.resolve(false);
      }

      appliedPromo = pending.promo || null;
      updatePayableTotal();
      setStatus(validateStatus, "ok", "Retour SumUp recu. Verification du paiement...");

      return fetch(API_BASE + "/api/sumup/verify-checkout/" + encodeURIComponent(checkoutId))
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok || !json.success) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (payload) {
          var status = String((payload && payload.status) || "").toUpperCase();
          if (!payload || !payload.paid) {
            sessionStorage.removeItem(SUMUP_PENDING_KEY);
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, "", resolveAppUrl("/panier"));
            }
            setStatus(validateStatus, "err", status ? ("Paiement refuse ou non valide. Statut SumUp : " + status + ".") : "Paiement refuse ou non valide.");
            return false;
          }

          return submitOrder({
            payment_id: checkoutId,
            payment_status: "paye"
          }).then(function () {
            sessionStorage.removeItem(SUMUP_PENDING_KEY);
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, "", resolveAppUrl("/panier"));
            }
            setStatus(validateStatus, "ok", "Paiement accepte et commande enregistree.");
            return true;
          });
        })
        .catch(function (error) {
          setStatus(validateStatus, "err", error.message || "Impossible de verifier le paiement SumUp.");
          return false;
        });
    }

    function submitOrder(paymentMeta) {
      if (!getCustomerDetails(validateStatus)) return Promise.reject(new Error("Coordonnees client invalides."));
      var orderSnapshot = {
        rows: readCart().slice(),
        totalLabel: getPayableTotalInfo().label,
        customerName: (connectedClient ? [connectedClient.prenom, connectedClient.nom].filter(Boolean).join(" ").trim() : [($("checkout-prenom") || {}).value, ($("checkout-nom") || {}).value].join(" ").trim()),
        customerEmail: connectedClient ? (connectedClient.email || "") : ((($("checkout-email") || {}).value) || "").trim(),
        paymentMethod: (paymentMeta && paymentMeta.mode_reglement) || "CB",
        paymentStatus: (paymentMeta && paymentMeta.payment_status) || "",
        promoCode: appliedPromo && appliedPromo.code,
        promoDiscount: appliedPromo && appliedPromo.discount
      };
      return fetch(API_BASE + "/api/devis", {
        method: "POST",
        body: buildCheckoutFormData(paymentMeta)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (data) {
          writeCart([]);
          ["checkout-prenom", "checkout-nom", "checkout-email", "checkout-tel", "checkout-adresse"].forEach(function (id) {
            if (!connectedClient && $(id)) $(id).value = "";
          });
          if ($("checkout-message")) $("checkout-message").value = "";
          if ($("checkout-promo")) $("checkout-promo").value = "";
          appliedPromo = null;
          closePaymentModal();
          renderCart();
          orderSnapshot.clientMailSent = !!(data && data.clientMailSent);
          orderSnapshot.clientMailError = (data && data.clientMailError) || "";
          orderSnapshot.numero = (data && data.numero) || "";
          orderSnapshot.codeAcces = (data && data.codeAcces) || "";
          orderSnapshot.pointsAdded = Number((data && data.pointsAdded) || 0);
          orderSnapshot.loyaltyTotal = data && data.loyaltyTotal;
          orderSnapshot.loyaltyCode = data && data.loyaltyCode;
          renderOrderSuccess(orderSnapshot);
          return true;
        });
    }

    function buildCheckoutFormData(paymentMeta) {
      var cart = readCart();
      var customer = getCustomerDetails(validateStatus) || {};
      var formData = new FormData();
      formData.append("prenom", customer.prenom || "");
      formData.append("nom", customer.nom || "");
      formData.append("email", customer.email || "");
      formData.append("tel", customer.tel || "");
      formData.append("adresse", customer.adresse || "");
      formData.append("message", $("checkout-message").value.trim());
      formData.append("panier", buildPanierText(cart));
      formData.append("panier_json", JSON.stringify(buildOrderRows(cart)));
      formData.append("cart_upload_tokens", JSON.stringify(cart.reduce(function (tokens, item) {
        return tokens.concat(item.uploadTokens || []);
      }, [])));
      formData.append("prix_total", getPayableTotalInfo().label);
      formData.append("source", "com-impression");
      if (appliedPromo && appliedPromo.code) {
        formData.append("promo_code", appliedPromo.code);
        formData.append("promo_discount", String(appliedPromo.discount || 0));
      }
      if (paymentMeta && paymentMeta.payment_id) formData.append("payment_id", paymentMeta.payment_id);
      if (paymentMeta && paymentMeta.payment_status) formData.append("payment_status", paymentMeta.payment_status);
      if (paymentMeta && paymentMeta.mode_reglement) formData.append("mode_reglement", paymentMeta.mode_reglement);
      return formData;
    }

    if (validateBtn) {
      validateBtn.addEventListener("click", function () {
        if (selectedPaymentMethod === "CB") {
          startHostedSumupCheckout(validateStatus);
          return;
        }
        submitDeferredPaymentOrder(selectedPaymentMethod, validateStatus);
      });
    }

    document.querySelectorAll("[data-payment-method]").forEach(function (button) {
      button.addEventListener("click", function () {
        var method = button.getAttribute("data-payment-method") || "CB";
        if (!isPaymentMethodAllowed(method)) {
          setStatus(validateStatus, "err", "Ce moyen de paiement doit etre active dans votre fiche client.");
          renderPaymentMethods();
          return;
        }
        selectedPaymentMethod = method;
        clearStatus(validateStatus);
        renderPaymentMethods();
      });
    });

    if ($("checkout-auth-close")) $("checkout-auth-close").addEventListener("click", closeAuthModal);
    if ($("checkout-open-login")) $("checkout-open-login").addEventListener("click", function () {
      if ($("checkout-login-block")) $("checkout-login-block").hidden = false;
      if ($("checkout-register-block")) $("checkout-register-block").hidden = true;
    });
    if ($("checkout-open-register")) $("checkout-open-register").addEventListener("click", function () {
      if ($("checkout-login-block")) $("checkout-login-block").hidden = true;
      if ($("checkout-register-block")) $("checkout-register-block").hidden = false;
    });
    if ($("checkout-login-btn")) {
      $("checkout-login-btn").addEventListener("click", function () {
        clearStatus(authStatus);
        fetch(API_BASE + "/api/client/password-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: (($("checkout-login-email") || {}).value || "").trim(),
            password: (($("checkout-login-password") || {}).value || "")
          })
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (json) {
              if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
              return json;
            });
          })
          .then(function (json) {
            sessionToken = json.session_token;
            localStorage.setItem(SESSION_KEY, json.session_token);
            localStorage.setItem(USER_NAME_KEY, [json.client.prenom, json.client.nom].filter(Boolean).join(" ").trim() || json.client.email || "Mon compte");
            connectedClient = json.client || null;
            updateHeaderState();
            renderClientIdentity();
            closeAuthModal();
            setStatus(validateStatus, "ok", "Connexion reussie. Tu peux valider le panier.");
          })
          .catch(function (error) {
            setStatus(authStatus, "err", error.message || "Connexion impossible.");
          });
      });
    }
    if ($("checkout-register-btn")) {
      $("checkout-register-btn").addEventListener("click", function () {
        clearStatus(authStatus);
        fetch(API_BASE + "/api/client/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type_client: (($("checkout-register-type") || {}).value || "").trim(),
            prenom: (($("checkout-register-prenom") || {}).value || "").trim(),
            nom: (($("checkout-register-nom") || {}).value || "").trim(),
            email: (($("checkout-register-email") || {}).value || "").trim(),
            societe: (($("checkout-register-societe") || {}).value || "").trim(),
            siret: (($("checkout-register-siret") || {}).value || "").trim(),
            password: (($("checkout-register-password") || {}).value || ""),
            password2: (($("checkout-register-password2") || {}).value || ""),
            adresse: "",
            cp: "",
            ville: "",
            account_request: !!(($("checkout-register-account-request") || {}).checked),
            account_payment_mode: (($("checkout-register-account-payment") || {}).value || "").trim(),
            account_contact: (($("checkout-register-account-contact") || {}).value || "").trim(),
            account_email: (($("checkout-register-account-email") || {}).value || "").trim(),
            account_info: (($("checkout-register-account-info") || {}).value || "").trim()
          })
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (json) {
              if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
              return json;
            });
          })
          .then(function () {
            setStatus(authStatus, "ok", "Compte cree. Confirmez votre email puis connectez-vous.");
          })
          .catch(function (error) {
            setStatus(authStatus, "err", error.message || "Inscription impossible.");
          });
      });
    }

    if ($("checkout-promo-apply")) {
      $("checkout-promo-apply").addEventListener("click", function () {
        if (!connectedClient) {
          setStatus(validateStatus, "err", "Connectez-vous a votre compte pour appliquer un code reduction.");
          return;
        }
        var code = (($("checkout-promo") || {}).value || "").trim();
        if (!code) {
          setStatus(validateStatus, "err", "Entrez un code reduction.");
          return;
        }
        fetch(API_BASE + "/api/client/code-promo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-token": sessionToken || ""
          },
          body: JSON.stringify({ code: code })
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (json) {
              if (!response.ok || !json.success) throw new Error(json.error || ("HTTP " + response.status));
              return json;
            });
          })
          .then(function (json) {
            appliedPromo = {
              code: code,
              discount: Number(json.remise || 0)
            };
            updatePayableTotal();
            setStatus(validateStatus, "ok", "Code applique : " + appliedPromo.discount + "% de remise.");
          })
          .catch(function (error) {
            setStatus(validateStatus, "err", error.message || "Impossible d'appliquer ce code.");
          });
      });
    }

    if ($("checkout-payment-close")) $("checkout-payment-close").addEventListener("click", closePaymentModal);

    if (sumupBtn) {
      sumupBtn.addEventListener("click", function () {
        if (!validateCheckoutBasics(sumupStatus)) return;
        sumupBtn.disabled = true;
        sumupBtn.textContent = "Ouverture SumUp...";
        clearStatus(sumupStatus);
        startHostedSumupCheckout(sumupStatus)
          .then(function (redirected) {
            if (!redirected) resetPaymentButton();
          });
      });
    }

    ["checkout-prenom", "checkout-nom", "checkout-email", "checkout-tel", "checkout-adresse"].forEach(function (id) {
      var field = $(id);
      if (field) field.addEventListener("input", invalidateCheckout);
    });

    function loadConnectedClient() {
      renderClientIdentity();
      if (!sessionToken) return Promise.resolve();

      return fetch(API_BASE + "/api/client/me", {
        headers: { "x-session-token": sessionToken }
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          connectedClient = json.client || null;
          renderClientIdentity();
        })
        .catch(function () {
          connectedClient = null;
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(USER_NAME_KEY);
          updateHeaderState();
          renderClientIdentity();
        });
    }

    renderCart();
    loadConnectedClient().then(handleHostedSumupReturn);
  }

  function initClientPage() {
    var authView = $("client-auth-view");
    var dashboardView = $("client-dashboard-view");
    var COOKIE_KEY = "ci_cookie_consent";

    function renderCookieBanner() {
      var banner = $("cookie-banner");
      var accept = $("cookie-accept");
      var essential = $("cookie-essential");
      var customize = $("cookie-customize");
      var save = $("cookie-save");
      var options = $("cookie-options");
      var analytics = $("cookie-analytics");
      var personalization = $("cookie-personalization");
      if (!banner || !accept || !essential || !customize || !save || !options) return;
      try {
        var stored = JSON.parse(localStorage.getItem(COOKIE_KEY) || "null");
        if (stored && stored.essential) {
          banner.hidden = true;
          return;
        }
      } catch (error) {}

      function persistCookieChoice(choice) {
        localStorage.setItem(COOKIE_KEY, JSON.stringify(choice));
        banner.hidden = true;
      }

      banner.hidden = false;
      accept.onclick = function () {
        persistCookieChoice({
          essential: true,
          analytics: true,
          personalization: true
        });
      };
      essential.onclick = function () {
        persistCookieChoice({
          essential: true,
          analytics: false,
          personalization: false
        });
      };
      customize.onclick = function () {
        var isOpen = !options.hidden;
        options.hidden = isOpen;
        save.hidden = isOpen;
        customize.textContent = isOpen ? "Personnaliser" : "Fermer";
      };
      save.onclick = function () {
        persistCookieChoice({
          essential: true,
          analytics: !!(analytics && analytics.checked),
          personalization: !!(personalization && personalization.checked)
        });
      };
    }

    function buildLoyaltyState(points) {
      var tiers = [
        { threshold: 100, discount: 5 },
        { threshold: 250, discount: 15 },
        { threshold: 500, discount: 35 }
      ];
      var value = Number(points || 0);
      var currentDiscount = 0;
      var nextTier = tiers.find(function (tier) { return value < tier.threshold; }) || null;
      tiers.forEach(function (tier) {
        if (value >= tier.threshold) currentDiscount = tier.discount;
      });
      var maxThreshold = tiers[tiers.length - 1].threshold;
      var progress = Math.max(0, Math.min(100, (value / maxThreshold) * 100));
      var caption = nextTier
        ? ("Encore " + Math.max(0, nextTier.threshold - value) + " points pour debloquer " + nextTier.discount + "% de remise.")
        : "Palier maximum atteint : 35% de remise debloques.";
      return {
        progress: progress,
        caption: caption,
        currentDiscount: currentDiscount
      };
    }

    function buildTimeline(status) {
      var current = String(status || "Recue");
      var steps = ["Commande recue", "BAT", "Production", "Livraison", "Terminee"];
      var currentIndex = 0;
      if (/BAT/i.test(current)) currentIndex = 1;
      else if (current === "En production") currentIndex = 2;
      else if (current === "En cours de livraison") currentIndex = 3;
      else if (current === "Expediee") currentIndex = 4;
      else if (current === "Annulee") currentIndex = -1;
      return '<div class="client-timeline">' + steps.map(function (step, index) {
        var classes = "client-step";
        if (currentIndex >= index) classes += " done";
        if (currentIndex === index) classes += " active";
        return '<div class="' + classes + '"><span>' + esc(step) + '</span></div>';
      }).join("") + '</div>';
    }

    function showDashboard(client, commandes) {
      if (authView) authView.hidden = true;
      if (dashboardView) dashboardView.hidden = false;
      localStorage.setItem(USER_NAME_KEY, [client.prenom, client.nom].filter(Boolean).join(" ").trim() || client.email || "Mon compte");
      updateHeaderState();

      $("client-dashboard-name").textContent = [client.prenom, client.nom].filter(Boolean).join(" ").trim() || client.email || "Client";
      $("profile-prenom").value = client.prenom || "";
      $("profile-nom").value = client.nom || "";
      $("profile-email").value = client.email || "";
      $("profile-adresse").value = client.adresse || "";
      $("profile-cp").value = client.cp || "";
      $("profile-ville").value = client.ville || "";
      $("client-points").textContent = String(client.points || 0);
      $("client-order-count").textContent = String(commandes.length || 0);
      var loyalty = buildLoyaltyState(client.points || 0);
      if ($("client-loyalty-fill")) $("client-loyalty-fill").style.width = loyalty.progress + "%";
      if ($("client-loyalty-caption")) $("client-loyalty-caption").textContent = loyalty.caption;
      if ($("client-loyalty-codes")) {
        var activeCodes = (client.codes_promo || []).filter(function (code) { return !code.utilise; });
        $("client-loyalty-codes").innerHTML = activeCodes.length
          ? activeCodes.map(function (code) {
              return '<span class="tag">' + esc(code.code) + ' · ' + esc(String(code.remise)) + '%</span>';
            }).join("")
          : '<span class="muted">Aucune remise debloquee pour le moment.</span>';
      }
      document.querySelectorAll("[data-tier]").forEach(function (node) {
        var threshold = Number(node.getAttribute("data-tier") || 0);
        node.classList.toggle("active", (client.points || 0) >= threshold);
      });

      var rendezvous = commandes.filter(function (cmd) {
        return /^Rendez-vous/i.test(String(cmd.panier || ""));
      });
      var docs = commandes.reduce(function (items, cmd) {
        return items.concat((cmd.documents || []).map(function (doc) {
          return { cmd: cmd, doc: doc };
        }));
      }, []);
      var billingDocs = docs.filter(function (item) {
        return /devis|facture|avoir/i.test(String((item.doc && item.doc.type) || ""));
      });
      var regularOrders = commandes.filter(function (cmd) {
        return !/^Rendez-vous/i.test(String(cmd.panier || ""));
      });

      $("client-rdv-count").textContent = String(rendezvous.length || 0);
      $("client-doc-count").textContent = String(billingDocs.length || 0);

      var rdvList = $("client-rendezvous");
      if (rdvList) {
        rdvList.innerHTML = rendezvous.length ? rendezvous.map(function (cmd) {
          return '<article class="order-row">'
            + '<div class="split-line"><strong>' + esc(cmd.numero) + '</strong><span class="tag">Rendez-vous</span></div>'
            + '<div class="muted">' + esc(cmd.date || "") + '</div>'
            + '<div>' + esc(cmd.panier || "").replace(/\n/g, "<br>") + '</div>'
          + '</article>';
        }).join("") : '<div class="empty-state">Aucun rendez-vous pour le moment.</div>';
      }

      var docList = $("client-documents");
      if (docList) {
        docList.innerHTML = billingDocs.length ? billingDocs.map(function (item) {
          return '<article class="order-row">'
            + '<div class="split-line"><strong>' + esc(item.cmd.numero) + '</strong><span class="tag">' + esc(item.doc.type || "Document") + '</span></div>'
            + '<a class="tag" href="/api/commandes/' + encodeURIComponent(item.cmd.numero) + '/document/' + encodeURIComponent(item.doc.id) + '" target="_blank" rel="noopener">Ouvrir le document</a>'
          + '</article>';
        }).join("") : '<div class="empty-state">Aucun devis ou facture disponible.</div>';
      }

      var list = $("client-orders");
      if (list) {
        list.innerHTML = regularOrders.length ? regularOrders.map(function (cmd) {
          return '<article class="order-row client-order-card">'
            + '<div class="split-line">'
              + '<strong>' + esc(cmd.numero) + '</strong>'
              + '<span class="tag">' + esc(cmd.statut || "Recue") + '</span>'
            + '</div>'
            + buildTimeline(cmd.statut)
            + '<div class="muted">' + esc(cmd.date || "") + '</div>'
            + '<div>' + esc(cmd.panier || "").replace(/\n/g, "<br>") + '</div>'
            + '<div class="split-line"><strong class="product-price">' + esc(cmd.prix_total || "-") + '</strong></div>'
          + '</article>';
        }).join("") : '<div class="empty-state">Aucune commande pour le moment.</div>';
      }
    }

    function loadDashboard(token) {
      return fetch(API_BASE + "/api/client/me", {
        headers: { "x-session-token": token }
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          showDashboard(json.client || {}, json.commandes || []);
        })
        .catch(function () {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(USER_NAME_KEY);
          updateHeaderState();
          if (authView) authView.hidden = false;
          if (dashboardView) dashboardView.hidden = true;
        });
    }

    function finishLogin(payload) {
      localStorage.setItem(SESSION_KEY, payload.session_token);
      localStorage.setItem(USER_NAME_KEY, [payload.client.prenom, payload.client.nom].filter(Boolean).join(" ").trim() || payload.client.email || "Mon compte");
      updateHeaderState();
      loadDashboard(payload.session_token);
    }

    function handleJsonForm(url, body, statusEl, onSuccess) {
      clearStatus(statusEl);
      return fetch(API_BASE + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          if (onSuccess) onSuccess(json);
        })
        .catch(function (error) {
          setStatus(statusEl, "err", error.message || "Erreur reseau.");
        });
    }

    renderCookieBanner();

    $("login-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var statusEl = $("login-status");
      clearStatus(statusEl);
      handleJsonForm("/api/client/password-login", {
        email: $("login-email").value.trim(),
        password: $("login-password").value
      }, statusEl, function (json) {
        finishLogin(json);
      });
    });

    $("register-form").addEventListener("submit", function (event) {
      event.preventDefault();
      handleJsonForm("/api/client/register", {
        type_client: $("register-type-client").value.trim(),
        prenom: $("register-prenom").value.trim(),
        nom: $("register-nom").value.trim(),
        email: $("register-email").value.trim(),
        societe: $("register-societe").value.trim(),
        siret: $("register-siret").value.trim(),
        telephone: $("register-telephone").value.trim(),
        password: $("register-password").value,
        password2: $("register-password-2").value,
        adresse: $("register-adresse").value.trim(),
        cp: $("register-cp").value.trim(),
        ville: $("register-ville").value.trim(),
        account_request: !!(($("register-account-request") || {}).checked),
        account_payment_mode: (($("register-account-payment") || {}).value || "").trim(),
        account_contact: (($("register-account-contact") || {}).value || "").trim(),
        account_email: (($("register-account-email") || {}).value || "").trim(),
        account_info: (($("register-account-info") || {}).value || "").trim()
      }, $("register-status"), function () {
        setStatus($("register-status"), "ok", "Compte cree. Confirmez votre email avant connexion.");
      });
    });

    $("profile-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var token = localStorage.getItem(SESSION_KEY);
      if (!token) return;
      clearStatus($("profile-status"));
      fetch(API_BASE + "/api/client/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": token
        },
        body: JSON.stringify({
          prenom: $("profile-prenom").value.trim(),
          nom: $("profile-nom").value.trim(),
          adresse: $("profile-adresse").value.trim(),
          cp: $("profile-cp").value.trim(),
          ville: $("profile-ville").value.trim()
        })
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          localStorage.setItem(USER_NAME_KEY, [json.client.prenom, json.client.nom].filter(Boolean).join(" ").trim() || json.client.email || "Mon compte");
          updateHeaderState();
          setStatus($("profile-status"), "ok", "Informations enregistrees.");
          loadDashboard(token);
        })
        .catch(function (error) {
          setStatus($("profile-status"), "err", error.message || "Erreur reseau.");
        });
    });

    $("logout-btn").addEventListener("click", function () {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_NAME_KEY);
      updateHeaderState();
      if (authView) authView.hidden = false;
      if (dashboardView) dashboardView.hidden = true;
    });

    var params = new URLSearchParams(window.location.search);
    var magicToken = params.get("client_token");
    var verifyToken = params.get("verify_client_token");
    var resetToken = params.get("reset_client_token");
    var storedToken = localStorage.getItem(SESSION_KEY);

    if (resetToken) {
      if (authView) authView.hidden = false;
      if (dashboardView) dashboardView.hidden = true;
      setStatus($("login-status"), "err", "La reinitialisation du mot de passe n'est pas disponible sur cette page.");
    } else if (magicToken) {
      fetch(API_BASE + "/api/client/auth?token=" + encodeURIComponent(magicToken))
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          finishLogin(json);
          history.replaceState({}, "", "/client");
        })
        .catch(function (error) {
          setStatus($("login-status"), "err", error.message || "Lien invalide.");
        });
    } else if (verifyToken) {
      fetch(API_BASE + "/api/client/verify?token=" + encodeURIComponent(verifyToken))
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (json) {
          finishLogin(json);
          history.replaceState({}, "", "/client");
        })
        .catch(function (error) {
          setStatus($("login-status"), "err", error.message || "Verification impossible.");
        });
    } else if (storedToken) {
      loadDashboard(storedToken);
    }
  }

  function initRendezVousPage() {
    var daysWrap = $("calendar-days");
    var slotsWrap = $("calendar-slots");
    var form = $("rdv-form");
    var status = $("rdv-status");
    var selectedDay = null;
    var selectedSlot = "";
    var businessDaySlots = ["09:00", "10:30", "14:00", "15:30", "17:00"];
    var eveningSlots = ["19:30"];
    var params = new URLSearchParams(window.location.search);
    if ($("rdv-produit")) $("rdv-produit").value = params.get("produit") || "";

    function nextDays() {
      var result = [];
      var cursor = new Date();
      while (result.length < 14) {
        cursor.setDate(cursor.getDate() + 1);
        if (cursor.getDay() === 0) continue;
        result.push(new Date(cursor.getTime()));
      }
      return result;
    }

    function getSlotsForSelectedDay() {
      if (!selectedDay) return businessDaySlots;
      var day = new Date(selectedDay + "T12:00:00");
      var weekday = day.getDay();
      if (weekday === 2 || weekday === 5) return businessDaySlots;
      return eveningSlots;
    }

    function renderSlots() {
      if (!slotsWrap) return;
      var availableSlots = getSlotsForSelectedDay();
      if (availableSlots.indexOf(selectedSlot) === -1) selectedSlot = availableSlots[0] || "";
      slotsWrap.innerHTML = availableSlots.map(function (slot) {
        return '<button type="button" class="slot-btn' + (slot === selectedSlot ? " active" : "") + '" data-slot="' + esc(slot) + '">' + esc(slot) + "</button>";
      }).join("");
      slotsWrap.querySelectorAll("[data-slot]").forEach(function (button) {
        button.addEventListener("click", function () {
          selectedSlot = button.getAttribute("data-slot");
          renderSlots();
        });
      });
    }

    function renderDays() {
      var days = nextDays();
      if (!daysWrap) return;
      if (!selectedDay && days.length) selectedDay = days[0].toISOString().slice(0, 10);
      daysWrap.innerHTML = days.map(function (day) {
        var iso = day.toISOString().slice(0, 10);
        var label = day.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
        return '<button type="button" class="calendar-day' + (iso === selectedDay ? " active" : "") + '" data-day="' + iso + '"><strong>' + esc(label) + '</strong><small>' + esc(iso) + "</small></button>";
      }).join("");
      daysWrap.querySelectorAll("[data-day]").forEach(function (button) {
        button.addEventListener("click", function () {
          selectedDay = button.getAttribute("data-day");
          renderDays();
          renderSlots();
        });
      });
    }

    renderDays();
    renderSlots();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearStatus(status);

      if (!selectedDay || !selectedSlot) {
        setStatus(status, "err", "Choisissez une date et un creneau.");
        return;
      }

      var fd = new FormData();
      fd.append("prenom", $("rdv-prenom").value.trim());
      fd.append("nom", $("rdv-nom").value.trim());
      fd.append("email", $("rdv-email").value.trim());
      fd.append("tel", $("rdv-tel").value.trim());
      fd.append("message", $("rdv-message").value.trim());
      fd.append("panier", "Rendez-vous - Date: " + selectedDay + " - Creneau: " + selectedSlot + " - Produit: " + ($("rdv-produit").value.trim() || "Projet general"));
      fd.append("prix_total", "-");
      fd.append("source", "com-impression");

      if (!fd.get("prenom") || !fd.get("nom") || !fd.get("email")) {
        setStatus(status, "err", "Prenom, nom et email sont obligatoires.");
        return;
      }

      $("rdv-submit").disabled = true;
      $("rdv-submit").textContent = "Envoi en cours...";

      fetch(API_BASE + "/api/devis", {
        method: "POST",
        body: fd
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
            return json;
          });
        })
        .then(function (data) {
          form.reset();
          setStatus(status, "ok", data && data.clientMailSent ? "Votre demande de rendez-vous a bien ete envoyee. Un email de confirmation vous a ete adresse." : "Votre demande de rendez-vous a bien ete envoyee. Email client non confirme cote serveur.");
        })
        .catch(function (error) {
          setStatus(status, "err", error.message || "Impossible d'envoyer votre demande.");
        })
        .finally(function () {
          $("rdv-submit").disabled = false;
          $("rdv-submit").textContent = "Envoyer ma demande de rendez-vous";
        });
    });
  }

  function initHomePage() {
    fetch(API_BASE + "/api/site-config")
      .then(function (response) { return response.json().catch(function () { return {}; }); })
      .then(function (json) {
        var config = json && json.config ? json.config : null;
        if (!config) return;
        if ($("home-brand-subtitle")) $("home-brand-subtitle").textContent = config.heroSlogan || $("home-brand-subtitle").textContent;
        if ($("home-hero-badge")) $("home-hero-badge").textContent = config.heroBadge || $("home-hero-badge").textContent;
        if ($("home-hero-title")) {
          $("home-hero-title").textContent = [config.heroLine1, config.heroHighlight, config.heroLine2].filter(Boolean).join(" ").trim() || $("home-hero-title").textContent;
        }
        if ($("home-hero-text")) $("home-hero-text").textContent = config.heroText || $("home-hero-text").textContent;
        if ($("home-panel-title")) $("home-panel-title").textContent = config.heroPanelTitle || $("home-panel-title").textContent;
        if ($("home-panel-text")) $("home-panel-text").textContent = config.heroPanelText || $("home-panel-text").textContent;
        if ($("home-panel-list") && Array.isArray(config.heroPanelItems) && config.heroPanelItems.length) {
          $("home-panel-list").innerHTML = config.heroPanelItems.map(function (item) {
            return "<li>" + esc(item) + "</li>";
          }).join("");
        } else if ($("home-panel-list")) {
          $("home-panel-list").innerHTML = "";
        }
        if ($("home-products-title")) {
          $("home-products-title").textContent = [config.productsTitle, config.productsAccent].filter(Boolean).join(" ").trim() || $("home-products-title").textContent;
        }
        if ($("home-products-subtitle")) {
          if (config.productsSubtitle) {
            $("home-products-subtitle").hidden = false;
            $("home-products-subtitle").textContent = config.productsSubtitle;
          } else {
            $("home-products-subtitle").hidden = true;
            $("home-products-subtitle").textContent = "";
          }
        }
        if ($("home-hero-image") && config.heroImage) {
          $("home-hero-image").src = config.heroImage;
        }
      })
      .catch(function () {});

    var avisGrid = document.querySelector(".avis-grid");
    if (avisGrid) {
      fetch(API_BASE + "/api/avis")
        .then(function (response) { return response.json(); })
        .then(function (json) {
          var avis = Array.isArray(json.avis) ? json.avis : [];
          if (!avis.length) return;
          avisGrid.innerHTML = avis.slice(0, 3).map(function (avis) {
            var stars = "★★★★★".slice(0, Math.max(1, Math.min(5, parseInt(avis.note, 10) || 5)));
            var role = [avis.prenom || "Client", avis.ville || ""].filter(Boolean).join(" - ");
            return '<article class="avis-card">'
              + '<div class="avis-stars">' + esc(stars) + '</div>'
              + '<p>« ' + esc(avis.texte || "") + ' »</p>'
              + '<h3>' + esc(avis.prenom || "Client") + '</h3>'
              + '<div class="avis-role">' + esc(role || "Client COM Impression") + '</div>'
            + '</article>';
          }).join("");
        })
        .catch(function () {});
    }

    document.querySelectorAll("[data-gamme-link]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        var gamme = link.getAttribute("data-gamme-link");
        goTo("/produits?gamme=" + encodeURIComponent(gamme));
      });
    });

    var productsCta = $("home-go-products");
    if (productsCta) {
      productsCta.addEventListener("click", function () {
        goTo("/produits");
      });
    }

    var partnershipForm = $("partnership-form");
    var partnershipStatus = $("partner-status");
    if (partnershipForm && partnershipStatus) {
      partnershipForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearStatus(partnershipStatus);

        var prenom = (($("partner-prenom") || {}).value || "").trim();
        var nom = (($("partner-nom") || {}).value || "").trim();
        var structure = (($("partner-structure") || {}).value || "").trim();
        var projetType = (($("partner-type") || {}).value || "").trim();
        var email = (($("partner-email") || {}).value || "").trim();
        var tel = (($("partner-tel") || {}).value || "").trim();
        var message = (($("partner-message") || {}).value || "").trim();

        if (!prenom || !nom || !structure || !email || !message) {
          setStatus(partnershipStatus, "err", "Prenom, nom, structure, email et besoin sont obligatoires.");
          return;
        }

        var fd = new FormData();
        fd.append("prenom", prenom);
        fd.append("nom", nom);
        fd.append("email", email);
        fd.append("tel", tel);
        fd.append("message", "Structure: " + structure + " | Type: " + (projetType || "Partenariat") + " | " + message);
        fd.append("panier", "Partenariat - " + structure + " - " + (projetType || "Partenariat"));
        fd.append("prix_total", "-");
        fd.append("source", "com-impression");

        var submit = $("partner-submit");
        if (submit) {
          submit.disabled = true;
          submit.textContent = "Envoi en cours...";
        }

        fetch(API_BASE + "/api/devis", {
          method: "POST",
          body: fd
        })
          .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (json) {
              if (!response.ok) throw new Error(json.error || ("HTTP " + response.status));
              return json;
            });
          })
          .then(function (data) {
            partnershipForm.reset();
            setStatus(partnershipStatus, "ok", data && data.clientMailSent ? "Votre demande de partenariat a bien ete envoyee. Un email de confirmation vous a ete adresse." : "Votre demande de partenariat a bien ete envoyee. Email client non confirme cote serveur.");
          })
          .catch(function (error) {
            setStatus(partnershipStatus, "err", error.message || "Impossible d'envoyer votre demande.");
          })
          .finally(function () {
            if (submit) {
              submit.disabled = false;
              submit.textContent = "Envoyer ma demande";
            }
          });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindShell();
    var page = document.body.getAttribute("data-page");
    if (page === "home") initHomePage();
    if (page === "produits") initProductsPage();
    if (page === "produit") initProductPage();
    if (page === "panier") initCartPage();
    if (page === "client") initClientPage();
    if (page === "rendez-vous") initRendezVousPage();
  });
})();
