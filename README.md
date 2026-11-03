# Weather API Proxy

API REST que actúa de intermediario con [OpenWeatherMap](https://openweathermap.org/api): busca ubicaciones por nombre y devuelve el clima actual de una ciudad o de unas coordenadas, con los datos ya procesados y los errores del proveedor normalizados. Construida con Node.js, Express 5, TypeScript y Axios, siguiendo una arquitectura hexagonal. No usa base de datos.

## Tabla de contenido

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Cómo funciona](#cómo-funciona)
- [Endpoints](#endpoints)
- [Procesamiento de datos](#procesamiento-de-datos)
- [Manejo de errores](#manejo-de-errores)
- [Arquitectura](#arquitectura)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Pruebas](#pruebas)
- [Docker](#docker)

## Stack

| Área | Tecnología |
|---|---|
| Runtime / lenguaje | Node.js 22, TypeScript 5 |
| HTTP | Express 5, Helmet, CORS, Morgan |
| Cliente HTTP | [Axios](https://axios-http.com/docs/intro) |
| Validación | class-validator, class-transformer |
| Documentación | swagger-jsdoc, swagger-ui-express |
| Pruebas | Jest, ts-jest, Supertest |
| Gestor de paquetes | pnpm |

## Requisitos

- Node.js 20.19 o superior (la imagen Docker usa Node 22)
- pnpm
- Una API key de OpenWeatherMap (cuenta gratuita en [openweathermap.org](https://openweathermap.org/api)). Una key recién creada puede tardar un tiempo en activarse; mientras tanto el proveedor la rechaza y esta API responde `502`.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env
```

Coloca tu key en `OPENWEATHER_API_KEY` dentro de `.env` y arranca:

```bash
pnpm dev
```

- API: `http://localhost:4400/api`
- Documentación Swagger: `http://localhost:4400/api-docs`
- Especificación OpenAPI en JSON: `http://localhost:4400/api-docs.json`

```bash
curl "http://localhost:4400/api/weather/current?city=San%20Salvador&country=SV&lang=es"
```

Para producción:

```bash
pnpm build
pnpm start
```

La API no arranca si `OPENWEATHER_API_KEY` está vacío o `OPENWEATHER_BASE_URL` no es una URL válida.

## Variables de entorno

Se leen desde `.env` (ver `.env.example`).

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `4400` | Puerto HTTP |
| `NODE_ENV` | `development` | En `development` los errores 500 incluyen el mensaje real; en otros valores devuelven un mensaje genérico |
| `ORIGIN` | vacío | Orígenes permitidos por CORS, separados por coma. Vacío permite cualquier origen (`*`) |
| `OPENWEATHER_API_KEY` | sin valor | **Obligatoria.** Tu key de OpenWeatherMap. Solo se usa en las llamadas al proveedor: nunca se devuelve en respuestas ni se escribe en logs |
| `OPENWEATHER_BASE_URL` | `https://api.openweathermap.org` | URL base del proveedor |
| `OPENWEATHER_TIMEOUT_MS` | `5000` | Tiempo máximo de espera por cada llamada al proveedor |

## Scripts

| Script | Descripción |
|---|---|
| `pnpm dev` | Servidor en modo desarrollo con recarga (`ts-node-dev`) y logs `DEBUG=nodets:*` |
| `pnpm build` | Compila con `tsc` y resuelve los alias con `tsc-alias` |
| `pnpm start` | Ejecuta `build/index.js` |
| `pnpm test` | Ejecuta las pruebas |
| `pnpm test:watch` | Pruebas en modo observación |
| `pnpm lint` | ESLint sobre `src/**/*.ts` |

## Cómo funciona

OpenWeatherMap recomienda consultar el clima por coordenadas: la búsqueda por nombre de ciudad en la API de clima está marcada como obsoleta. Por eso esta API usa dos de sus servicios:

1. **Geocoding** (`/geo/1.0/direct`): convierte un nombre en coordenadas.
2. **Clima actual** (`/data/2.5/weather`): devuelve el clima de esas coordenadas.

- Con `city`, la API hace las dos llamadas y usa la primera coincidencia del Geocoding.
- Con `lat` y `lon`, hace solo la segunda.
- Para nombres ambiguos (hay varias "Santa Ana"), primero se consulta `/api/locations/search`, se elige una coincidencia y luego se pide el clima con sus coordenadas.

## Endpoints

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| GET | `/api/weather/current` | Clima actual de una ciudad o de unas coordenadas | 200 | 400, 404, 429, 502, 504 |
| GET | `/api/locations/search` | Busca ubicaciones por nombre | 200 | 400, 429, 502, 504 |

### `GET /api/weather/current`

Debe enviarse **`city`** (con `country` opcional) **o** **`lat` y `lon`**, no ambos.

| Parámetro | Por defecto | Reglas |
|---|---|---|
| `city` | | 2 a 100 caracteres |
| `country` | | Código ISO 3166 de 2 letras (`SV`, `US`...); solo junto con `city`. Se acepta en minúsculas |
| `lat` | | Número entre -90 y 90; siempre junto con `lon` |
| `lon` | | Número entre -180 y 180; siempre junto con `lat` |
| `units` | `metric` | `metric` (°C, m/s), `imperial` (°F, mph) o `standard` (K, m/s) |
| `lang` | `en` | Idioma de las descripciones y nombres, con los códigos del proveedor (`es`, `en`, `fr`, `pt_br`, `zh_cn`...) |

Parámetros desconocidos se rechazan con `400`. `lat=0` y `lon=0` son valores válidos.

```bash
curl "http://localhost:4400/api/weather/current?lat=13.6989&lon=-89.1914&units=metric&lang=es"
```

```json
{
  "data": {
    "location": {
      "name": "San Salvador",
      "state": null,
      "country": "SV",
      "latitude": 13.6989,
      "longitude": -89.1914
    },
    "observedAt": "2026-11-01T18:00:00.000Z",
    "localTime": "2026-11-01T12:00:00-06:00",
    "isDaytime": true,
    "condition": {
      "id": 801,
      "group": "Clouds",
      "description": "pocas nubes",
      "icon": "02d",
      "iconUrl": "https://openweathermap.org/img/wn/02d@2x.png"
    },
    "temperature": { "current": 28.4, "feelsLike": 31, "min": 26.9, "max": 29.8 },
    "humidity": 62,
    "pressure": 1012,
    "visibility": 10000,
    "cloudiness": 20,
    "wind": { "speed": 3.6, "direction": 95, "directionLabel": "E", "gust": 5.1 },
    "precipitation": { "rainLastHour": null, "snowLastHour": null },
    "sun": { "sunrise": "2026-11-01T11:40:00.000Z", "sunset": "2026-11-01T23:30:00.000Z" },
    "timezoneOffsetSeconds": -21600,
    "units": {
      "system": "metric",
      "temperature": "celsius",
      "windSpeed": "m/s",
      "pressure": "hPa",
      "visibility": "m",
      "precipitation": "mm/h"
    }
  }
}
```

Con `city`, `location` trae lo que devolvió el Geocoding (incluido `state` cuando existe). Con `lat`/`lon`, trae el nombre de la estación o zona más cercana que informa el proveedor, y puede ser `null` en lugares sin nombre (por ejemplo, mar abierto).

### `GET /api/locations/search`

| Parámetro | Por defecto | Reglas |
|---|---|---|
| `q` | obligatorio | 2 a 100 caracteres. Puede llevar país (`Santa Ana,SV`) y, solo en EE. UU., estado (`Springfield,IL,US`) |
| `limit` | `5` | Entero de 1 a 5 |

```bash
curl "http://localhost:4400/api/locations/search?q=Santa%20Ana&limit=2"
```

```json
{
  "data": [
    { "name": "Santa Ana", "state": "Santa Ana Department", "country": "SV", "latitude": 13.9942, "longitude": -89.5597 },
    { "name": "Santa Ana", "state": "California", "country": "US", "latitude": 33.7456, "longitude": -117.8678 }
  ]
}
```

Sin coincidencias devuelve `{ "data": [] }` con `200`: buscar algo que no existe no es un error.

## Procesamiento de datos

La respuesta del proveedor no se reenvía tal cual; se transforma a un formato estable y más cómodo:

- **Nombres claros y agrupados:** `temp` pasa a `temperature.current`, `wind.deg` a `wind.direction`, `clouds.all` a `cloudiness`, etc.
- **Fechas legibles:** los instantes en segundos Unix (`dt`, `sunrise`, `sunset`) se convierten a ISO 8601 en UTC.
- **Hora local:** `localTime` aplica el desfase de la zona (`timezone`) a la hora de la observación, con su offset (`-06:00`).
- **Dirección del viento:** `directionLabel` convierte los grados a un punto cardinal de 16 direcciones (`N`, `NNE`, `NE`...).
- **Día o noche:** `isDaytime` se deduce del ícono que informa el proveedor.
- **Ícono:** `iconUrl` apunta a la imagen del ícono.
- **Unidades explícitas:** `units` indica en qué unidad viene cada medida, según el `units` pedido.
- **Redondeo:** temperaturas y velocidades del viento se redondean a un decimal.
- **Campos opcionales:** el proveedor omite lo que no se midió (por ejemplo `gust`, `rain`, `feels_like`). Esos valores salen como `null` en lugar de desaparecer.

## Manejo de errores

Formato: `{ "status": <código>, "message": "<detalle>" }`.

| Código | Cuándo |
|---|---|
| 400 | Parámetros inválidos o combinación incorrecta (`city` junto con `lat`/`lon`, `lat` sin `lon`, `country` sin `city`, nada que consultar) |
| 404 | El nombre no corresponde a ninguna ubicación, o el proveedor no tiene datos para ella |
| 429 | El proveedor reportó que se superó el límite de consultas de tu plan |
| 502 | El proveedor no está disponible, falló (5xx), rechazó la key, no se pudo contactar o devolvió una respuesta inválida |
| 504 | El proveedor tardó más que `OPENWEATHER_TIMEOUT_MS` |

- **Credenciales rechazadas:** un `401` del proveedor se informa al cliente como un `502` genérico ("no está disponible en este momento"), sin detalles. El motivo real queda en el log del servidor (con `DEBUG=nodets:*`).
- **La key nunca se expone:** el proveedor exige enviarla como parámetro de consulta, por lo que los errores se traducen a mensajes propios y no se reenvían ni se registran las URLs ni el objeto de error de Axios.
- **Sin redirecciones:** las llamadas al proveedor no siguen redirecciones.
- **Respuestas inesperadas:** cada respuesta se valida antes de usarse; si faltan campos obligatorios o no es JSON, se responde `502` en lugar de propagar datos corruptos.

## Arquitectura

Arquitectura hexagonal: el dominio y los casos de uso no dependen de Express ni de Axios. El puerto `WeatherProvider` se implementa en `infrastructure/openweather`, por lo que cambiar de proveedor solo afecta a esa carpeta.

```
src/
├── index.ts                    Arranque: valida el entorno y levanta Express
├── app.ts                      Configuración de Express, rutas y Swagger
├── composition-root.ts         Inyección de dependencias manual
├── swagger.ts                  Definición OpenAPI
├── interfaces/http/routes.ts   Router raíz (/api)
├── modules/weather/
│   ├── domain/                 CurrentWeather (datos derivados), Location, unidades y puerto WeatherProvider
│   ├── application/            Casos de uso (clima actual, búsqueda) y DTOs de consulta
│   └── infrastructure/
│       ├── http/               Controller y rutas
│       └── openweather/        Cliente Axios, mapeo de respuestas, traducción de errores y proveedor
├── shared/
│   ├── config/                 Variables de entorno y configuración de Express
│   ├── errors/AppError.ts      Error operacional con código HTTP
│   ├── middlewares/            Validación de query y manejador de errores
│   └── logger/                 Loggers con `debug`
└── testing/                    Servidor que imita al proveedor (solo lo usan las pruebas)
```

Flujo con `city`: ruta → validación de query → controller → caso de uso → `WeatherProvider.searchLocations` → `WeatherProvider.getCurrentWeather` → mapeo a `CurrentWeather` → respuesta. Cualquier error pasa por `errorHandler`.

## Decisiones de diseño

- **Geocoding + coordenadas** en lugar de la búsqueda por nombre de la API de clima, que el proveedor marca como obsoleta y sin mantenimiento.
- **Una consulta por ciudad cuesta dos llamadas al proveedor** (Geocoding y clima), con la latencia y el consumo de cuota que eso implica. Consultar por `lat`/`lon` cuesta una.
- **Se usa la primera coincidencia** del Geocoding. Para evitar ambigüedades, usa `/api/locations/search` y consulta por coordenadas.
- **Sin caché ni límite de peticiones.** Cada petición a esta API consume una del proveedor, y cualquiera que alcance el servidor puede gastar tu cuota. Para producción conviene añadir caché de corta duración y limitar peticiones por cliente.
- **Sin reintentos.** Un fallo del proveedor se informa de inmediato; reintentar queda del lado del cliente.
- **`lang` por defecto `en`.** Envía `lang=es` para descripciones en español.
- **Tiempo de espera acotado** (5 s por defecto) para que un proveedor lento no deje colgadas las peticiones.

## Pruebas

```bash
pnpm test
```

No necesitan red ni una API key. En lugar de llamar al proveedor real, usan un servidor HTTP local (`src/testing/mock-openweather.ts`) que imita sus respuestas según su documentación, de modo que Axios se ejercita de verdad:

- Dominio: derivados (punto cardinal, hora local, día o noche, valores nulos).
- Mapeo: respuesta completa, campos opcionales ausentes, tipos incorrectos y respuestas inválidas.
- Proveedor: parámetros enviados (`appid`, `lat`, `lon`, `units`, `lang`, `q`, `limit`), y traducción de 401, 404, 429, 5xx, redirecciones, respuestas no JSON, timeouts y conexión rechazada, comprobando que la key no aparece en ningún error.
- Casos de uso: resolución de ciudad a coordenadas y combinaciones inválidas de parámetros.
- DTOs y rutas HTTP de punta a punta (Supertest → API → Axios → servidor simulado).

Las pruebas no consultan el servicio real de OpenWeatherMap. Conviene probar una vez con tu key desde `/api-docs`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

- `docker-compose.yaml` define solo el servicio `api`; no necesita base de datos ni redes externas. La configuración sale del `.env`.
- El `Dockerfile` es multi-etapa: instala con `--frozen-lockfile`, ejecuta `pnpm test` y `pnpm build`, y la imagen final corre como usuario sin privilegios.
- El puerto publicado es el definido en `PORT` (4400 si no se define).
