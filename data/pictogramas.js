/**
 * Dataset inicial de pictogramas SAAC.
 * Cada tablero (categoría) contiene pictogramas con:
 *  - emoji: símbolo visual
 *  - label: texto mostrado bajo el pictograma
 *  - speak: frase que se pronuncia al usar el pictograma (opcional, por defecto = label)
 *
 * Los IDs son estables para permitir import/export y personalización.
 */
window.SAAC_DEFAULT_BOARDS = [
  {
    id: "necesidades",
    name: "Necesidades",
    icon: "🙋",
    color: "#e74c3c",
    pictos: [
      { id: "n-agua", emoji: "💧", label: "Agua", speak: "Quiero agua" },
      { id: "n-comida", emoji: "🍽️", label: "Comida", speak: "Quiero comer" },
      { id: "n-bano", emoji: "🚽", label: "Baño", speak: "Necesito ir al baño" },
      { id: "n-dormir", emoji: "😴", label: "Dormir", speak: "Quiero dormir" },
      { id: "n-ayuda", emoji: "🆘", label: "Ayuda", speak: "Necesito ayuda" },
      { id: "n-duelo", emoji: "🤕", label: "Me duele", speak: "Me duele" },
      { id: "n-frio", emoji: "🥶", label: "Tengo frío", speak: "Tengo frío" },
      { id: "n-calor", emoji: "🥵", label: "Tengo calor", speak: "Tengo calor" },
      { id: "n-abrazo", emoji: "🤗", label: "Abrazo", speak: "Quiero un abrazo" },
      { id: "n-silencio", emoji: "🤫", label: "Silencio", speak: "Quiero silencio" },
      { id: "n-luz", emoji: "💡", label: "Luz", speak: "Quiero la luz" },
      { id: "n-medicina", emoji: "💊", label: "Medicina", speak: "Necesito mi medicina" }
    ]
  },
  {
    id: "emociones",
    name: "Emociones",
    icon: "😊",
    color: "#f39c12",
    pictos: [
      { id: "e-feliz", emoji: "😄", label: "Feliz", speak: "Estoy feliz" },
      { id: "e-triste", emoji: "😢", label: "Triste", speak: "Estoy triste" },
      { id: "e-enojado", emoji: "😠", label: "Enojado", speak: "Estoy enojado" },
      { id: "e-miedo", emoji: "😨", label: "Miedo", speak: "Tengo miedo" },
      { id: "e-cansado", emoji: "😩", label: "Cansado", speak: "Estoy cansado" },
      { id: "e-amor", emoji: "❤️", label: "Amor", speak: "Te quiero" },
      { id: "e-sorpresa", emoji: "😮", label: "Sorpresa", speak: "Estoy sorprendido" },
      { id: "e-verguenza", emoji: "😳", label: "Vergüenza", speak: "Me da vergüenza" },
      { id: "e-calmado", emoji: "😌", label: "Calmado", speak: "Estoy calmado" },
      { id: "e-nervioso", emoji: "😰", label: "Nervioso", speak: "Estoy nervioso" },
      { id: "e-aburrido", emoji: "🥱", label: "Aburrido", speak: "Estoy aburrido" },
      { id: "e-orgulloso", emoji: "😎", label: "Orgulloso", speak: "Estoy orgulloso" }
    ]
  },
  {
    id: "comida",
    name: "Comida y bebida",
    icon: "🍎",
    color: "#27ae60",
    pictos: [
      { id: "c-manzana", emoji: "🍎", label: "Manzana", speak: "Quiero una manzana" },
      { id: "c-platano", emoji: "🍌", label: "Plátano", speak: "Quiero un plátano" },
      { id: "c-pan", emoji: "🍞", label: "Pan", speak: "Quiero pan" },
      { id: "c-leche", emoji: "🥛", label: "Leche", speak: "Quiero leche" },
      { id: "c-jugo", emoji: "🧃", label: "Jugo", speak: "Quiero jugo" },
      { id: "c-galleta", emoji: "🍪", label: "Galleta", speak: "Quiero una galleta" },
      { id: "c-helado", emoji: "🍦", label: "Helado", speak: "Quiero helado" },
      { id: "c-pizza", emoji: "🍕", label: "Pizza", speak: "Quiero pizza" },
      { id: "c-fruta", emoji: "🍇", label: "Fruta", speak: "Quiero fruta" },
      { id: "c-sopa", emoji: "🍲", label: "Sopa", speak: "Quiero sopa" },
      { id: "c-pollo", emoji: "🍗", label: "Pollo", speak: "Quiero pollo" },
      { id: "c-mas", emoji: "➕", label: "Más", speak: "Quiero más" }
    ]
  },
  {
    id: "acciones",
    name: "Acciones",
    icon: "🏃",
    color: "#2980b9",
    pictos: [
      { id: "a-jugar", emoji: "🎮", label: "Jugar", speak: "Quiero jugar" },
      { id: "a-correr", emoji: "🏃", label: "Correr", speak: "Quiero correr" },
      { id: "a-leer", emoji: "📖", label: "Leer", speak: "Quiero leer" },
      { id: "a-dibujar", emoji: "🎨", label: "Dibujar", speak: "Quiero dibujar" },
      { id: "a-cantar", emoji: "🎵", label: "Cantar", speak: "Quiero cantar" },
      { id: "a-bailar", emoji: "💃", label: "Bailar", speak: "Quiero bailar" },
      { id: "a-ver", emoji: "📺", label: "Ver tele", speak: "Quiero ver televisión" },
      { id: "a-caminar", emoji: "🚶", label: "Caminar", speak: "Quiero caminar" },
      { id: "a-escuchar", emoji: "👂", label: "Escuchar", speak: "Quiero escuchar" },
      { id: "a-hablar", emoji: "💬", label: "Hablar", speak: "Quiero hablar" },
      { id: "a-escribir", emoji: "✏️", label: "Escribir", speak: "Quiero escribir" },
      { id: "a-descansar", emoji: "🛋️", label: "Descansar", speak: "Quiero descansar" }
    ]
  },
  {
    id: "personas",
    name: "Personas",
    icon: "👨‍👩‍👧",
    color: "#8e44ad",
    pictos: [
      { id: "p-mama", emoji: "👩", label: "Mamá", speak: "Mamá" },
      { id: "p-papa", emoji: "👨", label: "Papá", speak: "Papá" },
      { id: "p-abuela", emoji: "👵", label: "Abuela", speak: "Abuela" },
      { id: "p-abuelo", emoji: "👴", label: "Abuelo", speak: "Abuelo" },
      { id: "p-hermano", emoji: "👦", label: "Hermano", speak: "Hermano" },
      { id: "p-hermana", emoji: "👧", label: "Hermana", speak: "Hermana" },
      { id: "p-amigo", emoji: "🧑‍🤝‍🧑", label: "Amigo", speak: "Amigo" },
      { id: "p-maestro", emoji: "🧑‍🏫", label: "Maestro", speak: "Maestro" },
      { id: "p-doctor", emoji: "🧑‍⚕️", label: "Doctor", speak: "Doctor" },
      { id: "p-yo", emoji: "🙋", label: "Yo", speak: "Yo" },
      { id: "p-nino", emoji: "🧒", label: "Niño", speak: "Niño" },
      { id: "p-nina", emoji: "👶", label: "Bebé", speak: "Bebé" }
    ]
  },
  {
    id: "lugares",
    name: "Lugares",
    icon: "🏠",
    color: "#16a085",
    pictos: [
      { id: "l-casa", emoji: "🏠", label: "Casa", speak: "Quiero ir a casa" },
      { id: "l-escuela", emoji: "🏫", label: "Escuela", speak: "Quiero ir a la escuela" },
      { id: "l-parque", emoji: "🌳", label: "Parque", speak: "Quiero ir al parque" },
      { id: "l-hospital", emoji: "🏥", label: "Hospital", speak: "Quiero ir al hospital" },
      { id: "l-tienda", emoji: "🏪", label: "Tienda", speak: "Quiero ir a la tienda" },
      { id: "l-playa", emoji: "🏖️", label: "Playa", speak: "Quiero ir a la playa" },
      { id: "l-calle", emoji: "🛣️", label: "Calle", speak: "Quiero salir a la calle" },
      { id: "l-coche", emoji: "🚗", label: "Coche", speak: "Quiero ir en coche" },
      { id: "l-biblioteca", emoji: "📚", label: "Biblioteca", speak: "Quiero ir a la biblioteca" },
      { id: "l-bano", emoji: "🚻", label: "Baño", speak: "Quiero ir al baño" },
      { id: "l-cocina", emoji: "🍳", label: "Cocina", speak: "Quiero ir a la cocina" },
      { id: "l-jardin", emoji: "🌻", label: "Jardín", speak: "Quiero ir al jardín" }
    ]
  },
  {
    id: "cortesia",
    name: "Cortesía",
    icon: "🙏",
    color: "#d35400",
    pictos: [
      { id: "s-hola", emoji: "👋", label: "Hola", speak: "Hola" },
      { id: "s-adios", emoji: "👋", label: "Adiós", speak: "Adiós" },
      { id: "s-gracias", emoji: "🙏", label: "Gracias", speak: "Gracias" },
      { id: "s-porfavor", emoji: "🥺", label: "Por favor", speak: "Por favor" },
      { id: "s-perdon", emoji: "😔", label: "Perdón", speak: "Perdón" },
      { id: "s-si", emoji: "✅", label: "Sí", speak: "Sí" },
      { id: "s-no", emoji: "❌", label: "No", speak: "No" },
      { id: "s-buenosdias", emoji: "🌅", label: "Buenos días", speak: "Buenos días" },
      { id: "s-buenasnoches", emoji: "🌙", label: "Buenas noches", speak: "Buenas noches" },
      { id: "s-bienvenido", emoji: "🤝", label: "Bienvenido", speak: "Bienvenido" },
      { id: "s-espera", emoji: "⏳", label: "Espera", speak: "Espera, por favor" },
      { id: "s-tequiero", emoji: "💖", label: "Te quiero", speak: "Te quiero" }
    ]
  }
];
