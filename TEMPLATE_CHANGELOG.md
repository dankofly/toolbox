# Template Changelog

> **Note:** This file tracks changes to the **AI Coding Starter Kit Template** itself (not your project features).
>
> For tracking features you build in your project, use `FEATURE_CHANGELOG.md` instead.

---

## v1.3.0 - Production-Ready Essentials (2026-01-12)

### ✅ Changes

#### 1. Production Guides Added to DevOps Agent

**New Sections in `.claude/agents/devops.md`:**

1. **Error Tracking Setup (Sentry)**
   - 5-minute setup guide with code examples
   - Environment variables configuration
   - Alternative: Vercel Error Tracking

2. **Security Headers (Next.js Config)**
   - Copy-paste `next.config.js` with security headers
   - XSS, Clickjacking, MIME-Sniffing protection
   - HSTS (Strict-Transport-Security)

3. **Environment Variables Best Practices**
   - ✅ DO / ❌ DON'T guidelines
   - `NEXT_PUBLIC_` prefix explanation
   - Production vs Preview vs Development environments

4. **Performance Monitoring (Lighthouse)**
   - Quick check with Chrome DevTools
   - Common performance killers + fixes
   - Image optimization with `next/image`

5. **Production-Ready Checklist**
   - One-time checks for first deployment
   - Error Tracking, Security Headers, Performance, SEO, Favicon

**Benefits:**
- ✅ Production-ready in 15 minutes (not days!)
- ✅ All guides practical with copy-paste code
- ✅ No theory – only actionable steps

---

#### 2. Performance & Scalability Guides in Backend Agent

**New Sections in `.claude/agents/backend-dev.md`:**

1. **Database Indexing**
   - When to create indexes (WHERE, ORDER BY, JOIN)
   - Example: 500ms → <10ms query optimization
   - Supabase-specific instructions

2. **Query Performance Optimization**
   - N+1 Query Problem (Bad vs Good examples)
   - Supabase joins for efficient queries
   - Always use `.limit()` for lists

3. **Caching Strategy**
   - When to cache (settings, profiles, expensive queries)
   - Next.js `unstable_cache` examples
   - Optional: Redis for advanced caching

4. **Input Validation & Sanitization**
   - Zod schemas for type-safe validation
   - Example: Bad vs Good validation
   - Security: Never trust user input!

5. **Rate Limiting**
   - Prevent abuse and DDoS attacks
   - Upstash Redis example (optional)
   - Alternative: Vercel Edge Config

**Quick Reference Checklist:**
- Indexing (PFLICHT!)
- Query optimization, Input validation, Caching, Rate Limiting (optional but recommended)

---

#### 3. Test Reports Directory Added

**New Directory:** `/test-reports/`

- QA Engineer now saves test reports here
- Naming: `PROJ-X-feature-name.md`
- Complete `test-reports/README.md` with:
  - Report structure guidelines
  - Production-Ready criteria
  - Regression testing workflow
  - Tools (Browser DevTools, Lighthouse, axe DevTools)

**Updated QA Agent:**
- Checklist item: "Test-Report gespeichert in `/test-reports/PROJ-X-feature-name.md`"
- Workflow includes saving reports

---

#### 4. Template Branding & Clarity

**README.md:**
- Template renamed: "AI Coding Starter Kit" (from "Next.js Agent Starter")
- Professional headline: "Build scalable, production-ready web apps faster"
- Clear benefits section for PMs, Solo Founders, Small Teams
- Production-Ready Features section highlighting DevOps + Backend guides
- Agent-Team Workflow section with step-by-step examples
- Tech Stack table (Framework, Language, Styling, etc.)

**Clarity Improvements:**
- Agents renamed in descriptions (e.g., "solution-architect.md" instead of file path only)
- "PM-Friendly" emphasized (no code in specs, automatic handoffs)
- Scripts section added (`npm run dev`, `build`, `start`, `lint`)

---

### 📦 New Files

1. **`test-reports/README.md`** – QA Test Reports guidelines

---

### 🔄 Updated Files

1. **`.claude/agents/devops.md`**
   - Added 5 production-ready sections (Error Tracking, Security, Env Vars, Performance, Checklist)
   - Expanded from ~200 lines → ~400 lines

2. **`.claude/agents/backend-dev.md`**
   - Added 5 performance/scalability sections (Indexing, Query Optimization, Caching, Validation, Rate Limiting)
   - Expanded from ~180 lines → ~350 lines

