from django.contrib import admin
from .models import Note

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'notebook', 'is_pinned', 'is_starred', 'is_archived', 'is_deleted', 'updated_at')
    list_filter = ('is_pinned', 'is_starred', 'is_archived', 'is_deleted', 'notebook__subject__semester__owner')
    search_fields = ('title', 'notebook__name')
    ordering = ('-updated_at',)
