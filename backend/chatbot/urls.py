from django.urls import path
from .views import (
    DocumentListView,
    DocumentDetailView,
    DocumentToggleActiveView,
    DocumentPageContentView,
    ChatView,
    ChatSessionListView,
    ChatSessionDetailView,
    PassageDetailView,
    FeedbackView,
    SystemPromptConfigView
)

urlpatterns = [
    # Document endpoints
    path('documents/', DocumentListView.as_view(), name='document-list'),
    path('documents/<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('documents/<int:pk>/toggle-active/', DocumentToggleActiveView.as_view(), name='document-toggle-active'),
    path('documents/<int:doc_id>/page/<int:page_num>/', DocumentPageContentView.as_view(), name='document-page-content'),
    
    # Chat endpoints
    path('chat/', ChatView.as_view(), name='chat-message'),
    path('chats/', ChatSessionListView.as_view(), name='chat-sessions'),
    path('chats/<str:pk>/', ChatSessionDetailView.as_view(), name='chat-session-detail'),
    path('feedback/', FeedbackView.as_view(), name='chat-feedback'),
    
    # Passage / Citation endpoints
    path('passages/<int:pk>/', PassageDetailView.as_view(), name='passage-detail'),
    
    # System prompt and config endpoints
    path('system-prompt/', SystemPromptConfigView.as_view(), name='system-prompt-config'),
]
