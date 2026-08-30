"""
API URL aggregator for /api/v1/
Each installed app contributes its own urls.py here.
"""

from django.urls import path, include

urlpatterns = [
    path('auth/', include('accounts.urls')),
    path('academics/', include('academics.urls')),
    path('collab/', include('collaboration.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('study/', include('study.urls')),
    path('', include('notes.urls')),
]

