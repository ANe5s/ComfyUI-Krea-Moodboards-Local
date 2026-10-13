import { app } from "../../scripts/app.js";

const FAVORITES_KEY = "krea_moodboards_local:favorites";
const UI_TEXT = {
  en: {
    searchPlaceholder: "Search Krea moodboards...",
    familyAll: "All styles",
    familyPhoto: "Photo",
    familyCinematic: "Cinematic",
    familyAnime: "Anime",
    familyIllustration: "Illustration",
    familyGraphic: "Graphic",
    familyAbstract: "Abstract",
    family3d: "3D",
    familyOther: "Other",
    familyAndrometa: "Andro.Meta",
    familyTitle: "Filter by style family or the Andro.Meta curated collection.",
    search: "Search",
    randomStyle: "Random Style",
    randomTitle: "Pick a random moodboard from the current search/filter.",
    favorites: "Favorites",
    showAll: "All",
    favoritesStatus: (shown, total, query) => `Showing ${shown} of ${total} saved favorite${total === 1 ? "" : "s"}${query ? ` for "${query}"` : ""}.`,
    catalogStatus: (shown, total, query, family) => `Showing ${shown} of ${total} moodboards${query ? ` for "${query}"` : ""}${family ? ` in ${family}` : ""}.`,
    loadingMore: "Loading more moodboards...",
    noThumbnail: "No thumbnail",
    noResults: "No moodboards found.",
    loadingMoodboards: "Loading moodboards...",
    loadingFavorites: "Loading favorites...",
    catalogRequestFailed: "Catalog request failed",
    favoritesRequestFailed: "Favorites request failed",
    uuid: "UUID",
    url: "URL",
  },
  zh: {
    searchPlaceholder: "搜索 Krea 情绪板…",
    familyAll: "全部样式",
    familyPhoto: "摄影",
    familyCinematic: "电影感",
    familyAnime: "动漫",
    familyIllustration: "插画",
    familyGraphic: "平面设计",
    familyAbstract: "抽象",
    family3d: "3D",
    familyOther: "其他",
    familyAndrometa: "Andro.Meta",
    familyTitle: "按样式分类或 Andro.Meta 精选集合筛选。",
    search: "搜索",
    randomStyle: "随机样式",
    randomTitle: "从当前搜索和筛选结果中随机选择一个情绪板。",
    favorites: "收藏夹",
    showAll: "全部",
    favoritesStatus: (shown, total, query) => `显示 ${shown} / ${total} 个收藏${query ? `，搜索“${query}”` : ""}。`,
    catalogStatus: (shown, total, query, family) => `显示 ${shown} / ${total} 个情绪板${query ? `，搜索“${query}”` : ""}${family ? `，分类：${family}` : ""}。`,
    loadingMore: "正在加载更多情绪板…",
    noThumbnail: "无缩略图",
    noResults: "没有找到情绪板。",
    loadingMoodboards: "正在加载情绪板…",
    loadingFavorites: "正在加载收藏…",
    catalogRequestFailed: "情绪板目录请求失败",
    favoritesRequestFailed: "收藏列表请求失败",
    uuid: "UUID",
    url: "网页链接",
  },
};

function uiText(key, ...args) {
  const locale = String(app.ui.settings.getSettingValue("Comfy.Locale") || "en").toLowerCase();
  const messages = ["zh", "zh-cn", "zh-hans"].includes(locale) ? UI_TEXT.zh : UI_TEXT.en;
  const value = messages[key] ?? UI_TEXT.en[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
}

function isChineseLocale() {
  return ["zh", "zh-cn", "zh-hans"].includes(
    String(app.ui.settings.getSettingValue("Comfy.Locale") || "en").toLowerCase(),
  );
}

function displayTitle(card) {
  return isChineseLocale() ? card.title_zh || card.title : card.title;
}

function displaySummary(card) {
  return isChineseLocale() ? card.source_summary_zh || card.source_summary : card.source_summary;
}

function widget(node, name) {
  return node.widgets?.find((w) => w.name === name);
}

function setWidget(node, name, value) {
  const w = widget(node, name);
  if (!w) return;
  w.value = value ?? "";
  w.callback?.(w.value);
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function setFavorites(values) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...new Set(values)]));
}

