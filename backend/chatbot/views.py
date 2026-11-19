import os
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import Http404, JsonResponse

from .models import Document, Chunk, ChatSession, ChatMessage, SystemConfig
from .serializers import DocumentSerializer, ChatSessionSerializer, ChatMessageSerializer, ChunkSerializer, SystemConfigSerializer
from .rag_service import RAGService

class DocumentListView(APIView):
    def get(self, request):
        # Auto-seed initial documents if database is empty
        if not Document.objects.exists():
            RAGService.seed_initial_documents()

        session_id = request.query_params.get('session_id', 'default')
        docs = Document.objects.all().order_by('-created_at')
        serializer = DocumentSerializer(docs, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Handle file upload
        uploaded_file = request.FILES.get('file')
        raw_text = request.data.get('raw_text')
        session_id = request.data.get('session_id', 'default')

        config = SystemConfig.get_settings()
        max_bytes = config.max_file_size_mb * 1024 * 1024

        if uploaded_file:
            # Validate size
            if uploaded_file.size > max_bytes:
                return Response(
                    {'error': f'File exceeds maximum limit of {config.max_file_size_mb} MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            filename = uploaded_file.name
            ext = filename.split('.')[-1].lower() if '.' in filename else 'txt'
            allowed_exts = ['pdf', 'txt', 'md', 'docx']
            if ext not in allowed_exts:
                return Response(
                    {'error': f'Unsupported file type .{ext}. Supported types: PDF, DOCX, TXT, Markdown.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            doc = Document.objects.create(
                filename=filename,
                file=uploaded_file,
                file_type=ext,
                size=uploaded_file.size,
                status='processing',
                session_id=session_id,
                is_active=True
            )

            # Process and index
            success = RAGService.extract_and_index_document(doc)
            if not success:
                return Response(
                    {'error': 'Failed to extract text from document.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)

        elif raw_text:
            title = request.data.get('title', 'Pasted_Text_Document.txt')
            doc = Document.objects.create(
                filename=title,
                file_type='txt',
                size=len(raw_text.encode('utf-8')),
                pages=1,
                status='ready',
                session_id=session_id,
                is_active=True
            )
            # Create chunks directly
            Chunk.objects.create(
                document=doc,
                page_number=1,
                section_title="Pasted Text",
                position=0,
                text=raw_text.strip()
            )
            return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)

        return Response({'error': 'No file or text provided'}, status=status.HTTP_400_BAD_REQUEST)

class DocumentDetailView(APIView):
    def get(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        return Response(DocumentSerializer(doc).data)

    def delete(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        if doc.file and os.path.exists(doc.file.path):
            try:
                os.remove(doc.file.path)
            except Exception:
                pass
        doc.delete()
        return Response({'success': True, 'message': 'Document deleted successfully'}, status=status.HTTP_200_OK)

class DocumentToggleActiveView(APIView):
    def post(self, request, pk):
        doc = get_object_or_404(Document, pk=pk)
        doc.is_active = not doc.is_active
        doc.save()
        return Response(DocumentSerializer(doc).data)

class DocumentPageContentView(APIView):
    """Returns text/preview of a particular page of a document for the Document Preview panel."""
    def get(self, request, doc_id, page_num):
        doc = get_object_or_404(Document, pk=doc_id)
        chunks = doc.chunks.filter(page_number=page_num).order_by('position')
        if not chunks.exists():
            # Return any page or default
            return Response({
                'doc_id': doc.id,
                'filename': doc.filename,
                'page': page_num,
                'total_pages': doc.pages,
                'content': f"Page {page_num} of {doc.filename}\nNo textual content extracted on this page."
            })

        combined_text = "\n\n".join(ch.text for ch in chunks)
        return Response({
            'doc_id': doc.id,
            'filename': doc.filename,
            'page': page_num,
            'total_pages': doc.pages,
            'section': chunks.first().section_title,
            'content': combined_text
        })

class ChatView(APIView):
    def post(self, request):
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id') or str(uuid.uuid4())
        active_doc_ids = request.data.get('active_document_ids', None)

        if not message:
            return Response({'error': 'Empty messages are not allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(message) > 4000:
            return Response({'error': 'Message exceeds the 4,000 character limit.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get session
        session, _ = ChatSession.objects.get_or_create(id=session_id)
        if active_doc_ids:
            session.active_document_ids = active_doc_ids
            session.save()

        # Save user message
        user_msg = ChatMessage.objects.create(
            session=session,
            sender='user',
            content=message
        )

        # Run query through RAG Service
        rag_result = RAGService.query(message, session_id=session_id, active_doc_ids=active_doc_ids)

        # Get the latest bot message
        latest_bot_msg = session.messages.filter(sender='bot').last()

        return Response({
            'session_id': session.id,
            'user_message': ChatMessageSerializer(user_msg).data,
            'bot_message': ChatMessageSerializer(latest_bot_msg).data if latest_bot_msg else None,
            'answer': rag_result['answer'],
            'citations': rag_result['citations'],
            'is_not_found': rag_result['is_not_found'],
            'retrieved_sources': rag_result['retrieved_sources']
        })

class ChatSessionListView(APIView):
    def get(self, request):
        sessions = ChatSession.objects.all().order_by('-updated_at')
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    def post(self, request):
        session_id = str(uuid.uuid4())
        title = request.data.get('title', 'New Chat')
        active_doc_ids = list(Document.objects.filter(is_active=True).values_list('id', flat=True))
        session = ChatSession.objects.create(
            id=session_id,
            title=title,
            active_document_ids=active_doc_ids
        )
        return Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)

class ChatSessionDetailView(APIView):
    def get(self, request, pk):
        session = get_object_or_404(ChatSession, pk=pk)
        return Response(ChatSessionSerializer(session).data)

    def delete(self, request, pk):
        session = get_object_or_404(ChatSession, pk=pk)
        session.delete()
        return Response({'success': True, 'message': 'Chat session deleted successfully'})

class PassageDetailView(APIView):
    def get(self, request, pk):
        chunk = get_object_or_404(Chunk, pk=pk)
        return Response(ChunkSerializer(chunk).data)

class FeedbackView(APIView):
    def post(self, request):
        message_id = request.data.get('message_id')
        feedback = request.data.get('feedback') # 'up' or 'down'
        if not message_id or feedback not in ['up', 'down', None]:
            return Response({'error': 'Invalid feedback data'}, status=status.HTTP_400_BAD_REQUEST)

        msg = get_object_or_404(ChatMessage, pk=message_id)
        msg.feedback = feedback
        msg.save()
        return Response({'success': True, 'feedback': msg.feedback})

class SystemPromptConfigView(APIView):
    def get(self, request):
        config = SystemConfig.get_settings()
        return Response(SystemConfigSerializer(config).data)

    def post(self, request):
        config = SystemConfig.get_settings()
        serializer = SystemConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
