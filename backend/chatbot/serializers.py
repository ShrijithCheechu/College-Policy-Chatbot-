from rest_framework import serializers
from .models import Document, Chunk, ChatSession, ChatMessage, SystemConfig

class ChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chunk
        fields = ['id', 'page_number', 'section_title', 'position', 'text']

class DocumentSerializer(serializers.ModelSerializer):
    chunks_count = serializers.IntegerField(source='chunks.count', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'filename', 'file_url', 'file_type', 'size', 'pages', 'status', 'is_active', 'chunks_count', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'content', 'citations', 'is_not_found', 'feedback', 'created_at']

class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'active_document_ids', 'created_at', 'updated_at', 'messages']

class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = ['model_name', 'temperature', 'top_k', 'max_file_size_mb', 'max_pages', 'system_prompt']
