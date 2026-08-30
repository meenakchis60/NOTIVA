from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudySessionViewSet, StudyGoalViewSet, ReminderViewSet

router = DefaultRouter()
router.register(r'sessions', StudySessionViewSet, basename='studysession')
router.register(r'goals', StudyGoalViewSet, basename='studygoal')
router.register(r'reminders', ReminderViewSet, basename='reminder')

urlpatterns = [
    path('', include(router.urls)),
]
