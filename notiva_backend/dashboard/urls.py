from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ActivityViewSet, stats_view, study_summary_view

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'activity', ActivityViewSet, basename='activity')

urlpatterns = [
    path('stats/', stats_view, name='stats'),
    path('study-summary/', study_summary_view, name='study_summary'),
    path('', include(router.urls)),
]
