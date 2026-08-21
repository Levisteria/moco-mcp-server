# GitHub Actions Workflows

Da GitHub aus Sicherheitsgründen verhindert, dass externe Apps direkt Workflow-Dateien pushen, müssen Sie diese beiden Dateien bitte einmalig manuell in Ihrem Repository anlegen.

Gehen Sie dazu in Ihrem GitHub Repository auf **Add file -> Create new file**.

---

## 1. Security & Linting Pipeline (PRs & Commits)

Diese Pipeline führt bei jedem Push und Pull Request automatisch einen Security Audit und den Biome Linter aus.

**Dateiname:** `.github/workflows/ci.yml`

**Inhalt:**
```yaml
name: CI (Security & Linting)

on:
  push:
    branches: [ "main", "develop" ]
  pull_request:
    branches: [ "main", "develop" ]

jobs:
  security-and-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Security Audit
        run: npm run security-check
        
      - name: Lint & Format Check (Biome)
        run: npm run lint
        
      - name: Build Check
        run: npm run build
```

---

## 2. Release & Publish Pipeline (Nur bei Releases)

Diese Pipeline baut das Paket und lädt es automatisch bei npmjs und in die GitHub Container Registry (Docker) hoch, **aber nur**, wenn Sie einen neuen Release erstellen.

**Dateiname:** `.github/workflows/publish.yml`

**Inhalt:**
```yaml
name: Publish (NPM)

on:
  release:
    types: [created]

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}


```
