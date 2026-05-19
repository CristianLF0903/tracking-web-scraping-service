# 📦 Servientrega Track API

API REST construida con **Express.js** para consultar el estado de guías de envío en múltiples transportadoras colombianas. Soporta scraping y consultas a APIs externas de forma asíncrona y paralela.

---

## 🚀 Transportadoras soportadas

| Transportadora | Método | Identificador |
|---|---|---|
| Servientrega | API REST | `servientrega` |
| Aldía Logística | Web Scraping (axios) | `aldia` |
| Solex App | Web Scraping (axios) | `solexapp` |
| Coordinadora | Web Scraping (puppeteer) | `coordinadora` |
| Envia.co | Web Scraping (puppeteer) | `envia` |
| Rápido Ochoa | Web Scraping (puppeteer) | `rapidoochoa` |
| TCC | Web Scraping (puppeteer) | `tcc` |
| Veloenvios | Web Scraping (puppeteer) | `veloenvios` |
| Transprensa | Web Scraping (camoufox) | `transprensa` |
| Haceb | Web Scraping (puppeteer) | `haceb` |

---

## 🛠️ Stack tecnológico

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **HTTP Client**: Axios
- **Scraping Headless**: Puppeteer (Stealth) / Playwright
- **Ultra-Stealth Engine**: Camoufox (para sitios con alta restricción)
- **Middlewares**: CORS, Morgan, dotenv
- **Package manager**: pnpm

---

## 📁 Estructura del proyecto

```
tracking-web-scraping-service/
├── src/
│   ├── index.js              # Punto de entrada
│   ├── app.js                # Configuración de Express
│   ├── routes/
│   │   └── tracking.js       # Endpoints de rastreo
│   ├── services/
│   │   ├── servientrega.js   # API Servientrega
│   │   ├── aldia.js          # Scraping Aldía
│   │   ├── solex.js          # Scraping Solex
│   │   ├── coordinadora.js   # Scraping Coordinadora
│   │   ├── envia.js          # Scraping Envía
│   │   ├── rapidoochoa.js    # Scraping Rápido Ochoa
│   │   ├── tcc.js            # Scraping TCC
│   │   ├── veloenvios.js     # Scraping Veloenvios
│   │   ├── transprensa.js    # Scraping Transprensa (Camoufox)
│   │   └── haceb.js          # Scraping Haceb
│   ├── utils/
│   │   ├── browser.js        # Gestión de navegadores (Stealth, Camoufox)
│   │   ├── fileUtils.js      # Utilidades de archivos
│   │   └── htmlParser.js     # Parseo de HTML con Cheerio
│   └── config/
│       └── constants.js      # URLs y constantes
├── assets/                   # Recursos y resultados
├── tests/                    # Suites de pruebas por servicio
├── .env                      # Variables de entorno
└── package.json
```

---

## ⚙️ Instalación

```bash
# Instalar dependencias
pnpm install

# Instalar navegadores necesarios
npx playwright install firefox
```

---

## 📡 Endpoints

### Consultar una guía específica

```
GET /api/tracking/:guia/:transportadora
```

**Transportadoras aceptadas:**
`servientrega`, `aldia`, `solexapp`, `coordinadora`, `envia`, `rapidoochoa`, `tcc`, `veloenvios`, `transprensa`, `haceb`.

---

## 🧪 Tests

```bash
# Ejecutar todos los tests
pnpm test

# O ejecutar uno específico
node tests/test_veloenvios.js
```

---

## 📝 Notas técnicas

- **Stealth Mode**: Se utiliza `puppeteer-extra-plugin-stealth` para evadir detecciones de bots básicas.
- **Camoufox**: Implementado específicamente para **Transprensa** debido a sus estrictas políticas de seguridad.
- **Arquitectura**: Cada servicio es independiente y devuelve un formato estandarizado para facilitar la integración.
