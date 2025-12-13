=============================================================
       KNOWLEDGE BASE - GOOGLE DOCS CONTENT
=============================================================

These files contain ready-to-use content for your knowledge base.
Copy each file's content into a Google Doc in your Knowledge Base folder.

=============================================================
HOW TO USE
=============================================================

1. Create a Google Drive folder called "Clinic Knowledge Base"

2. For each .txt file below, create a Google Doc with the EXACT name
   (without the .txt extension)

3. Copy the content from the .txt file into the Google Doc

4. After all docs are created, run the sync workflow in n8n

=============================================================
FILES TO CREATE
=============================================================

INSTITUTIONAL (About the clinic)
--------------------------------
institutional_both_about-clinic     → Bilingual about us
institutional_pt_consulta-inicial   → What to expect in consultation

TREATMENTS (Medical info)
--------------------------------
treatments_pt_metodologia           → Treatment methodology
treatments_pt_medicamentos          → Medications info (GLP-1)

FAQ (Frequently Asked Questions)
--------------------------------
faq_pt_perguntas-frequentes         → Portuguese FAQ
faq_en_general-questions            → English FAQ

OBJECTIONS (Sales handling)
--------------------------------
objections_pt_preco                 → Price objection handling
objections_pt_duvidas-tratamento    → Treatment doubts handling

COMPLIANCE (Legal/Medical)
--------------------------------
compliance_pt_avisos-legais         → Legal disclaimers, LGPD, handoff rules

=============================================================
CUSTOMIZATION NEEDED
=============================================================

Before going live, update these placeholders in the documents:

[ ] Clinic name (currently shows "[NOME_CLÍNICA]")
[ ] Clinic address
[ ] Doctor names and credentials
[ ] Specific working hours
[ ] Payment methods accepted
[ ] Any clinic-specific policies

=============================================================
NAMING CONVENTION
=============================================================

Format: category_language_title

Categories:
- institutional  → About clinic, team, location
- treatments     → Medical methodology, medications
- faq           → Frequently asked questions
- objections    → Price, trust, timing objections
- compliance    → Legal, LGPD, medical disclaimers

Languages:
- pt    → Portuguese only
- en    → English only
- both  → Bilingual content

=============================================================
AFTER SETUP
=============================================================

1. Run sync workflow manually:
   curl -X POST https://your-n8n.com/webhook/sync-knowledge-base

2. Check Qdrant dashboard to verify documents were indexed

3. Test by asking Sofia questions about the clinic

=============================================================
