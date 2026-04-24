# Lead Scraper

Serverless Lead-Scraper auf Basis der **Google Maps Places API (New)**. Liefert strukturierte B2B-Leads (Name, Adresse, Telefon, Website, Rating) für einen Suchbegriff in einer Stadt. Lokal als CLI nutzbar, deploybar als AWS Lambda hinter einem HTTP-API-Gateway.

## Features

- Reiner Node.js-Code (ES Modules), keine Frameworks, keine Build-Tools
- **Weltweit nutzbar**: für hinterlegte Städte Grid-Suche (3x3 Rasterzellen) für höhere Abdeckung, für alle anderen Städte automatischer Fallback auf eine einzelne Text-Search
- Dedupliziert über Place-IDs
- Rate-Limiting zwischen API-Calls (200 ms)
- Ein Codepfad — lokal (CLI) und Lambda (Handler) nutzen dieselbe `runScrape()`-Logik
- CORS-fähiges HTTP-API-Gateway-Frontend

## Projektstruktur

```
lead-scraper/
├── index.mjs          # Lokaler CLI-Einstiegspunkt
├── handler.mjs        # Lambda-Handler (API Gateway v2)
├── scrape.mjs         # Hauptlogik: runScrape(searchTerm, city, maxLeads)
├── grid.mjs           # Rasterzellen über eine Stadt
├── places-api.mjs     # Google Places API (New) Wrapper
├── test-handler.mjs   # Lokaler Smoke-Test für den Handler
├── build.sh           # Erzeugt deployment.zip für Lambda
├── package.json
├── .env.example
├── DEPLOY.md          # Schritt-für-Schritt AWS-Deployment
└── README.md
```

## Voraussetzungen

- Node.js ≥ 22.x
- Google Cloud Projekt mit aktivierter **Places API (New)**
- Für Deployment: AWS-Account, AWS CLI v2, `zip`

## Setup

```bash
git clone <repo-url>
cd lead-scraper
npm install
cp .env.example .env
# GOOGLE_MAPS_API_KEY in .env eintragen
```

## Lokale Nutzung (CLI)

```bash
node index.mjs "<Suchbegriff>" "<Stadt>" <MaxLeads>
```

Beispiel:

```bash
node index.mjs "Zahnarzt" "München" 10
```

Ausgabe: JSON-Array auf stdout.

```json
[
  {
    "name": "dent + face Zahnzentrum München",
    "address": "Hansastraße 27e, 81373 München, Germany",
    "phone": "+49 89 55292030",
    "website": "https://www.dent-und-face.de/",
    "rating": 4.9
  }
]
```

## Städte-Support

Der Scraper funktioniert **weltweit mit jeder Stadt**. Es gibt zwei Modi:

| Modus | Wann | Verhalten | Max. Leads pro Call |
|-------|------|-----------|---------------------|
| **Grid-Suche** | Stadt ist in `CITY_COORDS` (`grid.mjs`) hinterlegt | 9 Text-Searches über ein 3x3-Raster rund um das Stadtzentrum — höhere Trefferzahl, bessere geografische Abdeckung | bis ~180 |
| **Fallback-Suche** | Stadt unbekannt | Text-Search ohne Location-Bias mit Pagination (bis zu 3 Seiten à 20 Places) — funktioniert für jede beliebige Stadt weltweit | bis 60 |

Der Stadt-Lookup ist **case-insensitive** — `"Berlin"`, `"berlin"` und `"BERLIN"` lösen alle den Grid-Modus aus.

Fest hinterlegte Städte (Grid-Suche): **München, Berlin, Hamburg, Köln, Frankfurt**.

Zusätzliche Städte können in `grid.mjs` in der `CITY_COORDS`-Map mit Lat/Lng ergänzt werden, um sie vom Fallback in den Grid-Modus zu heben.

### Beispiele weltweit

```bash
# Grid-Modus (Deutschland)
node index.mjs "Zahnarzt" "München" 10

# Fallback-Modus (Schweiz)
node index.mjs "Fitnessstudio" "Zürich" 10

# Fallback-Modus (Japan)
node index.mjs "Cafe" "Tokyo" 5

# Fallback-Modus (USA)
node index.mjs "Coffee Shop" "New York" 10
```

## Handler lokal testen

```bash
node test-handler.mjs
```

Simuliert ein API-Gateway-Event und ruft den Handler direkt auf — nützlich vor jedem Deploy.

## Deployment auf AWS Lambda

Komplette Schritt-für-Schritt-Anleitung in [DEPLOY.md](./DEPLOY.md).

Kurzfassung:

```bash
./build.sh                                                   # deployment.zip bauen
aws lambda update-function-code \                            # Code aktualisieren
  --function-name lead-scraper \
  --zip-file fileb://deployment.zip
```

## API-Nutzung

`POST /scrape`

Request-Body:

```json
{
  "searchTerm": "Zahnarzt",
  "city": "München",
  "maxLeads": 10
}
```

Response (`200 OK`):

```json
{
  "count": 10,
  "leads": [
    { "name": "...", "address": "...", "phone": "...", "website": "...", "rating": 4.9 }
  ]
}
```

Fehler:

| Status | Bedeutung |
|--------|-----------|
| 400    | Fehlende/ungültige Felder im Body |
| 500    | API-Key fehlt oder unerwarteter Fehler |

Beispiel-curl:

```bash
curl -X POST https://<API_ID>.execute-api.<REGION>.amazonaws.com/scrape \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"Zahnarzt","city":"München","maxLeads":5}'
```

## Environment Variables

| Name                   | Erforderlich | Beschreibung                  |
|------------------------|--------------|-------------------------------|
| `GOOGLE_MAPS_API_KEY`  | ja           | API-Key für Places API (New) |

Lokal über `.env`, in Lambda über Function Configuration → Environment Variables.

## Logs (Lambda)

```bash
aws logs tail /aws/lambda/lead-scraper --follow
```

## Architektur

```
  Client ──POST /scrape──▶ API Gateway (HTTP API, CORS *)
                                │
                                ▼
                         Lambda: lead-scraper
                        (nodejs22.x, 512MB, 300s)
                                │
                                ▼
                    Google Places API (New)
                    ├─ places:searchText  (Grid 3x3 oder Fallback)
                    └─ places/{id}        (Details pro Lead)
```

## Kostenhinweis

Jeder Scrape-Call verursacht Google-Places-API-Kosten. Text Search und Place Details werden separat abgerechnet. Siehe [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing).

AWS-Kosten sind bei typischer Nutzung vernachlässigbar (Lambda Free Tier, HTTP API ~1 $/Mio Requests).

## Lizenz

Privat / intern.