3. **`.claude/agents/qa-engineer.md`**
   - Updated workflow: Test reports saved to `/test-reports/`
   - Added checklist item: "Test-Report gespeichert"

4. **`README.md`**
   - Complete rewrite: More professional, clearer structure
   - Added Production-Ready Features section
   - Added Agent-Team Workflow section
   - Added Why This Template section (PMs, Solo Founders, Teams)

5. **`TEMPLATE_CHANGELOG.md`**
   - Added this v1.3.0 entry

---

### 🚀 Migration Guide

No migration needed – all changes are additive.

If you cloned v1.2.0:
1. Update your agents: Copy `.claude/agents/devops.md` and `.claude/agents/backend-dev.md`
2. Create `/test-reports/` directory
3. Copy `test-reports/README.md`

---

## v1.2.0 - Feature Changelog System (2026-01-10)

### ✅ Änderungen

#### 1. Neue `FEATURE_CHANGELOG.md` für Feature-Tracking

**Problem vorher:**
- Agents wussten nicht, welche Features bereits existieren
- Risiko von Duplikaten oder redundanter Infrastruktur
- Keine zentrale Übersicht über implementierte Features

**Jetzt:**
- `FEATURE_CHANGELOG.md` trackt chronologisch ALLE implementierten Features
- Enthält: Implementation Details, neue Files, Database Changes, API Endpoints, Abhängigkeiten
- Wird vom DevOps Agent nach jedem Deployment updated

**Format:**
```markdown
## [PROJ-X] Feature-Name (2026-XX-XX)

### Implementiert ✅
- **Status:** Done
- **Feature Spec:** `/features/PROJ-X-feature-name.md`
- **Implementiert von:** Frontend Dev + Backend Dev
- **Getestet von:** QA Engineer
- **Deployed:** 2026-XX-XX

### Was wurde gebaut?
[1-2 Sätze Beschreibung]

### Neue Files
- `src/components/NewComponent.tsx` - [Beschreibung]

### Database Changes
```sql
CREATE TABLE new_table (...);
```

### API Endpoints
- `GET /api/endpoint` - [Beschreibung]

### Abhängigkeiten
- Baut auf: [PROJ-1], [PROJ-2]
```

**Benefits:**
- ✅ Agents können bestehende Components/APIs/Tables wiederverwenden
- ✅ Verhindert Duplicate Features
- ✅ QA weiß, welche Features für Regression Tests relevant sind
- ✅ Zentrale Dokumentation aller Features

---

#### 2. Alle 6 Agents integrieren jetzt FEATURE_CHANGELOG.md

**Updated:**

1. **Requirements Engineer:**
   - Prüft vor Feature Spec, ob ähnliches Feature existiert
   - Checkt vergebene Feature-IDs

2. **Solution Architect:**
   - Prüft bestehende Components/APIs/Database Tables
   - Kann auf existierender Infrastruktur aufbauen

3. **Frontend Developer:**
   - Prüft wiederverwendbare Components, Hooks, Styling-Patterns
   - Verhindert Duplicate Code

4. **Backend Developer:**
   - Prüft bestehende Database Tables, Columns, API Endpoints, RLS Policies
   - Kann Schema erweitern statt neu erstellen

5. **QA Engineer:**
   - Prüft bestehende Features für Regression Tests
   - Sieht Feature-Abhängigkeiten

6. **DevOps Engineer:**
   - Updated FEATURE_CHANGELOG.md nach jedem Deployment
   - Dokumentiert Implementation Details für zukünftige Features

**Alle Agents haben:**
- Neue Verantwortlichkeit: "FEATURE_CHANGELOG.md lesen"
- ⚠️ Warnung-Sektion mit Erklärung
- Checklist-Item: "FEATURE_CHANGELOG.md gelesen"

---

### 📦 Neue Files

1. **`FEATURE_CHANGELOG.md`** – Feature-Tracking System (Template + Guidelines)

---

### 🔄 Updated Files

1. **`.claude/agents/requirements-engineer.md`**
   - FEATURE_CHANGELOG.md Integration
   - Prüft vergebene Feature-IDs

2. **`.claude/agents/solution-architect.md`**
   - FEATURE_CHANGELOG.md Integration
   - Prüft bestehende Infrastruktur

