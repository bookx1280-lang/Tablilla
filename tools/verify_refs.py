#!/usr/bin/env python3
"""Verifica referencias cruzadas entre app.js e index.html.

1. Cada $("#id") en app.js debe existir como id en index.html.
2. Cada función local llamada debe estar definida.
"""
import re
import sys

js = open("app.js", encoding="utf-8").read()
html = open("index.html", encoding="utf-8").read()

# 1) IDs
refs = set(re.findall(r'\$\("#([\w-]+)"\)', js))
html_ids = set(re.findall(r'id="([\w-]+)"', html))
missing_ids = sorted(refs - html_ids)
print(f"IDs referenciados en JS: {len(refs)}")
print("IDs faltantes en HTML:", missing_ids if missing_ids else "ninguno")

# 2) Funciones locales
defined = set(re.findall(r"function\s+(\w+)\s*\(", js))
# llamadas a identificadores simples (sin punto delante)
calls = set(re.findall(r"(?<![\w.$])([a-zA-Z_]\w*)\s*\(", js))
keywords = {
    "if", "for", "while", "switch", "catch", "function", "return", "typeof",
    "new", "else", "do", "try", "void", "delete", "in", "of", "instanceof",
    "yield", "await", "async",
}
# Nombres que son métodos/globales conocidos (no locales)
known_globals = {
    "Number", "String", "Array", "Object", "JSON", "setTimeout", "clearTimeout",
    "parseInt", "parseFloat", "Blob", "URL", "FileReader",
    "SpeechSynthesisUtterance", "Boolean", "Math", "Date", "Promise", "fetch",
    "caches", "self", "navigator", "localStorage", "console", "document",
    "window", "RegExp", "Error", "isNaN", "encodeURIComponent",
    "decodeURIComponent", "alert", "confirm", "prompt", "requestAnimationFrame",
    "structuredClone", "Intl", "Set", "Map", "WeakMap", "Symbol", "BigInt",
    "Proxy", "Reflect", "ArrayBuffer", "Uint8Array", "TextEncoder",
    "TextDecoder", "AbortController", "CustomEvent", "Event", "HTMLElement",
    "Node", "Element", "getComputedStyle", "matchMedia", "importScripts",
    "skipWaiting", "clients", "addEventListener", "removeEventListener",
    "dispatchEvent", "querySelector", "querySelectorAll", "getElementById",
    "createElement", "createTextNode", "appendChild", "removeChild",
    "insertBefore", "replaceChild", "cloneNode", "contains", "matches",
    "closest", "getAttribute", "setAttribute", "removeAttribute",
    "hasAttribute", "toggleAttribute", "focus", "blur", "click", "submit",
    "reset", "scrollIntoView", "getBoundingClientRect", "getItem", "setItem",
    "removeItem", "clear", "push", "pop", "shift", "unshift", "splice",
    "slice", "map", "filter", "reduce", "forEach", "find", "findIndex",
    "some", "every", "includes", "indexOf", "lastIndexOf", "join", "split",
    "replace", "replaceAll", "trim", "toLowerCase", "toUpperCase",
    "startsWith", "endsWith", "padStart", "padEnd", "repeat", "charAt",
    "charCodeAt", "codePointAt", "concat", "sort", "reverse", "flat",
    "flatMap", "fill", "copyWithin", "entries", "keys", "values", "from",
    "fromEntries", "assign", "freeze", "seal", "create", "defineProperty",
    "getOwnPropertyNames", "hasOwnProperty", "isArray", "stringify", "parse",
    "now", "random", "floor", "ceil", "round", "abs", "max", "min", "pow",
    "sqrt", "toFixed", "toString", "valueOf", "toISOString", "getTime",
    "getFullYear", "getMonth", "getDate", "getHours", "getMinutes",
    "getSeconds", "getMilliseconds", "getDay", "getTimezoneOffset",
    "toLocaleString", "toLocaleDateString", "toLocaleTimeString", "toJSON",
    "test", "exec", "match", "matchAll", "search", "normalize",
    "localeCompare", "isInteger", "isFinite", "isSafeInteger", "cancel",
    "speak", "getVoices", "pause", "resume", "register", "then", "catch",
    "finally", "all", "race", "resolve", "reject", "allSettled", "any",
    "addAll", "put", "delete", "claim", "warn", "error", "log", "info",
    "debug", "createObjectURL", "revokeObjectURL", "readAsText", "abort",
    "open", "close", "print", "postMessage",
}
undef = sorted(
    c for c in calls
    if c not in defined and c not in keywords and c not in known_globals
)
print("Funciones locales definidas:", len(defined))
print("Posibles funciones no definidas:", undef if undef else "ninguna")

ok = not missing_ids and not undef
sys.exit(0 if ok else 1)
