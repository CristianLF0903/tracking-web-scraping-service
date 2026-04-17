# 📦 Servientrega Track API

API REST construida con **Express.js** para consultar el estado de guías de envío en múltiples transportadoras colombianas. Soporta scraping y consultas a APIs externas de forma asíncrona y paralela.

---

## 🚀 Transportadoras soportadas

| Transportadora | Método | Identificador |
|---|---|---|
| Servientrega | API REST | `servientrega` |
| Aldía Logística | Web Scraping (axios + regex) | `aldia` |
| Solex App | Web Scraping (axios + regex) | `solexapp` |
| Coordinadora | Web Scraping (puppeteer) | `coordinadora` |

---

## 🛠️ Stack tecnológico

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **HTTP Client**: Axios
- **Scraping headless**: Puppeteer + @sparticuz/chromium
- **Middlewares**: CORS, Morgan, dotenv
- **Package manager**: pnpm

---

## 📁 Estructura del proyecto

```
servientrega-track/
├── src/
│   ├── index.js              # Punto de entrada — arranca el servidor
│   ├── app.js                # Configuración de Express y middlewares
│   ├── routes/
│   │   └── tracking.js       # Endpoints de rastreo
│   ├── services/
│   │   ├── servientrega.js   # Consulta API Servientrega
│   │   ├── aldia.js          # Scraping Aldía Logística
│   │   ├── solex.js          # Scraping Solex App
│   │   └── coordinadora.js   # Scraping Coordinadora (Puppeteer)
│   ├── utils/
│   │   └── fileUtils.js      # Lectura de JSON y exportación a CSV
│   └── config/
│       └── constants.js      # URLs base y constantes de configuración
├── assets/
│   ├── guias.json            # Input: lista de guías a consultar
│   └── resultados.txt        # Output: resultados en formato CSV
├── tests/
│   ├── run_tests.js
│   ├── test_aldia.js
│   ├── test_coordinadora.js
│   └── test_solex.js
├── .env
├── .env.example
└── package.json
```

---

## ⚙️ Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd servientrega-track

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
```

### Variables de entorno (`.env`)

```env
PORT=3000
```

---

## ▶️ Ejecución

```bash
# Desarrollo (recarga automática con --watch)
pnpm dev

# Producción
pnpm start

# Tests
pnpm test
```

El servidor arranca en `http://localhost:3000`.

---

## 📡 Endpoints

### Health Check

```
GET /health
```

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-07T21:31:32.438Z"
}
```

---

### Consultar una guía específica

Consulta el estado de una guía individual en tiempo real.

```
GET /api/tracking/:guia/:transportadora
```

**Parámetros de ruta:**

| Param | Tipo | Descripción |
|---|---|---|
| `guia` | string | Número de guía |
| `transportadora` | string | `servientrega` \| `aldia` \| `solexapp` \| `coordinadora` |

**Ejemplo:**
```bash
curl http://localhost:3000/api/tracking/9999999999/servientrega
```

**Respuesta exitosa (`200`):**
```json
{
  "success": true,
  "data": {
    "guia": "9999999999",
    "transportadora": "servientrega",
    "estadoActual": "ENTREGADO",
    "estadoOriginal": "ENTREGADO",
    "fechaActualizacion": "2026-04-03",
    "fechaEnvio": "2026-04-01",
    "fechaEntrega": "2026-04-03"
  }
}
```

**Transportadora inválida (`400`):**
```json
{
  "success": false,
  "message": "Transportadora inválida. Valores aceptados: servientrega, aldia, solexapp, coordinadora"
}
```

**Guía no encontrada (`404`):**
```json
{
  "success": false,
  "message": "No se encontró información para la guía 9999999999 en servientrega."
}
```

---

## 📋 Pruebas (guias.json)

El archivo `assets/guias.json` se utiliza únicamente para realizar pruebas locales y validaciones masivas en los scripts de test. No es requerido para el funcionamiento de la API REST de consulta individual.

---

## 🔧 Middlewares

| Middleware | Descripción |
|---|---|
| `cors()` | Habilita CORS para consumo desde clientes externos |
| `morgan('dev')` | Logging de peticiones HTTP en consola |
| `express.json()` | Parseo automático de body en formato JSON |
| `express.urlencoded()` | Parseo de body en formato form-data |
| `dotenv/config` | Carga variables de entorno desde `.env` |

---

## 🧪 Tests

```bash
pnpm test
```

Los tests están ubicados en `tests/` y pueden ejecutarse individualmente:

```bash
node tests/test_aldia.js
node tests/test_solex.js
node tests/test_coordinadora.js
```

---

## 📝 Notas técnicas

- El proyecto usa **ES Modules** (`"type": "module"` en `package.json`). Todos los imports deben incluir la extensión `.js`.
- El scraping de **Coordinadora** usa **Puppeteer** en modo headless ya que la página requiere JavaScript para renderizar el estado.
- Los servicios de **Aldía** y **Solex** usan **axios + regex** directamente sobre el HTML, siendo más livianos.
- Guías con error o no encontradas devuelven `null` en los servicios internos o un error `404` controlado en la API.