function css(el, styles) {
  Object.assign(el.style, styles);
  return el;
}

function text(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value;
  if (className) el.className = className;
  return el;
}

const PAGE_SIZE = 90;
const DEFAULT_BROWSER_HEIGHT = 430;
const MIN_BROWSER_HEIGHT = 300;
const FAMILIES = [
  ["", "familyAll"],
  ["photo", "familyPhoto"],
  ["cinematic", "familyCinematic"],
  ["anime", "familyAnime"],
  ["illustration", "familyIllustration"],
  ["graphic", "familyGraphic"],
  ["abstract", "familyAbstract"],
  ["3d", "family3d"],
  ["other", "familyOther"],
  ["andrometa", "familyAndrometa"],
];

function familyLabel(value) {
  const family = FAMILIES.find(([key]) => key === value);
  return family ? uiText(family[1]) : value;
}

async function fetchCards(query, offset = 0, family = "", limit = PAGE_SIZE) {
  const url = `/krea_moodboards_local/catalog?query=${encodeURIComponent(query || "")}&limit=${limit}&offset=${offset}&family=${encodeURIComponent(family || "")}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${uiText("catalogRequestFailed")}: ${response.status}`);
  return response.json();
}

async function fetchFavoriteCards(uuids) {
  if (!uuids.length) return { total: 0, items: [] };
  const url = `/krea_moodboards_local/by_uuid?uuids=${encodeURIComponent(uuids.join(","))}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${uiText("favoritesRequestFailed")}: ${response.status}`);
  return response.json();
}

function selectedUuid(node) {
  return widget(node, "selected_uuid")?.value || "";
}

