

# Snail-url

**Async open-redirect hunter** for red teams and appsec engineers.
Crawls, harvests redirect-prone URLs, injects payloads, and confirms real open redirects via HTTP 30x, HTML meta refresh, and common JS redirects.

> ⚠️ **Legal/Ethical**: Use only on assets you own or are authorized to test. You are responsible for complying with all laws and terms of service.

---

## Highlights

* ⚡ **Fast & async** (aiohttp) with **per-host rate limiting**
* 🧭 **Crawler fallback** (scope-aware) to discover targets when you don’t have a URL list
* 🧪 **Payload strategy sets**: `basic`, `aggressive`, `stealth` (and custom test domain)
* 🔐 **SAML / OIDC** focus: `RelayState`, `redirect_uri`, `returnTo`, `continue`, etc.
* 📤 **Outputs**: JSON, NDJSON, CSV + optional dump of unverified candidates
* 🖥️ **Pretty CLI**: compact, padded tables that don’t overflow your terminal

---

## Install

### Local

```bash
git clone https://github.com/<you>/snail-url.git
cd snail-url
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -e .
```

### Docker

```bash
docker build -t snail-url:latest .
# mount current folder for saving results
docker run --rm -v "$(pwd)":/scan snail-url:latest \
  snail-url -d example.com --crawl --max-pages 2000 --json-out /scan/results.json
```

---

## Quick start

Basic run (no crawl):

```bash
snail-url -d example.com --json-out results.json
```

Crawler fallback + aggressive payloads:

```bash
snail-url -d example.com \
  --crawl --max-pages 2000 \
  --payload-set aggressive \
  --include-subdomains \
  --samloidc \
  --pretty --max-col 100 \
  --json-out results.json --csv-out results.csv
```

Use a custom callback/test domain:

```bash
snail-url -d example.com --test-domain https://red.example/cb --json-out results.json
```

Scan a pre-collected list instead of crawling:

```bash
snail-url --in urls.txt --json-out results.json --pretty
```

Dump the **unverified** candidate list for manual review:

```bash
snail-url -d example.com --crawl --candidates-out candidates.txt
```

---

## CLI

```
snail-url [-d DOMAIN] [--seed URL ...] [--in FILE] [--crawl]
          [--include-subdomains] [--respect-robots]
          [--max-pages N] [-c N] [--per-host N]
          [--payload-set {basic,aggressive,stealth}]
          [--test-domain URL]
          [--json-out FILE] [--ndjson-out FILE] [--csv-out FILE]
          [--candidates-out FILE] [--user-agent UA] [--samloidc]
          [--pretty] [--no-banner] [--max-col N]
```

**Most useful flags**

* `-d, --domain` — target registrable domain (sets default scope/seed)
* `--seed` — one or more starting URLs (repeatable)
* `--in` — file with URLs to check (one per line)
* `--crawl` — enable crawler fallback (async, scope-aware)
* `--include-subdomains` — widen scope to subdomains
* `--max-pages` — crawl budget (default: 2000)
* `-c, --concurrency` — global concurrency (default: 40)
* `--per-host` — per-host concurrency limit (default: 10)
* `--payload-set` — `basic` | `aggressive` | `stealth`
* `--test-domain` — destination injected into redirect params
* `--samloidc` — prioritize SAML/OIDC keys (`RelayState`, `redirect_uri`, etc.)
* `--pretty`, `--max-col` — tidy, padded table output
* `--json-out`, `--ndjson-out`, `--csv-out` — choose one or many

---

## What gets detected

* **HTTP redirects**: 30x with `Location` pointing to your **test domain**
* **HTML Meta Refresh**: e.g., `<meta http-equiv="refresh" content="0;url=...">`
* **JS redirects**: `location =`, `location.replace()`, `location.assign()`

**Redirect-ish parameters** (partial list):
`redirect`, `redirect_uri`, `url`, `next`, `dest`, `destination`, `return`, `returnTo`, `continue`, `cb`, `RelayState`, etc.

**SAML/OIDC** heuristics (when `--samloidc`):

* Detects SAML-ish or OIDC-ish endpoints (`/saml/...`, `/oauth*/authorize`, `/callback`).
* Elevates `RelayState` and `redirect_uri` for injection.

---

## Output examples

### JSON

```json
[
  {
    "original": "https://app.example.com/redirect?redirect_uri=/dashboard",
    "confirmed": true,
    "param": "redirect_uri",
    "payload": "https://red.example/cb",
    "mutated": "https://app.example.com/redirect?redirect_uri=https%3A%2F%2Fred.example%2Fcb",
    "via": "http_redirect",
    "status": 302,
    "location": "https://red.example/cb"
  }
]
```

### NDJSON

```
{"original":"https://...","confirmed":true,"param":"redirect","via":"html/js_redirect","status":200,...}
```

### CSV (columns vary with data)

```
confirmed,param,original,mutated,via,status,location,payload
true,redirect_uri,https://...,https://...,http_redirect,302,https://red.example/cb,https://red.example/cb
```

---

## How it works (high-level)

```
Seeds/URLs
   └─► Crawler (optional) ─► Harvester (redirect-ish params)
                              └─► Verifier (payload sets, no-follow)
                                   └─► Findings (JSON/NDJSON/CSV)
```

* **Crawler**: async fetch, extracts links, respects scope, per-host RL.
* **Harvester**: filters URLs with redirect-ish parameters.
* **Verifier**: injects payloads → checks 30x `Location`, meta refresh, JS redirect.

---

## Tuning & tips

* **Throughput**: Bump `-c` but keep `--per-host` reasonable (8–12) to reduce server strain.
* **Noise**: Use `--payload-set stealth` for low-touch passes; `aggressive` when you need depth.
* **Scope**: Start narrow (`-d`) and add `--include-subdomains` if needed.
* **Crawler budget**: Increase `--max-pages` for large estates; capture candidates via `--candidates-out`.
* **User-Agent**: Customize with `--user-agent` for logs/attribution.

---

## Troubleshooting

* **No findings but many candidates**
  Targets might block external destinations; try different `--payload-set` or `--test-domain`.
* **Timeouts**
  Reduce `-c` and `--per-host`; some WAFs throttle concurrency.
* **Messy terminal output**
  Use `--pretty --max-col 100` (table is padded & ellipsized). Use `--no-banner` to minimize whitespace.

---

## Development

```bash
# lint/format as you like; basic tests included
pytest -q
```

Project layout:

```
snail_url/
  cli.py          # CLI entry
  crawler.py      # async crawler (scope-aware)
  harvester.py    # picks redirect-like URLs
  verifier.py     # injects payloads, confirms redirects
  payloads.py     # basic/aggressive/stealth generators
  saml_oidc.py    # SAML/OIDC heuristics
  ui.py           # pretty table output
  utils.py, constants.py, output.py
```

---

## Roadmap

* Optional archive sources (Wayback, GAU) as inputs
* SARIF exporter for CI
* Parameter mutation strategies by framework (Next.js, Spring, ASP.NET)
* Allow/deny-lists per path/param

---

## Contributing

PRs and issues welcome. Please include:

* Clear repro steps (target pattern anonymized)
* Before/after output snippets
* Any performance/safety considerations

---

## License

MIT © SnailSploit

---

Want me to drop this straight into your repo as `README.md` (and add status badges)? Say the word and I’ll prep a PR description and push-ready commit message.
