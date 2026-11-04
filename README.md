# Tablilla SAAC

Tablilla de **comunicación aumentativa y alternativa (SAAC/AAC)** para niños sin lenguaje oral o con dificultades de comunicación. Aplicación web **100% offline**, sin dependencias ni servidores, usable en tablet y PC.

## Características

- **Pictogramas por categorías** con emojis nativos (sin assets externos).
- **Barra de frase**: toca pictogramas para construir una frase y reprodúcela con voz (Web Speech API).
- **Frases frecuentes**: guarda y reproduce combinaciones de uso habitual.
- **Perfiles**: varios niños/usuarios, cada uno con sus tableros y frases.
- **Editor**: crea/edita pictogramas y tableros (bloqueable con PIN de terapeuta).
- **Accesibilidad**: alto contraste, tamaño de pictograma ajustable, navegación por teclado, `aria-label`, respeto a `prefers-reduced-motion`.
- **Analítica**: registro de uso local y exportación a CSV.
- **Import/Export JSON** para respaldo manual.
- **PWA**: instalable y funcional sin conexión tras la primera carga.

## Estructura

```
Tablilla/
├── index.html
├── styles.css
├── app.js
├── manifest.json
├── sw.js
├── data/
│   └── pictogramas.js      # Dataset inicial por categorías
├── assets/
│   └── icons/              # Iconos PWA (192, 512, maskable)
├── tools/
│   ├── make_icons.py       # Genera los iconos PNG
│   ├── check_js.py         # Verifica balance estructural de JS
│   └── verify_refs.py      # Verifica IDs y funciones referenciadas
├── plans/
│   └── plan-tablilla-saac.md
└── README.md
```

## Uso

1. Abre `index.html` en un navegador moderno (Chrome, Edge, Firefox, Safari).
2. Para la PWA offline, sírvelo por HTTP (por ejemplo `python3 -m http.server`) y ábrelo desde `http://localhost:8000`. El service worker requiere un origen `http(s)` (no `file://`).
3. Toca pictogramas para formar una frase y pulsa **▶ Hablar**.

### Bloqueo de edición

Por defecto la edición está **bloqueada**. Para editar tableros/pictogramas:

1. Abre **Ajustes → Terapeuta**.
2. Define un **PIN** (4–8 dígitos) con *Cambiar PIN*.
3. Desactiva *Bloquear edición* e introduce el PIN.

## Datos y privacidad

- Todo se guarda en `localStorage` del navegador (clave `saac_state_v1`).
- No hay servidores, telemetría ni peticiones externas.
- Usa **Exportar todo (JSON)** para respaldar y **Importar (JSON)** para restaurar.

## Herramientas de desarrollo

```bash
# Regenerar iconos PWA
python3 tools/make_icons.py

# Verificar balance de llaves/paréntesis en JS
python3 tools/check_js.py app.js sw.js data/pictogramas.js

# Verificar IDs del DOM y funciones referenciadas
python3 tools/verify_refs.py
```

## Criterios de aceptación del MVP

1. Funciona offline tras la primera carga.
2. Se puede construir y reproducir una frase con TTS.
3. Se pueden crear perfiles y tableros personalizados.
4. La edición se bloquea con PIN.
5. Se registra el uso y se exporta a CSV.
6. Se importan/exportan tableros en JSON.
7. Responsive y accesible en tablet y PC.
