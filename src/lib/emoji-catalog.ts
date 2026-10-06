/**
 * Catálogo de emojis para categorías y cuentas, agrupado y con palabras clave en español
 * (es-ES) para el buscador y para sugerir un emoji a partir del nombre ("Supermercado" → 🛒).
 * Los nombres de los grupos están en el diccionario (`emojiPicker.groups`).
 */

export type EmojiGroupKey =
  | "food"
  | "drinks"
  | "shopping"
  | "home"
  | "transport"
  | "leisure"
  | "health"
  | "family"
  | "pets"
  | "work"
  | "travel"
  | "other"

type Entry = readonly [emoji: string, keywords: string]

export const EMOJI_CATALOG: readonly { key: EmojiGroupKey; emojis: readonly Entry[] }[] = [
  {
    key: "food",
    emojis: [
      ["🍽️", "comida restaurante restaurantes comer cena cenar almuerzo menu"],
      ["🍔", "hamburguesa hamburgueseria comida rapida burger"],
      ["🍕", "pizza pizzeria"],
      ["🌮", "tacos mexicano"],
      ["🌯", "burrito wrap"],
      ["🥙", "kebab doner"],
      ["🍣", "sushi japones"],
      ["🍜", "ramen fideos asiatico"],
      ["🍝", "pasta italiano espaguetis"],
      ["🍛", "curry indio"],
      ["🥘", "paella arroz"],
      ["🍲", "guiso cocido"],
      ["🥗", "ensalada saludable healthy"],
      ["🥪", "bocadillo sandwich bocata"],
      ["🌭", "perrito hot dog"],
      ["🍟", "patatas fritas"],
      ["🍗", "pollo asado"],
      ["🥩", "carne carniceria"],
      ["🐟", "pescado pescaderia"],
      ["🦐", "marisco gambas"],
      ["🍳", "desayuno huevos cocinar"],
      ["🥐", "desayuno croissant bolleria"],
      ["🍞", "pan panaderia"],
      ["🥖", "barra pan panaderia"],
      ["🧀", "queso"],
      ["🥚", "huevos"],
      ["🥛", "leche lacteos"],
      ["🍎", "fruta fruteria manzana"],
      ["🍌", "fruta platano"],
      ["🍓", "fruta fresas"],
      ["🥦", "verdura verduras"],
      ["🥕", "verdura zanahoria"],
      ["🥑", "aguacate"],
      ["🍰", "tarta pasteleria postre"],
      ["🧁", "cupcake pasteles reposteria"],
      ["🍩", "donut dulces"],
      ["🍪", "galletas"],
      ["🍫", "chocolate dulces chuches"],
      ["🍬", "caramelos chuches golosinas"],
      ["🍦", "helado heladeria"],
      ["🍿", "palomitas"],
      ["🥨", "snack aperitivo picoteo"],
      ["🥡", "comida para llevar domicilio glovo uber eats just eat delivery"],
    ],
  },
  {
    key: "drinks",
    emojis: [
      ["☕", "cafe cafes cafeteria desayuno starbucks"],
      ["🫖", "te infusion"],
      ["🍵", "te matcha"],
      ["🍺", "cerveza bar birra"],
      ["🍻", "canas cervezas bar copas ocio salir tapas"],
      ["🍷", "vino vinos bodega"],
      ["🍸", "copas coctel cocteles discoteca"],
      ["🍹", "coctel cocteles"],
      ["🥂", "celebracion brindis"],
      ["🍾", "fiesta champan cava"],
      ["🥃", "whisky licor"],
      ["🥤", "refresco refrescos"],
      ["🧋", "batido bubble tea"],
      ["💧", "agua"],
      ["🧊", "hielo"],
    ],
  },
  {
    key: "shopping",
    emojis: [
      ["🛒", "supermercado super compra compras mercado mercadona carrefour lidl dia alimentacion"],
      ["🛍️", "compras tiendas shopping centro comercial"],
      ["🏪", "tienda ultramarinos chino"],
      ["🧺", "mercadillo cesta"],
      ["📦", "pedidos pedido paquete envio online amazon aliexpress shein"],
      ["👕", "ropa camiseta moda"],
      ["👖", "ropa pantalon vaqueros"],
      ["👗", "ropa vestido moda"],
      ["🧥", "ropa abrigo chaqueta"],
      ["👟", "zapatillas calzado deporte"],
      ["👠", "zapatos tacones calzado"],
      ["👜", "bolso complementos"],
      ["🎒", "mochila"],
      ["🕶️", "gafas de sol complementos"],
      ["⌚", "reloj"],
      ["💍", "joyas joyeria anillo"],
      ["💄", "maquillaje belleza cosmetica"],
      ["🧴", "cosmetica crema perfumeria cuidado personal"],
      ["🧼", "higiene jabon drogueria"],
      ["🪥", "higiene cepillo dientes"],
      ["🧻", "papel drogueria limpieza"],
      ["💇", "peluqueria corte pelo"],
      ["💈", "barberia barbero"],
      ["💅", "unas manicura estetica"],
      ["🎁", "regalo regalos cumpleanos detalle"],
      ["💐", "flores floristeria"],
      ["🧸", "juguetes jugueteria"],
      ["📱", "movil telefono smartphone"],
      ["💻", "ordenador portatil tecnologia informatica"],
      ["🎧", "auriculares tecnologia"],
      ["🔌", "electronica cargador cables"],
    ],
  },
  {
    key: "home",
    emojis: [
      ["🏠", "casa hogar alquiler hipoteca vivienda"],
      ["🏡", "casa vivienda"],
      ["🔑", "alquiler llaves piso"],
      ["🏢", "comunidad piso edificio"],
      ["💡", "luz electricidad"],
      ["⚡", "luz electricidad energia"],
      ["🔥", "gas calefaccion butano"],
      ["🚿", "agua ducha"],
      ["🌐", "internet fibra wifi"],
      ["📶", "internet datos"],
      ["📺", "tele television"],
      ["🛋️", "muebles sofa decoracion ikea"],
      ["🛏️", "cama dormitorio"],
      ["🪑", "muebles silla"],
      ["🧹", "limpieza"],
      ["🧽", "limpieza productos"],
      ["👚", "lavanderia tintoreria"],
      ["🔧", "reparaciones arreglos fontanero"],
      ["🔨", "bricolaje herramientas obra reforma"],
      ["🪴", "plantas jardin jardineria"],
      ["🧾", "facturas recibos impuestos"],
      ["🗑️", "basura tasas"],
      ["🛡️", "seguro seguros hogar"],
    ],
  },
  {
    key: "transport",
    emojis: [
      ["🚌", "autobus bus transporte publico emt"],
      ["🚇", "metro"],
      ["🚆", "tren renfe cercanias"],
      ["🚄", "ave alta velocidad tren"],
      ["🚊", "tranvia"],
      ["🚕", "taxi cabify uber bolt"],
      ["🚗", "coche"],
      ["🚙", "coche todoterreno"],
      ["⛽", "gasolina gasolinera combustible diesel"],
      ["🔋", "carga coche electrico bateria"],
      ["🅿️", "parking aparcamiento zona azul"],
      ["🛣️", "peaje autopista"],
      ["🚲", "bici bicicleta"],
      ["🛴", "patinete"],
      ["🏍️", "moto motocicleta"],
      ["🛵", "moto scooter"],
      ["🧰", "taller mecanico itv revision"],
      ["🚦", "multa multas trafico"],
      ["🚘", "alquiler coche"],
    ],
  },
  {
    key: "leisure",
    emojis: [
      ["🎬", "cine peliculas"],
      ["🎭", "teatro espectaculo"],
      ["🎟️", "entradas eventos"],
      ["🎵", "musica concierto conciertos"],
      ["🎤", "karaoke"],
      ["🎸", "guitarra musica"],
      ["🎮", "videojuegos consola playstation xbox nintendo gaming"],
      ["🕹️", "juegos arcade"],
      ["🎲", "juegos de mesa"],
      ["🃏", "cartas juegos"],
      ["🎳", "bolos"],
      ["🎯", "dardos ocio"],
      ["🎡", "feria"],
      ["🎢", "parque de atracciones"],
      ["🏖️", "playa vacaciones verano"],
      ["🏕️", "camping acampada"],
      ["🎉", "fiesta fiestas salir"],
      ["🥳", "cumpleanos celebracion"],
      ["📚", "libros libreria estudiar"],
      ["📖", "lectura libro"],
      ["📰", "periodico revista prensa"],
      ["🎨", "arte pintura manualidades"],
      ["📸", "fotos fotografia camara"],
      ["🧩", "hobbies puzle"],
      ["📺", "streaming series netflix hbo disney"],
      ["🎰", "apuestas casino"],
      ["🍀", "loteria suerte"],
    ],
  },
  {
    key: "health",
    emojis: [
      ["🏋️", "gimnasio gym pesas"],
      ["💪", "gimnasio entrenamiento"],
      ["🧘", "yoga meditacion pilates"],
      ["🏃", "correr running"],
      ["⚽", "futbol deporte"],
      ["🏀", "baloncesto"],
      ["🎾", "tenis padel"],
      ["🏊", "natacion piscina"],
      ["🚴", "ciclismo spinning"],
      ["⛷️", "esqui nieve"],
      ["🥊", "boxeo artes marciales"],
      ["💊", "farmacia medicinas pastillas salud"],
      ["🩺", "medico consulta salud"],
      ["🏥", "hospital urgencias"],
      ["🦷", "dentista"],
      ["👓", "optica gafas lentillas"],
      ["🧠", "psicologo terapia"],
      ["💆", "masaje fisio fisioterapia spa"],
      ["🩹", "botiquin"],
    ],
  },
  {
    key: "family",
    emojis: [
      ["👶", "bebe panales"],
      ["🧒", "ninos hijos"],
      ["👨‍👩‍👧", "familia"],
      ["👨‍👩‍👦", "familia padres"],
      ["👵", "abuelos"],
      ["💑", "pareja"],
      ["❤️", "pareja amor"],
      ["💘", "citas"],
      ["🎓", "estudios universidad matricula master"],
      ["🏫", "colegio guarderia"],
      ["✏️", "material escolar papeleria"],
      ["📝", "academia clases cursos"],
      ["🤝", "prestamo deuda amigos bizum"],
      ["🎂", "cumpleanos tarta"],
      ["💒", "boda bodas"],
      ["🎄", "navidad"],
    ],
  },
  {
    key: "pets",
    emojis: [
      ["🐶", "perro mascota mascotas"],
      ["🐱", "gato mascota"],
      ["🐾", "mascotas pienso"],
      ["🐠", "peces acuario"],
      ["🐦", "pajaro"],
      ["🐰", "conejo"],
      ["🦴", "veterinario"],
      ["🐴", "caballo hipica"],
    ],
  },
  {
    key: "work",
    emojis: [
      ["💼", "trabajo oficina"],
      ["🖥️", "ordenador oficina"],
      ["🖨️", "impresora"],
      ["☎️", "telefono fijo"],
      ["📧", "email correo"],
      ["📊", "negocio autonomo"],
      ["🏦", "banco comisiones"],
      ["💳", "tarjeta credito"],
      ["💶", "dinero euros efectivo"],
      ["💰", "ahorro dinero"],
      ["🐷", "hucha ahorro"],
      ["📈", "inversion bolsa fondos"],
      ["🪙", "cripto monedas bitcoin"],
      ["⚖️", "abogado gestoria"],
      ["📄", "tramites documentos"],
      ["📮", "correos envio"],
      ["🔁", "suscripciones suscripcion cuotas"],
      ["☁️", "nube icloud almacenamiento"],
    ],
  },
  {
    key: "travel",
    emojis: [
      ["✈️", "avion vuelo vuelos viaje viajes"],
      ["🏨", "hotel alojamiento airbnb"],
      ["🧳", "maleta viaje equipaje"],
      ["🗺️", "excursion turismo"],
      ["🏔️", "montana"],
      ["🌍", "viaje extranjero"],
      ["🛂", "pasaporte visado"],
      ["🚢", "barco ferry crucero"],
      ["⛵", "barco vela"],
      ["🏝️", "isla vacaciones"],
    ],
  },
  {
    key: "other",
    emojis: [
      ["⭐", "otros favoritos"],
      ["📌", "varios"],
      ["❓", "otros"],
      ["🎗️", "donaciones ong solidario"],
      ["⛪", "iglesia"],
      ["🚬", "tabaco"],
      ["🧿", "otros"],
      ["✨", "caprichos"],
      ["🔒", "seguridad"],
      ["⚠️", "imprevistos"],
      ["🆘", "urgencias imprevistos"],
    ],
  },
]

