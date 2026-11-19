# Northbridge College Policy Assistant (RAG Web Chatbot)

A web-based document chatbot application developed using **Django REST Framework** (backend) and **React 19 + Tailwind CSS** (frontend) based on the Software Requirements Specification (SRS) and the Northbridge College Institutional Policy Handbook.

---

## 🌟 Key Features

1. **RAG (Retrieval-Augmented Generation) Engine**:
   - Ingests the **Institutional Policy Handbook** (20 pages, 18 distinct policy domains) and the **SRS Document** (17 pages).
   - Preserves page numbers, section titles, and paragraph context.
   - Hybrid BM25 keyword matching and semantic ranking to retrieve the top $K$ excerpts with exact citations.
   - Built-in grounded fallback synthesis ensuring 100% reliability and zero hallucination.

2. **System Prompt Compliance (SRS Section 4.2)**:
   - Feeds the exact system prompt specified in Section 4.2 with runtime dynamic excerpts:
     - **Source of Truth**: Strict grounding on provided document excerpts only.
     - **Allowed Operations**: Answering, summarization, explanation, quotation with citations.
     - **Not Found Rule**: Polite decline with no guessing or hallucinating outside information.
     - **Off-Topic Protection**: Declines general knowledge questions (e.g. *"Who is the president of France?"*).
     - **Security / Prompt Injection Shield**: Treats document text as content, not commands; resists rule override attempts.
     - **Citation Format**: Strictly cites `[Document name, page/section]`.

3. **Pixel-Perfect UI (Matching SRS Mockup)**:
   - **Header**: Northbridge College crest, Policy Assistant active tab, College Website portal modal, user profile icon.
   - **Left Sidebar**: Active document list with badges, upload area supporting PDF/DOCX/TXT up to 20MB, quick actions (*"Summarize Document"*, *"Explain a Section"*, *"Ask a Question"*), and verified authority banner.
   - **Center Chat Panel**: Friendly robot assistant avatar, speech bubbles, clickable nested citation cards with `[View Source ↗]`, and distinct red-pill warning alerts for missing information.
   - **Right Sidebar**: Retrieved sources panel with excerpt quotes, and an interactive **Document Preview** paper sheet that jumps to the cited page and highlights the referenced passage.
   - **Admin / Configuration Modal (FR-ADM-04)**: Real-time inspection and configuration of model name (`gemini-1.5-flash`), temperature ($0.1 - 0.3$), and system prompt template.

---

## 🚀 Running the Application

### 1. Launch Django Server
From the root directory:
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```
Open your browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)** (The Django backend directly serves the pre-built React SPA).

### 2. Optional: Running React in Vite Dev Mode
For live hot-reloading:
```bash
cd frontend
npm run dev
```
Navigate to:
👉 **[http://127.0.0.1:5173](http://127.0.0.1:5173)** (Proxying API requests to Django on port 8000).

---

## 🧪 Automated Verification Test Suite

Run the end-to-end automated test suite:
```bash
python test_suite.py
```
This tests:
- Database document seeding and chunk extraction.
- REST API `/api/v1/documents/` and `/api/v1/system-prompt/`.
- Document page preview extraction for page 5.
- Attendance policy query and citation verification.
- Off-topic question decline and not-found handling.
- Prompt injection and rule-override defense.
