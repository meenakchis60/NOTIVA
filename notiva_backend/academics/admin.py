from django.contrib import admin
from .models import Semester, Subject, Notebook


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('name', 'academic_year', 'owner', 'created_at')
    list_filter = ('academic_year',)
    search_fields = ('name', 'owner__email')
    ordering = ('-created_at',)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'semester', 'created_at')
    list_filter = ('semester__academic_year',)
    search_fields = ('name', 'code', 'semester__name')
    ordering = ('name',)


@admin.register(Notebook)
class NotebookAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'created_at')
    search_fields = ('name', 'subject__name')
    ordering = ('name',)