/** Minúsculas y sin tildes, para comparar "Súper" con "super". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
}

const ALL = EMOJI_CATALOG.flatMap((group) =>
  group.emojis.map(([emoji, keywords]) => ({ emoji, words: keywords.split(" ") })),
)

/** Emojis cuyas palabras clave empiezan por el texto buscado (o lo contienen). */
export function searchEmojis(query: string, limit = 40): string[] {
  const q = normalize(query)
  if (!q) return []
  const starts: string[] = []
  const contains: string[] = []
  for (const { emoji, words } of ALL) {
    if (words.some((word) => word.startsWith(q))) starts.push(emoji)
    else if (words.some((word) => word.includes(q))) contains.push(emoji)
  }
  return [...new Set([...starts, ...contains])].slice(0, limit)
}

/**
 * Emojis que encajan con el nombre de una categoría o cuenta ("Súper Mercadona" → 🛒).
 * Cada palabra de 3 o más letras se busca entre las palabras clave.
 */
export function suggestEmojis(name: string, limit = 8): string[] {
  const words = normalize(name)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3)
  const found: string[] = []
  for (const word of words) {
    for (const { emoji, words: keywords } of ALL) {
      if (keywords.some((keyword) => keyword === word || keyword.startsWith(word))) {
        found.push(emoji)
      }
    }
  }
  return [...new Set(found)].slice(0, limit)
}