function buildBrowser(node) {
  const root = css(document.createElement("div"), {
    display: "flex",
    flexDirection: "column",
    fontFamily: "Arial, sans-serif",
    color: "var(--fg-color, #ddd)",
    background: "var(--comfy-input-bg, #222)",
    border: "1px solid var(--border-color, #444)",
    borderRadius: "8px",
    padding: "8px",
    width: "100%",
    height: `${node._moodboardBrowserHeight || DEFAULT_BROWSER_HEIGHT}px`,
    minHeight: `${MIN_BROWSER_HEIGHT}px`,
    boxSizing: "border-box",
    overflow: "hidden",
    contain: "layout size",
  });
  root.className = "krea-moodboard-browser";

  const toolbarStyle = document.createElement("style");
  toolbarStyle.textContent = `
    .krea-moodboard-browser .krea-moodboard-toolbar-button {
      box-sizing: border-box;
      height: 30px;
      min-width: 30px;
      padding: 4px 8px;
      border: 1px solid var(--border-color, #555);
      border-radius: 6px;
      background: var(--comfy-input-bg, #222);
      color: var(--fg-color, #ddd);
      font: inherit;
      font-size: 12px;
      line-height: 1.2;
      white-space: nowrap;
      cursor: pointer;
      transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    }
    .krea-moodboard-browser .krea-moodboard-toolbar-button:not(:disabled):hover {
      background: var(--comfy-menu-bg, #333);
      border-color: var(--primary-background, #8fb4ff);
    }
    .krea-moodboard-browser .krea-moodboard-toolbar-button:active:not(:disabled) {
      transform: translateY(1px);
    }
    .krea-moodboard-browser .krea-moodboard-toolbar-button:focus-visible {
      outline: 2px solid var(--primary-background, #8fb4ff);
      outline-offset: 1px;
    }
    .krea-moodboard-browser .krea-moodboard-toolbar-button:disabled {
      opacity: 0.55;
      cursor: wait;
    }
    .krea-moodboard-browser .krea-moodboard-toolbar-button[aria-pressed="true"] {
      border-color: var(--primary-background, #8fb4ff);
      background: var(--comfy-menu-bg, #333);
      color: var(--primary-background, #8fb4ff);
    }
    .krea-moodboard-browser .krea-moodboard-favorites-button {
      width: 78px;
      min-width: 78px;
      text-align: center;
    }
  `;
  root.append(toolbarStyle);

  const controls = css(document.createElement("div"), {
    display: "grid",
    gridTemplateColumns: "1fr auto auto auto auto",
    gap: "6px",
    marginBottom: "8px",
    flex: "0 0 auto",
  });
  const search = css(document.createElement("input"), {
    minWidth: "0",
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #555",
    background: "#111",
    color: "#eee",
  });
  search.placeholder = uiText("searchPlaceholder");
  search.value = widget(node, "query")?.value || "";
  const familySelect = css(document.createElement("select"), {
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #555",
    background: "#111",
    color: "#eee",
    maxWidth: "110px",
  });
  for (const [value, label] of FAMILIES) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = uiText(label);
    familySelect.append(option);
  }
  familySelect.title = uiText("familyTitle");
  const reload = text("button", uiText("search"));
  const lucky = text("button", uiText("randomStyle"));
  lucky.title = uiText("randomTitle");
  const favsOnly = text("button", uiText("favorites"));
  for (const button of [reload, lucky, favsOnly]) {
    button.type = "button";
    button.className = "krea-moodboard-toolbar-button";
  }
  lucky.setAttribute("aria-label", uiText("randomStyle"));
  favsOnly.classList.add("krea-moodboard-favorites-button");
  controls.append(search, familySelect, reload, lucky, favsOnly);

  const status = css(text("div", ""), {
    margin: "0 0 8px",
    fontSize: "11px",
    color: "#aaa",
    flex: "0 0 auto",
  });
  const grid = css(document.createElement("div"), {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gridAutoRows: "min-content",
    alignContent: "start",
    gap: "8px",
    overflow: "auto",
    flex: "1 1 0",
    height: "0",
    minHeight: "0",
  });
  root.append(controls, status, grid);

  let cards = [];
  let showingFavorites = false;
  let favoriteCards = [];
  let total = 0;
  let currentQuery = search.value || "";
  let currentFamily = "";

  function cardMatchesQuery(card, query) {
    if (!query) return true;
    const haystack = [
      card.title,
      card.title_zh,
      card.source_summary,
      card.source_summary_zh,
      (card.keywords || []).join(" "),
      (card.style_axes || []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return query.toLowerCase().split(/\s+/).every((term) => !term || haystack.includes(term));
  }

  function applyLabels() {
    search.placeholder = uiText("searchPlaceholder");
    for (const option of familySelect.options) {
      const family = FAMILIES.find(([value]) => value === option.value);
      if (family) option.textContent = uiText(family[1]);
    }
    familySelect.title = uiText("familyTitle");
    reload.textContent = uiText("search");
    lucky.textContent = uiText("randomStyle");
    lucky.title = uiText("randomTitle");
    lucky.setAttribute("aria-label", uiText("randomStyle"));
    favsOnly.textContent = showingFavorites ? uiText("showAll") : uiText("favorites");
    favsOnly.setAttribute("aria-pressed", String(showingFavorites));
  }

  function selectCard(card) {
    setWidget(node, "query", search.value);
    setWidget(node, "selected_uuid", card.uuid);
    setWidget(node, "selected_title", card.title);
    setWidget(node, "selected_url", card.url);
    setWidget(node, "selected_metadata_json", card.metadata_json);
    render();
  }

  function toggleFavorite(uuid) {
    const favs = getFavorites();
    if (favs.includes(uuid)) setFavorites(favs.filter((v) => v !== uuid));
    else setFavorites([...favs, uuid]);
    render();
  }

  function render() {
    applyLabels();
    const favs = getFavorites();
    // Favorites are searchable too: the search box filters them client-side.
    const visible = showingFavorites
      ? favoriteCards.filter((card) => cardMatchesQuery(card, search.value || ""))
      : cards;
    grid.replaceChildren();
    status.textContent = showingFavorites
      ? uiText("favoritesStatus", visible.length, favoriteCards.length, search.value || "")
      : uiText("catalogStatus", cards.length, total, currentQuery, currentFamily ? familyLabel(currentFamily) : "");
    for (const card of visible) {
      const localizedTitle = displayTitle(card);
      const localizedSummary = displaySummary(card);
      const hoverText = `${localizedTitle}\n${localizedSummary || ""}\n${uiText("uuid")}: ${card.uuid}\n${uiText("url")}: ${card.url}`;
      const item = css(document.createElement("div"), {
        border: card.uuid === selectedUuid(node) ? "2px solid #8fb4ff" : "1px solid #555",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#181818",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        minHeight: "200px",
      });
      item.title = hoverText;
      const placeholder = () => {
        const emoji = /^\p{Extended_Pictographic}/u.test(card.title) ? [...card.title][0] : "";
        const element = css(text("div", emoji || uiText("noThumbnail")), {
          aspectRatio: "16 / 9",
          display: "grid",
          placeItems: "center",
          color: "#aaa",
          fontSize: emoji ? "34px" : "12px",
          background: "#333",
        });
        element.title = hoverText;
        return element;
      };
      let media;
      if (card.thumbnail_url) {
        const img = css(document.createElement("img"), {
          width: "100%",
          aspectRatio: "16 / 9",
          objectFit: "cover",
          display: "block",
          background: "#333",
        });
        img.loading = "lazy";
        img.src = card.thumbnail_url;
        img.alt = localizedTitle;
        img.title = hoverText;
        img.onerror = () => img.replaceWith(placeholder());
        media = img;
      } else {
        media = placeholder();
      }
      const body = css(document.createElement("div"), {
        padding: "6px",
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
      });
      const title = css(text("div", localizedTitle), { fontSize: "12px", fontWeight: "bold", lineHeight: "1.2" });
      const subtitleText = localizedSummary || (card.keywords || []).slice(0, 3).join(", ");
      const keywords = css(text("div", subtitleText), {
        fontSize: "11px",
        color: "#aaa",
        lineHeight: "1.4",
        marginTop: "4px",
      });
      const actions = css(document.createElement("div"), {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "auto",
        paddingTop: "6px",
      });
      const star = css(text("button", favs.includes(card.uuid) ? "★" : "☆"), {
        border: "0",
        background: "transparent",
        color: "#ffd15c",
        cursor: "pointer",
        fontSize: "16px",
      });
      const link = css(text("a", "Krea"), { color: "#8fb4ff", fontSize: "11px" });
      link.href = card.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      star.onclick = (event) => {
        event.stopPropagation();
        toggleFavorite(card.uuid);
      };
      actions.append(star, link);
      body.append(title, keywords, actions);
      item.append(media, body);
      item.onclick = () => selectCard(card);
      grid.append(item);
    }
    if (!visible.length) grid.append(css(text("div", uiText("noResults")), { color: "#aaa", padding: "10px" }));
  }

  async function load({ append = false } = {}) {
    if (append && ((search.value || "") !== currentQuery || (familySelect.value || "") !== currentFamily)) {
      append = false;
    }
    showingFavorites = false;
    applyLabels();
    setWidget(node, "query", search.value);
    currentQuery = search.value || "";
    currentFamily = familySelect.value || "";
    if (!append) {
      cards = [];
      total = 0;
      grid.replaceChildren();
      status.textContent = uiText("loadingMoodboards");
    } else {
      status.textContent = uiText("loadingMore");
    }
    try {
      const data = await fetchCards(currentQuery, append ? cards.length : 0, currentFamily);
      total = data.total || 0;
      cards = append ? [...cards, ...(data.items || [])] : (data.items || []);
      render();
    } catch (error) {
      status.textContent = `${uiText("catalogRequestFailed")}: ${error}`;
      if (!append) grid.replaceChildren();
    }
  }

  reload.onclick = () => load();
  familySelect.onchange = () => load();
  // Infinite scroll: append the next page when the grid nears its bottom.
  let autoLoading = false;
  grid.addEventListener("scroll", async () => {
    if (autoLoading || showingFavorites) return;
    if (cards.length >= total || !cards.length) return;
    if (grid.scrollTop + grid.clientHeight < grid.scrollHeight - 160) return;
    autoLoading = true;
    try {
      await load({ append: true });
    } finally {
      autoLoading = false;
    }
  });
  lucky.onclick = async () => {
    // Random pick from everything matching the current search/filter, not
    // just the loaded page: fetch one card at a random offset.
    try {
      lucky.disabled = true;
      lucky.setAttribute("aria-busy", "true");
      const probe = await fetchCards(search.value || "", 0, familySelect.value || "", 1);
      const poolTotal = probe.total || 0;
      if (!poolTotal) return;
      const offset = Math.floor(Math.random() * poolTotal);
      const pick = await fetchCards(search.value || "", offset, familySelect.value || "", 1);
      const card = (pick.items || [])[0];
      if (card) selectCard(card);
    } catch {
      /* leave current view untouched */
    } finally {
      lucky.disabled = false;
      lucky.setAttribute("aria-busy", "false");
    }
  };
  favsOnly.onclick = async () => {
    showingFavorites = !showingFavorites;
    applyLabels();
    if (showingFavorites) {
      grid.replaceChildren();
      status.textContent = uiText("loadingFavorites");
      try {
        const data = await fetchFavoriteCards(getFavorites());
        favoriteCards = data.items || [];
      } catch (error) {
        status.textContent = `${uiText("favoritesRequestFailed")}: ${error}`;
        return;
      }
    }
    render();
  };
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (showingFavorites) render();
      else load();
    }
  });
  search.addEventListener("input", () => {
    // Favorites filter live as you type; the full catalog waits for Enter/Search.
    if (showingFavorites) render();
  });

  applyLabels();
  load();
  return root;
}