3. **`.claude/agents/frontend-dev.md`**
   - FEATURE_CHANGELOG.md Integration
   - Code-Reuse Fokus

4. **`.claude/agents/backend-dev.md`**
   - FEATURE_CHANGELOG.md Integration
   - Schema-Erweiterung statt Neuerstellung

5. **`.claude/agents/qa-engineer.md`**
   - FEATURE_CHANGELOG.md Integration
   - Regression Testing Focus

6. **`.claude/agents/devops.md`**
   - FEATURE_CHANGELOG.md Update-Pflicht nach Deployment
   - Vollständige Update-Anleitung

---

## v1.1.0 - Agent System Improvements (2026-01-10)

### ✅ Änderungen

#### 1. `.claude/skills/` → `.claude/agents/` umbenannt

**Warum?**
- Agents sind KEINE registrierten Claude Code Skills
- Vermeidet Verwirrung (man kann sie nicht mit `/command` aufrufen)
- Klarere Benennung: Prompt-Templates / Role-Definitions

**Betroffen:**
- Ordner umbenen nt: `.claude/agents/`
- Alle Dokumentations-Files updated (README, PROJECT_CONTEXT, etc.)

---

#### 2. Requirements Engineer: Interaktive Fragen mit `AskUserQuestion`

**Vorher:**
```markdown
Fragen stellen:
- Wer sind die User?
- Was ist der Haupt-Use-Case?
```
→ Agent rattert Fragen als Text runter

**Jetzt:**
```typescript
AskUserQuestion({
  questions: [
    {
      question: "Wer sind die primären User dieses Features?",
      header: "Zielgruppe",
      options: [
        { label: "Solo-Gründer", description: "..." },
        { label: "Kleine Teams (2-10)", description: "..." },
        ...
      ],
      multiSelect: false
    }
  ]
})
```
→ Agent nutzt interaktive Single/Multiple-Choice Fragen!

**Benefits:**
- User kann per Mausklick antworten (statt tippen)
- Strukturierte Antworten (keine freien Texte)
- Bessere User Experience
- Systematischer Workflow

---

#### 3. Neue Dokumentation: `HOW_TO_USE_AGENTS.md`

**Inhalt:**
- ✅ Erklärt, dass Agents KEINE Skills sind
- ✅ Zeigt, wie man Agents richtig nutzt (Referenzierung)
- ✅ Best Practice Workflows mit Beispielen
- ✅ Voice-First Development Tipps
- ✅ Troubleshooting
- ✅ Quick Reference Table

**Use Case:**
User, die das Template clonen, wissen sofort wie sie die Agents nutzen.

---

### 📦 Neue Files

1. **`HOW_TO_USE_AGENTS.md`** – Vollständige Nutzungsanleitung
2. **`TEMPLATE_CHANGELOG.md`** – Dieses File (Template Version History)

---

### 🔄 Updated Files

1. **`.claude/agents/requirements-engineer.md`**
   - Workflow komplett überarbeitet
   - Nutzt jetzt `AskUserQuestion` Tool
   - 4 Phasen: Feature verstehen → Edge Cases → Spec schreiben → Review

2. **`README.md`**
   - Warnung hinzugefügt: Agents sind keine Skills
   - Link zu HOW_TO_USE_AGENTS.md

3. **`PROJECT_CONTEXT.md`**
   - Pfade updated (`.claude/agents/`)

4. **`TEMPLATE_OVERVIEW.md`**
   - Pfade updated

5. **`CHECKLIST.md`**
   - Pfade updated

---

### 🚀 Migration Guide (für bestehende Nutzer)

Falls du das Template bereits gecloned hast:

```bash
cd ai-coding-starter-kit
mv .claude/skills .claude/agents
```

Fertig! Keine weiteren Änderungen nötig.

---

## v1.0.0 - Initial Release (2026-01-10)

### Features

- ✅ Next.js 16 + TypeScript + Tailwind CSS
- ✅ 6 AI Agents mit Checklisten
- ✅ Supabase-Ready (optional)
- ✅ shadcn/ui-Ready
- ✅ Vercel Deployment-Ready
- ✅ PROJECT_CONTEXT.md Template
- ✅ Feature Specs System (`/features/PROJ-X.md`)
- ✅ Vollständige Dokumentation

---

**Letzte Aktualisierung:** 2026-01-10
