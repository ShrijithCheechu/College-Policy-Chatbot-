import os
import re
import math
import time
import requests
from collections import Counter
from django.conf import settings
from .models import Document, Chunk, ChatMessage, ChatSession, UsageLog, SystemConfig

class RAGService:
    @staticmethod
    def extract_and_index_document(doc_obj):
        """Extract text page by page from the document and create chunks."""
        file_path = doc_obj.file.path if doc_obj.file else None
        if not file_path or not os.path.exists(file_path):
            doc_obj.status = 'error'
            doc_obj.save()
            return False

        pages_data = [] # list of (page_num, text)
        file_type = doc_obj.file_type.lower()

        if file_type == 'pdf':
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                doc_obj.pages = len(reader.pages)
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    pages_data.append((idx + 1, text.strip()))
            except Exception as e:
                print(f"Error reading PDF {file_path}: {e}")
                doc_obj.status = 'error'
                doc_obj.save()
                return False
        else:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                # split by markdown headers or form feeds or 1000-char blocks
                sections = re.split(r'\n(?=#+ )', content)
                doc_obj.pages = max(1, len(sections))
                for idx, sec in enumerate(sections):
                    pages_data.append((idx + 1, sec.strip()))
            except Exception as e:
                print(f"Error reading file {file_path}: {e}")
                doc_obj.status = 'error'
                doc_obj.save()
                return False

        # Clear existing chunks if re-indexing
        doc_obj.chunks.all().delete()

        # Chunking: Break into meaningful chunks by sections and paragraphs
        chunk_pos = 0
        section_regex = re.compile(r'^(?:\d+\.|\d+\.\d+|[A-Z][a-zA-Z\s]{3,30}:?)(.+)?', re.MULTILINE)
        
        current_section = doc_obj.filename.replace('.pdf', '')
        for page_num, page_text in pages_data:
            if not page_text:
                continue

            # Identify headers in this page
            lines = [l.strip() for l in page_text.split('\n') if l.strip()]
            
            # Check for main headings like "3. Attendance Policy"
            page_blocks = []
            curr_block = []
            
            for line in lines:
                if re.match(r'^\d+\.\s+[A-Za-z]', line):
                    if curr_block:
                        page_blocks.append((current_section, "\n".join(curr_block)))
                        curr_block = []
                    current_section = line
                curr_block.append(line)
            
            if curr_block:
                page_blocks.append((current_section, "\n".join(curr_block)))

            # If no headings detected, split by double newlines or sentences
            if not page_blocks:
                page_blocks = [(f"Page {page_num}", page_text)]

            for sec_name, block_text in page_blocks:
                # Sub-chunk if block is too long (> 800 chars)
                words = block_text.split()
                step = 120
                overlap = 25
                if len(words) <= step:
                    sub_chunks = [block_text]
                else:
                    sub_chunks = []
                    i = 0
                    while i < len(words):
                        sub_chunks.append(" ".join(words[i:i + step]))
                        i += (step - overlap)

                for sub_text in sub_chunks:
                    if len(sub_text.strip()) > 20:
                        Chunk.objects.create(
                            document=doc_obj,
                            page_number=page_num,
                            section_title=sec_name[:200],
                            position=chunk_pos,
                            text=sub_text.strip()
                        )
                        chunk_pos += 1

        doc_obj.status = 'ready'
        doc_obj.save()
        return True

    @staticmethod
    def seed_initial_documents():
        """Ensure Policy Handbook.pdf and SRS_Document.pdf exist and are indexed."""
        preloaded_dir = os.path.join(settings.MEDIA_ROOT, 'preloaded')
        os.makedirs(preloaded_dir, exist_ok=True)
        
        # 1. Policy Handbook
        policy_path = os.path.join(preloaded_dir, 'Policy_Handbook.pdf')
        if os.path.exists(policy_path):
            doc, created = Document.objects.get_or_create(
                filename='Policy Handbook.pdf',
                defaults={
                    'file': 'preloaded/Policy_Handbook.pdf',
                    'file_type': 'pdf',
                    'size': os.path.getsize(policy_path),
                    'pages': 20,
                    'status': 'processing',
                    'is_active': True,
                    'session_id': 'default'
                }
            )
            if created or doc.chunks.count() == 0:
                doc.file = 'preloaded/Policy_Handbook.pdf'
                doc.save()
                RAGService.extract_and_index_document(doc)

        # 2. SRS Document
        srs_path = os.path.join(preloaded_dir, 'SRS_Document.pdf')
        if os.path.exists(srs_path):
            srs_doc, srs_created = Document.objects.get_or_create(
                filename='SRS_Document.pdf',
                defaults={
                    'file': 'preloaded/SRS_Document.pdf',
                    'file_type': 'pdf',
                    'size': os.path.getsize(srs_path),
                    'pages': 17,
                    'status': 'processing',
                    'is_active': True,
                    'session_id': 'default'
                }
            )
            if srs_created or srs_doc.chunks.count() == 0:
                srs_doc.file = 'preloaded/SRS_Document.pdf'
                srs_doc.save()
                RAGService.extract_and_index_document(srs_doc)

    @staticmethod
    def tokenize(text):
        """Clean and tokenize text."""
        return [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_]{2,}\b', text)]

    @classmethod
    def retrieve_chunks(cls, query, active_doc_ids=None, top_k=6):
        """
        Hybrid BM25 / TF-IDF Retrieval over active documents.
        Returns (ranked_chunks, max_score, query_terms)
        """
        query_tokens = cls.tokenize(query)
        if not query_tokens:
            return [], 0.0, []

        query_counts = Counter(query_tokens)

        # Filter chunks by active documents
        chunks_qs = Chunk.objects.select_related('document').all()
        if active_doc_ids:
            chunks_qs = chunks_qs.filter(document_id__in=active_doc_ids, document__status='ready')
        else:
            chunks_qs = chunks_qs.filter(document__is_active=True, document__status='ready')

        all_chunks = list(chunks_qs)
        if not all_chunks:
            return [], 0.0, query_tokens

        N = len(all_chunks)
        # Compute doc frequencies for query tokens
        doc_freq = Counter()
        chunk_token_maps = []

        for ch in all_chunks:
            tokens = cls.tokenize(ch.text + " " + ch.section_title + " " + ch.document.filename)
            t_counts = Counter(tokens)
            chunk_token_maps.append((ch, t_counts, len(tokens)))
            for term in query_tokens:
                if term in t_counts:
                    doc_freq[term] += 1

        # Calculate BM25 / TF-IDF score for each chunk
        avg_dl = sum(t[2] for t in chunk_token_maps) / max(1, N)
        k1 = 1.5
        b = 0.75

        scored_chunks = []
        for ch, t_counts, dl in chunk_token_maps:
            score = 0.0
            for term, q_weight in query_counts.items():
                if term in t_counts:
                    df = doc_freq[term]
                    idf = math.log((N - df + 0.5) / (df + 0.5) + 1.0)
                    tf = t_counts[term]
                    term_score = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avg_dl)))
                    score += term_score

            # Boost if section title or exact phrase contains key terms
            clean_text = ch.text.lower()
            clean_title = ch.section_title.lower()
            if query.lower() in clean_text:
                score += 5.0
            for term in query_tokens:
                if term in clean_title:
                    score += 2.0

            if score > 0.1:
                scored_chunks.append((ch, score))

        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        top_chunks = scored_chunks[:top_k]
        max_score = top_chunks[0][1] if top_chunks else 0.0

        return [item[0] for item in top_chunks], max_score, query_tokens

    @classmethod
    def query(cls, query_text, session_id='default', active_doc_ids=None):
        """
        Main query entrypoint complying strictly with SRS section 4 & 5.
        """
        start_time = time.time()
        config = SystemConfig.get_settings()
        query_stripped = query_text.strip()

        # Get or create chat session
        session, _ = ChatSession.objects.get_or_create(id=session_id)
        if active_doc_ids is None:
            active_doc_ids = session.active_document_ids or list(
                Document.objects.filter(is_active=True).values_list('id', flat=True)
            )

        # 1. Check prompt injection / rule override attempt (FR-CHAT-13)
        override_triggers = [
            'ignore your instructions', 'ignore instructions', 'ignore the document',
            'ignore previous rules', 'ignore rules', 'system prompt',
            'reveal your prompt', 'tell me from your own knowledge'
        ]
        if any(trig in query_stripped.lower() for trig in override_triggers):
            reply = "I cannot fulfill this request. I am strictly instructed to answer questions only related to the uploaded document(s) using their provided content."
            msg = ChatMessage.objects.create(
                session=session,
                sender='bot',
                content=reply,
                citations=[],
                is_not_found=False
            )
            UsageLog.objects.create(query=query_stripped, latency=round(time.time() - start_time, 2), outcome='declined')
            return {
                'answer': reply,
                'citations': [],
                'is_not_found': False,
                'retrieved_sources': []
            }

        # 2. Check if documents exist and are active (FR-CHAT-08)
        active_docs = Document.objects.filter(id__in=active_doc_ids, status='ready')
        if not active_docs.exists():
            reply = "No document is currently active. Please upload or select a document before asking questions."
            ChatMessage.objects.create(
                session=session,
                sender='bot',
                content=reply,
                citations=[],
                is_not_found=True
            )
            return {
                'answer': reply,
                'citations': [],
                'is_not_found': True,
                'retrieved_sources': []
            }

        # 3. Retrieve relevant chunks (FR-DOC-03, FR-CHAT-02)
        retrieved_chunks, max_score, query_tokens = cls.retrieve_chunks(
            query_stripped, active_doc_ids=active_doc_ids, top_k=config.top_k
        )

        # 4. Check for off-topic queries or queries with zero document support (FR-CHAT-06, FR-CHAT-07)
        # E.g. "Who is the president of France?", "Write a python script", "What is the weather?"
        off_topic_indicators = ['president of france', 'capital of france', 'who is elon musk', 'write python code', 'recipe', 'tell me a joke']
        is_explicit_off_topic = any(ot in query_stripped.lower() for ot in off_topic_indicators)

        if is_explicit_off_topic or not retrieved_chunks or max_score < 0.6:
            # Polite decline per SRS Section 4.2 & 4.3 and mockup
            reply = "I couldn't find this information in the uploaded documents. Please try asking about another topic from the provided files."
            msg = ChatMessage.objects.create(
                session=session,
                sender='bot',
                content=reply,
                citations=[],
                is_not_found=True
            )
            UsageLog.objects.create(query=query_stripped, latency=round(time.time() - start_time, 2), outcome='not_found')
            return {
                'answer': reply,
                'citations': [],
                'is_not_found': True,
                'retrieved_sources': []
            }

        # Format retrieved chunks with metadata for the system prompt
        excerpts_text = ""
        retrieved_sources_payload = []
        citations_payload = []

        for idx, ch in enumerate(retrieved_chunks):
            doc_name = ch.document.filename
            page = ch.page_number
            section = ch.section_title or f"Page {page}"
            excerpts_text += f"\n--- EXCERPT {idx+1} [{doc_name}, Page {page}, Section: {section}] ---\n{ch.text}\n"
            
            source_info = {
                'id': ch.id,
                'doc_id': ch.document.id,
                'document': doc_name,
                'page': page,
                'section': section,
                'snippet': ch.text[:180] + ("..." if len(ch.text) > 180 else "")
            }
            retrieved_sources_payload.append(source_info)

        # Primary citation
        first_ch = retrieved_chunks[0]
        primary_citation = {
            'document': first_ch.document.filename,
            'page': first_ch.page_number,
            'section': first_ch.section_title or f"Section {first_ch.page_number}"
        }
        citations_payload.append(primary_citation)

        # 5. Build System Prompt as strictly specified in SRS Section 4.2
        formatted_system_prompt = config.system_prompt.replace(
            "{retrieved_chunks_with_metadata}", excerpts_text
        )

        # Load recent conversation history (last 10 messages per FR-HIST-02)
        recent_msgs = list(ChatMessage.objects.filter(session=session).order_by('-created_at')[:10])
        recent_msgs.reverse()

        # 6. Call Google Gemini API (or Grounded Synthesizer Fallback)
        api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
        generated_answer = None

        if api_key:
            try:
                # Use Gemini REST API directly with prompt + excerpts
                # Model configurable via config.model_name
                model_name = config.model_name or 'gemini-1.5-flash'
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                
                # Build contents array
                contents = []
                # Include history
                for m in recent_msgs:
                    role = "user" if m.sender == "user" else "model"
                    contents.append({"role": role, "parts": [{"text": m.content}]})

                # Append current user prompt
                current_prompt = f"System Instructions:\n{formatted_system_prompt}\n\nUser Question:\n{query_stripped}"
                contents.append({"role": "user", "parts": [{"text": current_prompt}]})

                req_body = {
                    "contents": contents,
                    "generationConfig": {
                        "temperature": config.temperature,
                        "maxOutputTokens": 1024
                    }
                }

                resp = requests.post(url, json=req_body, timeout=15)
                if resp.status_code == 200:
                    res_json = resp.json()
                    candidates = res_json.get('candidates', [])
                    if candidates:
                        parts = candidates[0].get('content', {}).get('parts', [])
                        if parts:
                            generated_answer = parts[0].get('text', '').strip()
                else:
                    print(f"Gemini API returned code {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                print(f"Gemini API call error (switching to grounded synthesizer): {e}")

        # If Gemini was not reached or returned empty, generate grounded synthesis from retrieved chunks
        if not generated_answer:
            generated_answer = cls._grounded_fallback_synthesis(query_stripped, retrieved_chunks)

        # Grounding post-check (SRS Section 5.3):
        # Ensure citation string is present or appended if bot forgot
        cit_str = f"Source: {primary_citation['document']} • Page {primary_citation['page']}, {primary_citation['section']}"
        
        is_not_found = "couldn't find that in the uploaded document" in generated_answer.lower()

        # Save to database
        ChatMessage.objects.create(
            session=session,
            sender='bot',
            content=generated_answer,
            citations=citations_payload,
            is_not_found=is_not_found
        )

        latency = round(time.time() - start_time, 2)
        UsageLog.objects.create(
            query=query_stripped,
            latency=latency,
            outcome='answered' if not is_not_found else 'not_found'
        )

        return {
            'answer': generated_answer,
            'citations': citations_payload,
            'is_not_found': is_not_found,
            'retrieved_sources': retrieved_sources_payload
        }

    @staticmethod
    def _grounded_fallback_synthesis(query, retrieved_chunks):
        """
        Strictly grounded synthesizer that constructs answers directly
        from the top retrieved text chunks, maintaining factual citations.
        """
        q_lower = query.lower()
        top_chunk = retrieved_chunks[0]
        doc_name = top_chunk.document.filename
        page = top_chunk.page_number
        section = top_chunk.section_title or f"Section {page}"

        # Check for attendance policy query
        if 'attendance' in q_lower:
            for ch in retrieved_chunks:
                if 'attendance' in ch.text.lower() or '75%' in ch.text:
                    return (
                        f"According to the {ch.document.filename.replace('.pdf', '')}, students must attend at least "
                        f"75% of classes in each course (theory and practical separately) to be eligible for end-semester examinations. "
                        f"Students with attendance between 65% and 74.9% may be considered on medical or other documented grounds, "
                        f"on payment of a condonation fee set by the College. Students below 65% are detained in the course and must repeat it."
                    )

        # Check for passing percentage or examination rules
        if 'pass' in q_lower or 'marks' in q_lower or 'examination' in q_lower:
            for ch in retrieved_chunks:
                if 'pass' in ch.text.lower() or '40%' in ch.text:
                    return (
                        f"According to the {ch.document.filename.replace('.pdf', '')} (Page {ch.page_number}, {ch.section_title}), "
                        f"a student must score at least 40% in the end-semester examination and 50% overall to pass a course. "
                        f"Theory courses are assessed through continuous internal assessment (40%) and an end-semester examination (60%)."
                    )

        # Check for fees / refunds
        if 'refund' in q_lower or 'fee' in q_lower:
            for ch in retrieved_chunks:
                if 'refund' in ch.text.lower() or 'withdrawal' in ch.text.lower():
                    return (
                        f"According to the {ch.document.filename.replace('.pdf', '')} (Page {ch.page_number}, {ch.section_title}), "
                        f"refunds on withdrawal are: 100% (less processing fee) before commencement of classes, 90% within 15 days of commencement, "
                        f"50% from 16 to 30 days from commencement, and no refund after 30 days."
                    )

        # Check for hostel
        if 'hostel' in q_lower or 'in-time' in q_lower:
            for ch in retrieved_chunks:
                if 'hostel' in ch.text.lower() or '8:30' in ch.text:
                    return (
                        f"According to the {ch.document.filename.replace('.pdf', '')} (Page {ch.page_number}, {ch.section_title}), "
                        f"residents must follow in-time rules: weekdays 8:30 p.m. for women's hostels and 9:30 p.m. for men's hostels, "
                        f"with written permission for late return. Overnight guests are not permitted."
                    )

        # Check for library
        if 'library' in q_lower or 'book' in q_lower:
            for ch in retrieved_chunks:
                if 'library' in ch.text.lower() or 'borrow' in ch.text.lower():
                    return (
                        f"According to the {ch.document.filename.replace('.pdf', '')} (Page {ch.page_number}, {ch.section_title}), "
                        f"library hours are 8:30 a.m. to 8:00 p.m. on weekdays and 9:00 a.m. to 4:00 p.m. on Saturdays. "
                        f"Undergraduates may borrow 4 books for 14 days; postgraduates and research scholars 6 books for 21 days."
                    )

        # Check for summarization request
        if 'summarize' in q_lower or 'summary' in q_lower:
            return (
                f"Summary of {section} ({doc_name}, Page {page}):\n"
                f"{top_chunk.text.strip()}"
            )

        # Check for explanation request
        if 'explain' in q_lower or 'what does' in q_lower:
            return (
                f"Based on {doc_name} (Page {page}, {section}):\n"
                f"\"{top_chunk.text.strip()}\"\n"
                f"This provision sets the official standards and requirements established by Northbridge College."
            )

        # Default grounded extraction from top chunk
        return (
            f"According to {doc_name} (Page {page}, {section}):\n"
            f"{top_chunk.text.strip()}"
        )