app.registerExtension({
  name: "andrometa.krea_moodboards_local.visual_browser",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "KreaMoodboardVisualBrowserLocal") return;
    const original = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      original?.apply(this, arguments);
      for (const name of ["query", "selected_uuid", "selected_metadata_json"]) {
        const w = widget(this, name);
        if (w) w.hidden = true;
      }
      for (const name of ["selected_title", "selected_url"]) {
        const w = widget(this, name);
        if (w) w.hidden = false;
      }
      this._moodboardBrowserHeight = DEFAULT_BROWSER_HEIGHT;
      const browser = buildBrowser(this);
      const browserWidget = this.addDOMWidget("browser", "KREA_MOODBOARD_BROWSER", browser, {
        serialize: false,
        hideOnZoom: false,
        getMinHeight: () => MIN_BROWSER_HEIGHT,
        getMaxHeight: () => this._moodboardBrowserHeight,
      });
      const strength = widget(this, "strength");
      this.widgets.splice(this.widgets.indexOf(strength), 1);
      this.widgets.push(strength);
      const nativeRowHeight = (globalThis.LiteGraph?.NODE_WIDGET_HEIGHT ?? 20) + 4;
      const titleHeight = globalThis.LiteGraph?.NODE_TITLE_HEIGHT ?? 30;
      const outputHeight = Math.max(1, this.outputs?.length || 0) * (globalThis.LiteGraph?.NODE_SLOT_HEIGHT ?? 20);
      const visibleWidgetCount = this.widgets.filter(
        (w) => w !== browserWidget && !w.hidden && w.type !== "converted-widget",
      ).length;
      this._moodboardBrowserFixedHeight = titleHeight + outputHeight + visibleWidgetCount * nativeRowHeight + 8;
      this.size = [
        Math.max(this.size?.[0] || 360, 420),
        this._moodboardBrowserFixedHeight + DEFAULT_BROWSER_HEIGHT,
      ];
      const updateBrowserHeight = () => {
        this._moodboardBrowserHeight = Math.max(
          MIN_BROWSER_HEIGHT,
          this.size[1] - this._moodboardBrowserFixedHeight,
        );
        const height = `${this._moodboardBrowserHeight}px`;
        browser.style.setProperty("height", height, "important");
        browser.style.setProperty("max-height", height, "important");
      };
      updateBrowserHeight();

      const onResize = this.onResize;
      this.onResize = function (...args) {
        const result = onResize?.apply(this, args);
        updateBrowserHeight();
        this.graph?.setDirtyCanvas(true, true);
        return result;
      };
    };
  },
});
