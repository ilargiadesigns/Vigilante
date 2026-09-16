bash

cat /home/claude/vigilante-repo/backend/README.md
Salida

# Vigilante — backend

## Arrancar en local

```
cd backend
npm install
npm run dev
```

Escucha en `http://localhost:3001`. A los 5s de arrancar corre el pipeline de
sucesos por primera vez, y luego cada 10 minutos mientras el proceso siga
vivo. También puedes forzarlo: `POST /api/events/refresh`.

## Endpoints

- `GET /api/health`
- `GET /api/cameras` — cámaras de tráfico reales con imagen, del
  [Servei Català de Trànsit](http://www.gencat.cat/transit/opendata/cameres.xml),
  filtradas a Barcelona + área metropolitana. Cachea 10 min.
- `GET /api/events` — sucesos geolocalizados (ver pipeline abajo). Devuelve
  `{ lastRun, lastError, count, events: [...] }`.
- `POST /api/events/refresh` — dispara el pipeline a mano.

## El pipeline de sucesos (`src/services/events-service.js`)

RSS de Google News (varias consultas, una por grupo de tipos) → clasificar
por palabras clave (`src/lib/classify.js`) → si es ACCIDENT/TRAFFIC, intentar
casar el nombre de la vía contra las carreteras conocidas por el feed de
cámaras → geocodificar (`src/lib/geocode.js`: diccionario de barrios,
Nominatim como respaldo) → si no hay ubicación reconocible, se descarta →
deduplicar contra lo ya guardado (`src/lib/dedup.js`: mismo tipo + cerca en
el espacio/tiempo + titular parecido) → si es ACCIDENT/TRAFFIC, calcular las
3 cámaras más cercanas dentro de 1.5 km → guardar en `data/events.json`.

**Importante — qué es real y qué es heurística:**
- No existe ningún feed público en tiempo real de Mossos d'Esquadra, Bombers,
  Guàrdia Urbana o Protecció Civil para sucesos individuales — lo comprobé
  antes de escribir esto. Solo hay notas de premsa ocasionales en PDF, no
  aptas para un pipeline automático. Por eso la única fuente aquí es prensa.
- `occurred_at` es en realidad la fecha de publicación de la noticia — no
  hay forma fiable de extraer "cuándo pasó de verdad" de un titular sin un
  extractor de fechas mucho más sofisticado.
- Una cámara "cercana" a un accidente NO significa que lo esté enseñando.
  El frontend lo deja explícito ("cámara cercana — X m").
- `status: CLEARED` es una heurística (3h sin nueva mención), no una
  confirmación real de que el suceso haya terminado.
- La deduplicación es por reglas simples (distancia + tiempo + solape de
  palabras del titular), no por comprensión real del texto — puede fallar
  en casos ambiguos.

## Desplegarlo (sin terminal, con Render)

1. En render.com, "New" → "Web Service" → conecta tu repo de GitHub.
2. Root directory: `backend`. Build command: `npm install`. Start command: `npm start`.
3. Pega la URL que te dé como `API_BASE` en el `index.html` de la raíz y vuelve a subirlo.

Nota: en el plan gratis, Render duerme el servicio sin tráfico, lo que corta
el `setInterval` del pipeline. Para sucesos realmente cada 10 min sin huecos
haría falta un plan de pago o un disparador externo (p. ej. un cron externo
que llame a `POST /api/events/refresh` cada 10 min).
