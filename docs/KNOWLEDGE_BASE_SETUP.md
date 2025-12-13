# Knowledge Base Setup (Google Drive → Qdrant)

## How It Works

```
Google Drive (You edit here)
      │
      │  n8n syncs every 6 hours
      │  (or manually trigger)
      ▼
┌─────────────────────────────────────┐
│  1. List all Google Docs in folder  │
│  2. Download each as plain text     │
│  3. Chunk into ~500 word pieces     │
│  4. Generate embeddings (OpenAI)    │
│  5. Store in Qdrant                 │
└─────────────────────────────────────┘
      │
      ▼
   Qdrant (AI searches here)
```

**You only need to edit Google Docs** - the system handles the rest automatically!

---

## Step 1: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder: `Clinic Knowledge Base`
3. Copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/THIS_IS_YOUR_FOLDER_ID
   ```
4. Add to n8n environment variables:
   ```
   GOOGLE_DRIVE_KB_FOLDER_ID=your_folder_id_here
   ```

---

## Step 2: File Naming Convention

Name your Google Docs with this pattern:
```
category_language_title
```

### Examples:
| Filename | Category | Language | Title |
|----------|----------|----------|-------|
| `faq_pt_perguntas-frequentes` | faq | pt | perguntas-frequentes |
| `treatments_pt_metodologia` | treatments | pt | metodologia |
| `institutional_both_about-clinic` | institutional | both | about-clinic |
| `objections_pt_price-handling` | objections | pt | price-handling |

### Categories:
- `institutional` - About clinic, team, location
- `treatments` - Methodology, medications, protocols
- `faq` - Frequently asked questions
- `objections` - Price, trust, timing objections
- `compliance` - Medical disclaimers, LGPD

### Languages:
- `pt` - Portuguese only
- `en` - English only
- `both` - Both languages (bilingual docs)

---

## Step 3: Create Your Documents

### Recommended Structure

Create these Google Docs in your folder:

```
Clinic Knowledge Base/
├── institutional_both_about-clinic
├── institutional_pt_equipe-medica
├── institutional_pt_localizacao
├── treatments_pt_metodologia
├── treatments_pt_medicamentos-glp1
├── treatments_pt_acompanhamento
├── faq_pt_perguntas-frequentes
├── faq_pt_agendamento
├── faq_en_general-questions
├── objections_pt_preco
├── objections_pt_duvidas-comuns
└── compliance_pt_avisos-legais
```

### Document Template

Each document should have clear sections:

```markdown
# Titulo do Documento

## Secao 1
Conteudo aqui...

## Secao 2
Mais conteudo...

## Perguntas e Respostas (se aplicavel)

### Pergunta 1?
Resposta 1...

### Pergunta 2?
Resposta 2...
```

---

## Step 4: Import the Sync Workflow

1. Open n8n
2. Import `workflows/knowledge-base-sync.json`
3. Configure credentials:
   - Google Drive OAuth2
   - OpenAI API Key (Header Auth)
   - Qdrant API Key (Header Auth, if using cloud)
4. Activate the workflow

---

## Step 5: Run Initial Sync

### Option A: Wait for Schedule
The workflow runs every 6 hours automatically.

### Option B: Manual Trigger
```bash
curl -X POST https://your-n8n-domain.com/webhook/sync-knowledge-base
```

### Option C: Run in n8n
1. Open the workflow
2. Click "Execute Workflow"

---

## Step 6: Verify It Worked

### Check Qdrant Dashboard
```
http://localhost:6333/dashboard
```
(or your Railway Qdrant URL)

1. Go to Collections
2. Click `clinic_knowledge_base`
3. You should see points with your content

### Check via API
```bash
curl http://localhost:6333/collections/clinic_knowledge_base | jq
```

---

## Updating Knowledge Base

### To Add New Content:
1. Create new Google Doc with proper naming
2. Wait for next sync (6 hours) or trigger manually

### To Update Existing Content:
1. Edit the Google Doc
2. Wait for next sync or trigger manually
3. Old chunks are automatically replaced (same ID)

### To Remove Content:
1. Delete or move the Google Doc out of folder
2. Note: Old vectors remain in Qdrant
3. To fully remove, delete from Qdrant dashboard

---

## Troubleshooting

### Documents not syncing
- Check Google Drive OAuth is connected
- Verify folder ID is correct
- Ensure docs are Google Docs (not uploaded .docx)

### Embeddings failing
- Check OpenAI API key
- Verify API has quota
- Check n8n execution logs

### Search not finding content
- Verify documents are in correct folder
- Check Qdrant collection has points
- Test search directly in Qdrant dashboard

### Rate limiting
- OpenAI: Add delays between embeddings
- Qdrant: Batch upserts (already configured)

---

## Environment Variables

Add these to n8n:

```env
# Google Drive
GOOGLE_DRIVE_KB_FOLDER_ID=your_folder_id

# Already configured
QDRANT_URL=http://qdrant.railway.internal:6333
QDRANT_COLLECTION_NAME=clinic_knowledge_base
OPENAI_API_KEY=sk-xxxxx
```

---

## Sample Content to Start

Copy the content from `knowledge-base/` folder in this repo to your Google Docs:

1. `knowledge-base/institutional/about_clinic.md` → `institutional_both_about-clinic`
2. `knowledge-base/treatments/methodology.md` → `treatments_pt_metodologia`
3. `knowledge-base/faq/general_questions.md` → `faq_pt_perguntas-frequentes`
4. `knowledge-base/objection_handling/price_objections.md` → `objections_pt_preco`
5. `knowledge-base/compliance/medical_disclaimers.md` → `compliance_pt_avisos-legais`

Then customize with your clinic's actual information!
