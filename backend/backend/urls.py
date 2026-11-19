"""
URL configuration for backend project.
"""
import os
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.http import HttpResponse

def index_view(request):
    dist_index = os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist', 'index.html')
    if os.path.exists(dist_index):
        with open(dist_index, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse("Frontend dist not found. Please build frontend.", status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('chatbot.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])

# Serve frontend at root
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/|assets/).*$', index_view, name='frontend-index'),
]
