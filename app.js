/* =========================================================
   Tablilla SAAC — Lógica de la aplicación
   Vanilla JS, sin dependencias. Persistencia en localStorage.
   ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "saac_state_v1";
  const STATE_VERSION = 1;

  /* ---------------------------------------------------------
     Utilidades
     --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  function hashPin(pin) {
    // Hash simple no criptográfico: suficiente para bloqueo de UI local.
    let h = 5381;
    for (let i = 0; i < pin.length; i++) h = ((h << 5) + h + pin.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }

  function toast(msg, ms = 2200) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, ms);
  }

  function download(filename, content, type = "application/json") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------------------------------------------------
     Estado
     --------------------------------------------------------- */
  let state = null;
  let currentBoardId = null;
  let phrase = []; // [{ emoji, label, speak }]
  let searchQuery = ""; // filtro de búsqueda activo

  function defaultState() {
    const boards = clone(window.SAAC_DEFAULT_BOARDS || []);
    return {
      version: STATE_VERSION,
      settings: {
        voiceURI: null,
        rate: 1.0,
        pitch: 1.0,
        highContrast: false,
        pictoSize: "md",
        editLocked: true,
        pinHash: null,
        activeProfileId: "p-default",
        speakOnTap: false,
        autoSpeak: false
      },
      profiles: [
        {
          id: "p-default",
          name: "Mi perfil",
          avatar: "🧒",
          boards,
          frequentPhrases: [],
          recentPhrases: [],
          favorites: []
        }
      ],
      usageLog: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== STATE_VERSION) return migrate(parsed);
      return parsed;
    } catch (e) {
      console.error("Error cargando estado:", e);
      return defaultState();
    }
  }

  function migrate(old) {
    // Punto de extensión para futuras versiones.
    const fresh = defaultState();
    if (old && old.profiles) {
      fresh.profiles = old.profiles.map((p) => ({
        frequentPhrases: [],
        recentPhrases: [],
        favorites: [],
        ...p
      }));
      fresh.settings = Object.assign(fresh.settings, old.settings || {});
      fresh.usageLog = old.usageLog || [];
    }
    return fresh;
  }

  // Garantiza que un perfil cargado tenga todos los campos esperados.
  function normalizeProfile(p) {
    if (!Array.isArray(p.frequentPhrases)) p.frequentPhrases = [];
    if (!Array.isArray(p.recentPhrases)) p.recentPhrases = [];
    if (!Array.isArray(p.favorites)) p.favorites = [];
    if (!Array.isArray(p.boards)) p.boards = clone(window.SAAC_DEFAULT_BOARDS || []);
    return p;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error guardando estado:", e);
      toast("No se pudo guardar (almacenamiento lleno)");
    }
  }

  function activeProfile() {
    const p = state.profiles.find((x) => x.id === state.settings.activeProfileId) || state.profiles[0];
    return normalizeProfile(p);
  }

  function activeBoard() {
    const p = activeProfile();
    return p.boards.find((b) => b.id === currentBoardId) || p.boards[0];
  }

  /* ---------------------------------------------------------
     Voz (Web Speech API)
     --------------------------------------------------------- */
  const Speech = {
    voices: [],
    supported: "speechSynthesis" in window,

    init() {
      if (!this.supported) return;
      const load = () => {
        this.voices = window.speechSynthesis.getVoices();
        renderVoiceOptions();
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    },

    speak(text) {
      if (!this.supported) { toast("Voz no disponible en este navegador"); return; }
      if (!text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const s = state.settings;
      u.rate = Number(s.rate) || 1;
      u.pitch = Number(s.pitch) || 1;
      u.lang = "es-ES";
      if (s.voiceURI) {
        const v = this.voices.find((x) => x.voiceURI === s.voiceURI);
        if (v) { u.voice = v; u.lang = v.lang; }
      } else {
        const es = this.voices.find((v) => /^es/i.test(v.lang));
        if (es) { u.voice = es; u.lang = es.lang; }
      }
      window.speechSynthesis.speak(u);
    }
  };

  function renderVoiceOptions() {
    const sel = $("#voiceSelect");
    if (!sel) return;
    const current = state.settings.voiceURI || "";
    sel.innerHTML = "";
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Automática (español)";
    sel.appendChild(auto);
    Speech.voices
      .filter((v) => /^es/i.test(v.lang) || true)
      .forEach((v) => {
        const o = document.createElement("option");
        o.value = v.voiceURI;
        o.textContent = `${v.name} (${v.lang})`;
        sel.appendChild(o);
      });
    sel.value = current;
  }

  /* ---------------------------------------------------------
     Render: categorías
     --------------------------------------------------------- */
  function renderCategories() {
    const nav = $("#categories");
    nav.innerHTML = "";
    const p = activeProfile();
    p.boards.forEach((board) => {
      const btn = document.createElement("button");
      btn.className = "cat-btn";
      btn.type = "button";
      btn.setAttribute("aria-current", board.id === currentBoardId ? "true" : "false");
      btn.setAttribute("aria-label", `Categoría ${board.name}`);
      btn.innerHTML = `<span class="cat-icon" aria-hidden="true">${board.icon}</span><span>${escapeHtml(board.name)}</span>`;
      btn.addEventListener("click", () => {
        currentBoardId = board.id;
        renderCategories();
        renderBoard();
      });
      nav.appendChild(btn);
    });
  }

  /* ---------------------------------------------------------
     Render: tablero de pictogramas (con búsqueda y favoritos)
     --------------------------------------------------------- */
  function normalizeText(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // Devuelve la lista de pictogramas a mostrar según búsqueda/tablero.
  function visiblePictos() {
    const p = activeProfile();
    const q = normalizeText(searchQuery).trim();
    if (q) {
      // Buscar en TODOS los tableros
      const out = [];
      p.boards.forEach((b) => {
        b.pictos.forEach((picto) => {
          if (normalizeText(picto.label).includes(q) || normalizeText(picto.speak).includes(q)) {
            out.push({ picto, board: b });
          }
        });
      });
      return out;
    }
    const board = activeBoard();
    if (!board) return [];
    return board.pictos.map((picto) => ({ picto, board }));
  }

  function isFavorite(picto) {
    const p = activeProfile();
    return p.favorites.some((f) => f.id === picto.id);
  }

  function toggleFavorite(picto) {
    const p = activeProfile();
    if (isFavorite(picto)) {
      p.favorites = p.favorites.filter((f) => f.id !== picto.id);
      toast("Quitado de favoritos");
    } else {
      p.favorites.push({ id: picto.id, emoji: picto.emoji, label: picto.label, speak: picto.speak || picto.label });
      toast("Añadido a favoritos ⭐");
    }
    saveState();
    renderBoard();
  }

  function renderBoard() {
    const board = activeBoard();
    const grid = $("#pictoGrid");
    const empty = $("#boardEmpty");
    grid.innerHTML = "";

    const searching = normalizeText(searchQuery).trim().length > 0;
    $("#boardTitle").textContent = searching ? `Resultados: “${searchQuery}”` : (board ? board.name : "Tablero");

    const items = visiblePictos();
    if (!items.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    items.forEach(({ picto, board: ownerBoard }) => {
      const btn = document.createElement("button");
      btn.className = "picto";
      btn.type = "button";
      btn.setAttribute("role", "listitem");
      btn.setAttribute("aria-label", picto.label);
      btn.dataset.id = picto.id;
      const fav = isFavorite(picto);
      btn.innerHTML = `
        <span class="picto-emoji" aria-hidden="true">${picto.emoji}</span>
        <span class="picto-label">${escapeHtml(picto.label)}</span>
        <span class="picto-fav${fav ? " is-on" : ""}" role="button" tabindex="-1" aria-label="Favorito" title="Favorito">${fav ? "★" : "☆"}</span>
        <span class="picto-edit" role="button" tabindex="-1" aria-hidden="true">✏️</span>
      `;
      btn.addEventListener("click", (ev) => {
        if (ev.target.classList.contains("picto-edit")) {
          openPictoEditor(ownerBoard, picto);
          return;
        }
        if (ev.target.classList.contains("picto-fav")) {
          toggleFavorite(picto);
          return;
        }
        addToPhrase(picto, ownerBoard);
      });
      grid.appendChild(btn);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------------------------------------------------
     Barra de frase
     --------------------------------------------------------- */
  function addToPhrase(picto, board) {
    phrase.push({ emoji: picto.emoji, label: picto.label, speak: picto.speak || picto.label });
    renderPhrase();
    logUsage("picto", picto.label, board ? board.name : "");
    // Pronunciar el pictograma al tocarlo (opcional, ajuste del terapeuta)
    if (state.settings.speakOnTap) Speech.speak(picto.speak || picto.label);
  }

  function renderPhrase() {
    const box = $("#phraseItems");
    box.innerHTML = "";
    if (phrase.length === 0) {
      const empty = document.createElement("span");
      empty.className = "phrase-empty";
      empty.id = "phraseEmpty";
      empty.textContent = "Toca pictogramas para formar una frase…";
      box.appendChild(empty);
      return;
    }
    phrase.forEach((item, idx) => {
      const chip = document.createElement("span");
      chip.className = "phrase-chip";
      chip.setAttribute("role", "listitem");
      chip.innerHTML = `<span class="emoji" aria-hidden="true">${item.emoji}</span><span>${escapeHtml(item.label)}</span>`;
      chip.title = "Toca para quitar";
      chip.style.cursor = "pointer";
      chip.addEventListener("click", () => {
        phrase.splice(idx, 1);
        renderPhrase();
      });
      box.appendChild(chip);
    });
  }

  function phraseText() {
    return phrase.map((i) => i.speak || i.label).join(" ");
  }

  /* ---------------------------------------------------------
     Frases frecuentes
     --------------------------------------------------------- */
  function renderFrequent() {
    const list = $("#frequentList");
    list.innerHTML = "";
    const p = activeProfile();
    if (!p.frequentPhrases.length) {
      const e = document.createElement("p");
      e.className = "frequent__empty";
      e.textContent = "Aún no hay frases guardadas.";
      list.appendChild(e);
      return;
    }
    p.frequentPhrases.forEach((fp) => {
      const row = document.createElement("div");
      row.className = "freq-item";
      const btn = document.createElement("button");
      btn.className = "freq-item__text";
      btn.type = "button";
      btn.textContent = fp.text;
      btn.setAttribute("aria-label", `Reproducir: ${fp.text}`);
      btn.addEventListener("click", () => {
        Speech.speak(fp.text);
        logUsage("phrase", fp.text, "frecuente");
      });
      const del = document.createElement("button");
      del.className = "freq-item__del";
      del.type = "button";
      del.textContent = "✕";
      del.setAttribute("aria-label", `Eliminar frase: ${fp.text}`);
      del.addEventListener("click", () => {
        p.frequentPhrases = p.frequentPhrases.filter((x) => x.id !== fp.id);
        saveState();
        renderFrequent();
      });
      row.appendChild(btn);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function saveCurrentPhrase() {
    if (!phrase.length) { toast("La frase está vacía"); return; }
    const text = phraseText();
    const p = activeProfile();
    p.frequentPhrases.unshift({ id: uid("fp"), text, pictos: clone(phrase) });
    saveState();
    renderFrequent();
    toast("Frase guardada ⭐");
  }

  /* ---------------------------------------------------------
     Frases recientes
     --------------------------------------------------------- */
  function pushRecentPhrase(text, pictos) {
    if (!text) return;
    const p = activeProfile();
    // Evitar duplicados consecutivos
    p.recentPhrases = p.recentPhrases.filter((r) => r.text !== text);
    p.recentPhrases.unshift({ id: uid("rc"), text, pictos: clone(pictos || []), ts: Date.now() });
    if (p.recentPhrases.length > 12) p.recentPhrases = p.recentPhrases.slice(0, 12);
    saveState();
    renderRecent();
  }

  function renderRecent() {
    const list = $("#recentList");
    if (!list) return;
    list.innerHTML = "";
    const p = activeProfile();
    if (!p.recentPhrases.length) {
      const e = document.createElement("p");
      e.className = "frequent__empty";
      e.textContent = "Aún no hay frases recientes.";
      list.appendChild(e);
      return;
    }
    p.recentPhrases.forEach((rp) => {
      const row = document.createElement("div");
      row.className = "freq-item";
      const btn = document.createElement("button");
      btn.className = "freq-item__text";
      btn.type = "button";
      btn.textContent = rp.text;
      btn.setAttribute("aria-label", `Reproducir reciente: ${rp.text}`);
      btn.addEventListener("click", () => {
        Speech.speak(rp.text);
        logUsage("phrase", rp.text, "reciente");
      });
      const reuse = document.createElement("button");
      reuse.className = "freq-item__del";
      reuse.type = "button";
      reuse.textContent = "↺";
      reuse.title = "Reutilizar en la barra";
      reuse.setAttribute("aria-label", `Reutilizar frase: ${rp.text}`);
      reuse.addEventListener("click", () => {
        phrase = clone(rp.pictos || []);
        renderPhrase();
        toast("Frase cargada en la barra");
      });
      row.appendChild(btn);
      row.appendChild(reuse);
      list.appendChild(row);
    });
  }

  /* ---------------------------------------------------------
     Analítica
     --------------------------------------------------------- */
  function logUsage(type, label, category) {
    state.usageLog.push({
      ts: new Date().toISOString(),
      profileId: state.settings.activeProfileId,
      type,
      label,
      category: category || ""
    });
    // Limitar a 5000 entradas para no llenar localStorage
    if (state.usageLog.length > 5000) state.usageLog = state.usageLog.slice(-5000);
    saveState();
  }

  function exportCsv() {
    const rows = [["fecha", "perfil", "tipo", "etiqueta", "categoria"]];
    const profilesById = Object.fromEntries(state.profiles.map((p) => [p.id, p.name]));
    state.usageLog.forEach((e) => {
      rows.push([e.ts, profilesById[e.profileId] || e.profileId, e.type, e.label, e.category]);
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    download(`uso-saac-${new Date().toISOString().slice(0, 10)}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
    toast("CSV exportado");
  }

  function showAnalytics() {
    const log = state.usageLog;
    const total = log.length;
    const byLabel = {};
    log.forEach((e) => { byLabel[e.label] = (byLabel[e.label] || 0) + 1; });
    const top = Object.entries(byLabel).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const byType = log.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {});

    const html = `
      <p><strong>Total de eventos:</strong> ${total}</p>
      <p><strong>Pictogramas usados:</strong> ${byType.picto || 0} · <strong>Frases:</strong> ${byType.phrase || 0}</p>
      <h3 style="margin:16px 0 8px;font-size:1rem;">Top 10 más usados</h3>
      ${top.length ? `<ol style="padding-left:20px;line-height:1.8;">${top.map(([l, n]) => `<li>${escapeHtml(l)} — <strong>${n}</strong></li>`).join("")}</ol>` : "<p>Sin datos todavía.</p>"}
    `;
    openModal("Analítica de uso", html, [{ label: "Cerrar", primary: true, onClick: closeModal }]);
  }

  /* ---------------------------------------------------------
     Perfiles
     --------------------------------------------------------- */
  function renderProfiles() {
    const list = $("#profileList");
    list.innerHTML = "";
    state.profiles.forEach((p) => {
      const row = document.createElement("div");
      row.className = "profile-row";
      const isActive = p.id === state.settings.activeProfileId;
      row.innerHTML = `
        <span class="profile-row__avatar" aria-hidden="true">${p.avatar}</span>
        <span class="profile-row__name">${escapeHtml(p.name)}${isActive ? " ✓" : ""}</span>
        <span class="profile-row__actions">
          <button type="button" data-act="use" aria-label="Usar perfil ${escapeHtml(p.name)}">▶</button>
          <button type="button" data-act="edit" aria-label="Editar perfil ${escapeHtml(p.name)}">✏️</button>
          <button type="button" data-act="del" aria-label="Eliminar perfil ${escapeHtml(p.name)}">🗑</button>
        </span>
      `;
      row.querySelector('[data-act="use"]').addEventListener("click", () => switchProfile(p.id));
      row.querySelector('[data-act="edit"]').addEventListener("click", () => editProfile(p));
      row.querySelector('[data-act="del"]').addEventListener("click", () => deleteProfile(p));
      list.appendChild(row);
    });
    // Reflejar perfil activo en topbar
    const ap = activeProfile();
    $("#profileName").textContent = ap.name;
    $("#profileAvatar").textContent = ap.avatar;
  }

  function switchProfile(id) {
    state.settings.activeProfileId = id;
    currentBoardId = activeProfile().boards[0]?.id || null;
    phrase = [];
    saveState();
    renderAll();
    toast(`Perfil: ${activeProfile().name}`);
  }

  function addProfile() {
    openModal("Nuevo perfil", `
      <label class="field"><span>Nombre</span><input id="pfName" type="text" maxlength="30" placeholder="Ej. Ana" /></label>
      <label class="field"><span>Avatar (emoji)</span><input id="pfAvatar" type="text" maxlength="4" value="🧒" /></label>
    `, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Crear", primary: true, onClick: () => {
        const name = ($("#pfName").value || "").trim();
        if (!name) { toast("Escribe un nombre"); return; }
        const avatar = ($("#pfAvatar").value || "🧒").trim() || "🧒";
        const id = uid("p");
        state.profiles.push({
          id, name, avatar,
          boards: clone(window.SAAC_DEFAULT_BOARDS || []),
          frequentPhrases: []
        });
        state.settings.activeProfileId = id;
        currentBoardId = state.profiles[state.profiles.length - 1].boards[0]?.id || null;
        phrase = [];
        saveState();
        closeModal();
        renderAll();
        toast("Perfil creado");
      }}
    ]);
  }

  function editProfile(p) {
    openModal("Editar perfil", `
      <label class="field"><span>Nombre</span><input id="pfName" type="text" maxlength="30" value="${escapeHtml(p.name)}" /></label>
      <label class="field"><span>Avatar (emoji)</span><input id="pfAvatar" type="text" maxlength="4" value="${escapeHtml(p.avatar)}" /></label>
    `, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Guardar", primary: true, onClick: () => {
        const name = ($("#pfName").value || "").trim();
        if (!name) { toast("Escribe un nombre"); return; }
        p.name = name;
        p.avatar = ($("#pfAvatar").value || "🧒").trim() || "🧒";
        saveState();
        closeModal();
        renderAll();
      }}
    ]);
  }

  function deleteProfile(p) {
    if (state.profiles.length <= 1) { toast("Debe existir al menos un perfil"); return; }
    openModal("Eliminar perfil", `<p>¿Eliminar el perfil <strong>${escapeHtml(p.name)}</strong>? Esta acción no se puede deshacer.</p>`, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Eliminar", primary: true, onClick: () => {
        state.profiles = state.profiles.filter((x) => x.id !== p.id);
        if (state.settings.activeProfileId === p.id) {
          state.settings.activeProfileId = state.profiles[0].id;
          currentBoardId = state.profiles[0].boards[0]?.id || null;
        }
        saveState();
        closeModal();
        renderAll();
        toast("Perfil eliminado");
      }}
    ]);
  }

  /* ---------------------------------------------------------
     Editor de pictogramas / tableros
     --------------------------------------------------------- */
  function requireUnlocked() {
    if (!state.settings.editLocked) return true;
    toast("Edición bloqueada. Desbloquea en Ajustes → Terapeuta.");
    return false;
  }

  function openPictoEditor(board, picto) {
    if (!requireUnlocked()) return;
    const isNew = !picto;
    const data = picto || { emoji: "⭐", label: "", speak: "" };
    openModal(isNew ? "Nuevo pictograma" : "Editar pictograma", `
      <label class="field"><span>Emoji</span><input id="peEmoji" type="text" maxlength="4" value="${escapeHtml(data.emoji)}" /></label>
      <label class="field"><span>Etiqueta</span><input id="peLabel" type="text" maxlength="30" value="${escapeHtml(data.label)}" /></label>
      <label class="field"><span>Frase hablada (opcional)</span><input id="peSpeak" type="text" maxlength="80" value="${escapeHtml(data.speak || "")}" placeholder="Ej. Quiero agua" /></label>
    `, [
      { label: "Cancelar", onClick: closeModal },
      ...(isNew ? [] : [{ label: "Eliminar", onClick: () => {
        board.pictos = board.pictos.filter((x) => x.id !== picto.id);
        saveState(); closeModal(); renderBoard(); toast("Pictograma eliminado");
      }}]),
      { label: "Guardar", primary: true, onClick: () => {
        const emoji = ($("#peEmoji").value || "⭐").trim() || "⭐";
        const label = ($("#peLabel").value || "").trim();
        if (!label) { toast("Escribe una etiqueta"); return; }
        const speak = ($("#peSpeak").value || "").trim();
        if (isNew) {
          board.pictos.push({ id: uid("x"), emoji, label, speak: speak || label });
        } else {
          picto.emoji = emoji; picto.label = label; picto.speak = speak || label;
        }
        saveState(); closeModal(); renderBoard(); toast("Guardado");
      }}
    ]);
  }

  function openBoardEditor() {
    if (!requireUnlocked()) return;
    const board = activeBoard();
    openModal("Editar tablero", `
      <label class="field"><span>Nombre del tablero</span><input id="bdName" type="text" maxlength="30" value="${escapeHtml(board.name)}" /></label>
      <label class="field"><span>Icono (emoji)</span><input id="bdIcon" type="text" maxlength="4" value="${escapeHtml(board.icon)}" /></label>
      <button id="bdAddPicto" class="action-btn" type="button" style="margin-top:8px;">+ Añadir pictograma</button>
    `, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Guardar", primary: true, onClick: () => {
        const name = ($("#bdName").value || "").trim();
        if (!name) { toast("Escribe un nombre"); return; }
        board.name = name;
        board.icon = ($("#bdIcon").value || "📋").trim() || "📋";
        saveState(); closeModal(); renderCategories(); renderBoard(); toast("Tablero actualizado");
      }}
    ]);
    $("#bdAddPicto").addEventListener("click", () => { closeModal(); openPictoEditor(board, null); });
  }

  /* ---------------------------------------------------------
     Bloqueo de edición (PIN)
     --------------------------------------------------------- */
  function setPin() {
    openModal("PIN de terapeuta", `
      <p style="margin-top:0;color:var(--text-muted);font-size:0.9rem;">Define o cambia el PIN para desbloquear la edición.</p>
      <label class="field"><span>PIN actual (si existe)</span><input id="pinOld" type="password" inputmode="numeric" maxlength="8" /></label>
      <label class="field"><span>Nuevo PIN</span><input id="pinNew" type="password" inputmode="numeric" maxlength="8" /></label>
    `, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Guardar", primary: true, onClick: () => {
        const oldPin = $("#pinOld").value;
        const newPin = $("#pinNew").value;
        if (state.settings.pinHash && hashPin(oldPin) !== state.settings.pinHash) { toast("PIN actual incorrecto"); return; }
        if (!/^\d{4,8}$/.test(newPin)) { toast("El PIN debe tener 4-8 dígitos"); return; }
        state.settings.pinHash = hashPin(newPin);
        saveState(); closeModal(); toast("PIN actualizado");
      }}
    ]);
  }

  function toggleLock(locked) {
    if (!locked) {
      // Desbloquear: pedir PIN si existe
      if (state.settings.pinHash) {
        openModal("Desbloquear edición", `
          <label class="field"><span>PIN</span><input id="pinIn" type="password" inputmode="numeric" maxlength="8" /></label>
        `, [
          { label: "Cancelar", onClick: () => { $("#toggleLock").checked = true; closeModal(); } },
          { label: "Desbloquear", primary: true, onClick: () => {
            if (hashPin($("#pinIn").value) !== state.settings.pinHash) { toast("PIN incorrecto"); return; }
            state.settings.editLocked = false;
            saveState(); closeModal(); applyLockUI(); toast("Edición desbloqueada");
          }}
        ]);
        return;
      }
    }
    state.settings.editLocked = locked;
    saveState();
    applyLockUI();
  }

  function applyLockUI() {
    const locked = state.settings.editLocked;
    document.body.classList.toggle("editing", !locked);
    $("#toggleLock").checked = locked;
    $("#btnEditBoard").style.display = locked ? "none" : "inline-flex";
  }

  /* ---------------------------------------------------------
     Ajustes / accesibilidad
     --------------------------------------------------------- */
  function applySettings() {
    const s = state.settings;
    document.body.classList.toggle("high-contrast", !!s.highContrast);
    $("#btnContrast").setAttribute("aria-pressed", String(!!s.highContrast));
    $("#toggleContrast").checked = !!s.highContrast;

    const sizes = { sm: ["72px", "32px"], md: ["96px", "44px"], lg: ["128px", "60px"] };
    const [size, emoji] = sizes[s.pictoSize] || sizes.md;
    document.documentElement.style.setProperty("--picto-size", size);
    document.documentElement.style.setProperty("--picto-emoji", emoji);
    $("#sizeSelect").value = s.pictoSize || "md";

    $("#rateRange").value = s.rate;
    $("#rateOut").textContent = Number(s.rate).toFixed(1);
    $("#pitchRange").value = s.pitch;
    $("#pitchOut").textContent = Number(s.pitch).toFixed(1);

    const sot = $("#toggleSpeakOnTap");
    if (sot) sot.checked = !!s.speakOnTap;
    const as = $("#toggleAutoSpeak");
    if (as) as.checked = !!s.autoSpeak;
  }

  function cycleSize() {
    const order = ["sm", "md", "lg"];
    const i = order.indexOf(state.settings.pictoSize || "md");
    state.settings.pictoSize = order[(i + 1) % order.length];
    saveState();
    applySettings();
    toast(`Tamaño: ${state.settings.pictoSize}`);
  }

  /* ---------------------------------------------------------
     Import / Export
     --------------------------------------------------------- */
  function exportJson() {
    download(`tablilla-saac-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2));
    toast("Datos exportados");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.profiles)) throw new Error("Formato inválido");
        state = data;
        state.version = STATE_VERSION;
        currentBoardId = activeProfile().boards[0]?.id || null;
        phrase = [];
        saveState();
        renderAll();
        toast("Datos importados");
      } catch (e) {
        console.error(e);
        toast("Archivo JSON inválido");
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    openModal("Restablecer datos", `<p>Se borrarán perfiles, tableros personalizados, frases y registros de uso. ¿Continuar?</p>`, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Restablecer", primary: true, onClick: () => {
        localStorage.removeItem(STORAGE_KEY);
        state = defaultState();
        currentBoardId = state.profiles[0].boards[0].id;
        phrase = [];
        saveState();
        closeModal();
        renderAll();
        toast("Datos restablecidos");
      }}
    ]);
  }

  /* ---------------------------------------------------------
     Gestión de tableros
     --------------------------------------------------------- */
  function renderBoardList() {
    const list = $("#boardList");
    if (!list) return;
    list.innerHTML = "";
    const p = activeProfile();
    p.boards.forEach((b, idx) => {
      const row = document.createElement("div");
      row.className = "profile-row";
      const isActive = b.id === currentBoardId;
      row.innerHTML = `
        <span class="profile-row__avatar" aria-hidden="true">${b.icon}</span>
        <span class="profile-row__name">${escapeHtml(b.name)}${isActive ? " ✓" : ""} <small>(${b.pictos.length})</small></span>
        <span class="profile-row__actions">
          <button type="button" data-act="up" aria-label="Subir ${escapeHtml(b.name)}" ${idx === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-act="down" aria-label="Bajar ${escapeHtml(b.name)}" ${idx === p.boards.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" data-act="use" aria-label="Ir a ${escapeHtml(b.name)}">▶</button>
          <button type="button" data-act="del" aria-label="Eliminar ${escapeHtml(b.name)}">🗑</button>
        </span>
      `;
      row.querySelector('[data-act="up"]').addEventListener("click", () => moveBoard(idx, -1));
      row.querySelector('[data-act="down"]').addEventListener("click", () => moveBoard(idx, 1));
      row.querySelector('[data-act="use"]').addEventListener("click", () => {
        currentBoardId = b.id;
        searchQuery = "";
        const si = $("#searchInput"); if (si) si.value = "";
        renderCategories();
        renderBoard();
        closeSettings();
      });
      row.querySelector('[data-act="del"]').addEventListener("click", () => deleteBoard(b));
      list.appendChild(row);
    });
  }

  function moveBoard(idx, dir) {
    const p = activeProfile();
    const j = idx + dir;
    if (j < 0 || j >= p.boards.length) return;
    const [b] = p.boards.splice(idx, 1);
    p.boards.splice(j, 0, b);
    saveState();
    renderCategories();
    renderBoardList();
  }

  function addBoard() {
    if (!requireUnlocked()) return;
    openModal("Nuevo tablero", `
      <label class="field"><span>Nombre del tablero</span><input id="nbName" type="text" maxlength="30" placeholder="Ej. Rutina de la mañana" /></label>
      <label class="field"><span>Icono (emoji)</span><input id="nbIcon" type="text" maxlength="4" value="📋" /></label>
    `, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Crear", primary: true, onClick: () => {
        const name = ($("#nbName").value || "").trim();
        if (!name) { toast("Escribe un nombre"); return; }
        const icon = ($("#nbIcon").value || "📋").trim() || "📋";
        const p = activeProfile();
        const board = { id: uid("b"), name, icon, pictos: [] };
        p.boards.push(board);
        currentBoardId = board.id;
        saveState();
        closeModal();
        renderCategories();
        renderBoard();
        renderBoardList();
        toast("Tablero creado");
      }}
    ]);
  }

  function deleteBoard(board) {
    if (!requireUnlocked()) return;
    const p = activeProfile();
    if (p.boards.length <= 1) { toast("Debe existir al menos un tablero"); return; }
    openModal("Eliminar tablero", `<p>¿Eliminar el tablero <strong>${escapeHtml(board.name)}</strong> y sus ${board.pictos.length} pictogramas?</p>`, [
      { label: "Cancelar", onClick: closeModal },
      { label: "Eliminar", primary: true, onClick: () => {
        p.boards = p.boards.filter((b) => b.id !== board.id);
        if (currentBoardId === board.id) currentBoardId = p.boards[0]?.id || null;
        saveState();
        closeModal();
        renderCategories();
        renderBoard();
        renderBoardList();
        toast("Tablero eliminado");
      }}
    ]);
  }

  function openBoardManager() {
    renderBoardList();
    openSettings();
    // Desplazar a la sección de tableros
    const el = $("#boardList");
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  function exportCurrentBoard() {
    const board = activeBoard();
    if (!board) { toast("No hay tablero activo"); return; }
    const payload = { type: "saac-board", version: STATE_VERSION, board };
    download(`tablero-${board.id}.json`, JSON.stringify(payload, null, 2));
    toast("Tablero exportado");
  }

  /* ---------------------------------------------------------
     Ayuda y atajos
     --------------------------------------------------------- */
  function showHelp() {
    const html = `
      <p style="margin-top:0;color:var(--text-muted);font-size:0.9rem;">Guía rápida de uso y atajos de teclado.</p>
      <h3 style="margin:14px 0 6px;font-size:1rem;">Cómo usar</h3>
      <ol style="padding-left:20px;line-height:1.7;font-size:0.92rem;">
        <li>Toca pictogramas para añadirlos a la barra de frase.</li>
        <li>Pulsa <strong>▶ Hablar</strong> para reproducir la frase con voz.</li>
        <li>Usa <strong>⭐</strong> para guardar la frase como frecuente.</li>
        <li>La <strong>★</strong> de cada pictograma lo marca como favorito.</li>
        <li>El buscador filtra pictogramas de <em>todos</em> los tableros.</li>
      </ol>
      <h3 style="margin:14px 0 6px;font-size:1rem;">Atajos de teclado</h3>
      <ul style="padding-left:20px;line-height:1.7;font-size:0.92rem;">
        <li><kbd>Enter</kbd> / <kbd>Espacio</kbd> — Hablar la frase (sin foco en control).</li>
        <li><kbd>Retroceso</kbd> — Borrar último pictograma.</li>
        <li><kbd>Esc</kbd> — Cerrar modal o panel.</li>
        <li><kbd>/</kbd> — Enfocar el buscador.</li>
        <li><kbd>Tab</kbd> — Navegar entre controles.</li>
      </ul>
    `;
    openModal("Ayuda", html, [{ label: "Entendido", primary: true, onClick: closeModal }]);
  }

  /* ---------------------------------------------------------
     Estado de conexión (offline/online)
     --------------------------------------------------------- */
  function updateNetStatus() {
    const el = $("#netStatus");
    if (!el) return;
    const online = navigator.onLine;
    el.classList.toggle("is-offline", !online);
    el.querySelector(".net-label").textContent = online ? "En línea" : "Sin conexión";
    el.title = online ? "Conectado (la app funciona offline)" : "Sin conexión (la app sigue funcionando)";
  }

  /* ---------------------------------------------------------
     Modal genérico
     --------------------------------------------------------- */
  // Devuelve los elementos enfocables visibles dentro de un contenedor.
  function focusableIn(container) {
    if (!container) return [];
    const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(sel)).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  // Atrapa el foco dentro de un contenedor (Tab / Shift+Tab ciclan).
  function trapFocus(container, e) {
    if (e.key !== "Tab") return;
    const items = focusableIn(container);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  let lastFocusedBeforeModal = null;

  function openModal(title, bodyHtml, buttons) {
    lastFocusedBeforeModal = document.activeElement;
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    const footer = $("#modalFooter");
    footer.innerHTML = "";
    (buttons || []).forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "action-btn" + (b.primary ? " action-btn--primary" : "") + (b.danger ? " action-btn--danger" : "");
      btn.textContent = b.label;
      btn.addEventListener("click", b.onClick);
      footer.appendChild(btn);
    });
    $("#modalOverlay").hidden = false;
    $("#modal").hidden = false;
    // Enfocar el primer control del cuerpo para accesibilidad
    const first = $("#modalBody input, #modalBody select, #modalBody button");
    if (first) setTimeout(() => first.focus(), 30);
  }

  function closeModal() {
    $("#modal").hidden = true;
    $("#modalOverlay").hidden = true;
    $("#modalBody").innerHTML = "";
    $("#modalFooter").innerHTML = "";
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
  }

  /* ---------------------------------------------------------
     Panel de ajustes
     --------------------------------------------------------- */
  let lastFocusedBeforeSettings = null;

  function openSettings() {
    lastFocusedBeforeSettings = document.activeElement;
    renderProfiles();
    applySettings();
    applyLockUI();
    $("#settingsOverlay").hidden = false;
    $("#settingsPanel").hidden = false;
    $("#btnCloseSettings").focus();
  }

  function closeSettings() {
    $("#settingsPanel").hidden = true;
    $("#settingsOverlay").hidden = true;
    if (lastFocusedBeforeSettings && typeof lastFocusedBeforeSettings.focus === "function") {
      lastFocusedBeforeSettings.focus();
    }
    lastFocusedBeforeSettings = null;
  }

  /* ---------------------------------------------------------
     Render global
     --------------------------------------------------------- */
  function renderAll() {
    const p = activeProfile();
    if (!currentBoardId || !p.boards.some((b) => b.id === currentBoardId)) {
      currentBoardId = p.boards[0]?.id || null;
    }
    renderCategories();
    renderBoard();
    renderPhrase();
    renderFrequent();
    renderRecent();
    renderProfiles();
    renderBoardList();
    applySettings();
    applyLockUI();
  }

  /* ---------------------------------------------------------
     Eventos
     --------------------------------------------------------- */
  function bindEvents() {
    // Barra de frase
    $("#btnSpeak").addEventListener("click", () => {
      if (!phrase.length) { toast("La frase está vacía"); return; }
      const text = phraseText();
      Speech.speak(text);
      logUsage("phrase", text, "frase");
      pushRecentPhrase(text, phrase);
    });
    $("#btnBackspace").addEventListener("click", () => {
      if (!phrase.length) return;
      phrase.pop();
      renderPhrase();
    });
    $("#btnClear").addEventListener("click", () => {
      if (!phrase.length) return;
      phrase = [];
      renderPhrase();
    });
    $("#btnSavePhrase").addEventListener("click", saveCurrentPhrase);

    // Topbar
    $("#btnContrast").addEventListener("click", () => {
      state.settings.highContrast = !state.settings.highContrast;
      saveState();
      applySettings();
    });
    $("#btnSize").addEventListener("click", cycleSize);
    $("#btnSettings").addEventListener("click", openSettings);
    $("#btnProfiles").addEventListener("click", openSettings);
    $("#btnCloseSettings").addEventListener("click", closeSettings);
    $("#settingsOverlay").addEventListener("click", closeSettings);

    // Editar / gestionar tableros
    $("#btnEditBoard").addEventListener("click", openBoardEditor);
    $("#btnManageBoards").addEventListener("click", openBoardManager);
    $("#btnAddBoard").addEventListener("click", addBoard);
    $("#btnExportBoard").addEventListener("click", exportCurrentBoard);

    // Búsqueda
    const searchInput = $("#searchInput");
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      $("#btnClearSearch").hidden = !searchQuery;
      renderBoard();
    });
    $("#btnClearSearch").addEventListener("click", () => {
      searchQuery = "";
      searchInput.value = "";
      $("#btnClearSearch").hidden = true;
      renderBoard();
      searchInput.focus();
    });

    // Ayuda
    $("#btnHelp").addEventListener("click", showHelp);

    // Ajustes: voz
    $("#voiceSelect").addEventListener("change", (e) => {
      state.settings.voiceURI = e.target.value || null;
      saveState();
    });
    $("#rateRange").addEventListener("input", (e) => {
      state.settings.rate = Number(e.target.value);
      $("#rateOut").textContent = Number(e.target.value).toFixed(1);
      saveState();
    });
    $("#pitchRange").addEventListener("input", (e) => {
      state.settings.pitch = Number(e.target.value);
      $("#pitchOut").textContent = Number(e.target.value).toFixed(1);
      saveState();
    });
    $("#btnTestVoice").addEventListener("click", () => Speech.speak("Hola, esta es mi voz."));

    // Ajustes: accesibilidad
    $("#toggleContrast").addEventListener("change", (e) => {
      state.settings.highContrast = e.target.checked;
      saveState();
      applySettings();
    });
    $("#sizeSelect").addEventListener("change", (e) => {
      state.settings.pictoSize = e.target.value;
      saveState();
      applySettings();
    });
    $("#toggleSpeakOnTap").addEventListener("change", (e) => {
      state.settings.speakOnTap = e.target.checked;
      saveState();
    });
    $("#toggleAutoSpeak").addEventListener("change", (e) => {
      state.settings.autoSpeak = e.target.checked;
      saveState();
    });

    // Ajustes: perfiles
    $("#btnAddProfile").addEventListener("click", addProfile);

    // Ajustes: terapeuta
    $("#toggleLock").addEventListener("change", (e) => toggleLock(e.target.checked));
    $("#btnSetPin").addEventListener("click", setPin);
    $("#btnAnalytics").addEventListener("click", showAnalytics);
    $("#btnExportCsv").addEventListener("click", exportCsv);

    // Ajustes: datos
    $("#btnExportJson").addEventListener("click", exportJson);
    $("#importJson").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importJson(file);
      e.target.value = "";
    });
    $("#btnReset").addEventListener("click", resetData);

    // Modal
    $("#btnCloseModal").addEventListener("click", closeModal);
    $("#modalOverlay").addEventListener("click", closeModal);

    // Teclado global
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!$("#modal").hidden) { closeModal(); return; }
        if (!$("#settingsPanel").hidden) { closeSettings(); return; }
      }
      const active = document.activeElement;
      const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT");
      // Enter/Espacio para hablar cuando el foco no está en un control interactivo
      if ((e.key === "Enter" || e.key === " ") && active === document.body) {
        e.preventDefault();
        $("#btnSpeak").click();
        return;
      }
      if (typing) return;
      // "/" enfoca el buscador
      if (e.key === "/") {
        e.preventDefault();
        $("#searchInput").focus();
        return;
      }
      // Retroceso borra el último pictograma
      if (e.key === "Backspace") {
        e.preventDefault();
        $("#btnBackspace").click();
      }
    });
  }

  /* ---------------------------------------------------------
     Inicialización
     --------------------------------------------------------- */
  function init() {
    state = loadState();
    const p = activeProfile();
    currentBoardId = p.boards[0]?.id || null;
    phrase = [];
    Speech.init();
    bindEvents();
    renderAll();
    updateNetStatus();
    window.addEventListener("online", updateNetStatus);
    window.addEventListener("offline", updateNetStatus);
    // Registrar service worker (PWA offline)
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW no registrado:", err));
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
