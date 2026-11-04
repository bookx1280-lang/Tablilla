#!/usr/bin/env python3
"""Aplica el focus trap y la restauración de foco a app.js de forma idempotente."""
import sys

PATH = "app.js"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

if "function trapFocus(" in src:
    print("Ya aplicado: focus trap presente. Nada que hacer.")
    sys.exit(0)

# 1) Insertar helpers antes de openModal
old_open = "  function openModal(title, bodyHtml, buttons) {\n    $(\"#modalTitle\").textContent = title;"
new_open = """  // Devuelve los elementos enfocables visibles dentro de un contenedor.
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
    $("#modalTitle").textContent = title;"""

if old_open not in src:
    print("ERROR: no se encontró el inicio de openModal.")
    sys.exit(1)
src = src.replace(old_open, new_open, 1)

# 2) Restaurar foco al cerrar modal
old_close = """  function closeModal() {
    $("#modal").hidden = true;
    $("#modalOverlay").hidden = true;
    $("#modalBody").innerHTML = "";
    $("#modalFooter").innerHTML = "";
  }"""
new_close = """  function closeModal() {
    $("#modal").hidden = true;
    $("#modalOverlay").hidden = true;
    $("#modalBody").innerHTML = "";
    $("#modalFooter").innerHTML = "";
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
    lastFocusedBeforeModal = null;
  }"""
if old_close not in src:
    print("ERROR: no se encontró closeModal.")
    sys.exit(1)
src = src.replace(old_close, new_close, 1)

# 3) openSettings / closeSettings con restauración de foco
old_settings = """  function openSettings() {
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
  }"""
new_settings = """  let lastFocusedBeforeSettings = null;

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
  }"""
if old_settings not in src:
    print("ERROR: no se encontró openSettings/closeSettings.")
    sys.exit(1)
src = src.replace(old_settings, new_settings, 1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: focus trap y restauración de foco aplicados a app.js")
