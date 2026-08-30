from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StudyGroup, GroupMember, SharedNote, SharedFile, Comment

User = get_user_model()

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']

class GroupMemberSerializer(serializers.ModelSerializer):
    user_detail = UserBasicSerializer(source='user', read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = GroupMember
        fields = ['id', 'group', 'user', 'role', 'joined_at', 'user_detail', 'user_email']
        read_only_fields = ['group', 'user', 'joined_at']

    def create(self, validated_data):
        validated_data.pop('user_email', None)
        return super().create(validated_data)

class StudyGroupSerializer(serializers.ModelSerializer):
    created_by_detail = UserBasicSerializer(source='created_by', read_only=True)
    members = GroupMemberSerializer(many=True, read_only=True)
    created_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = StudyGroup
        fields = ['id', 'name', 'description', 'created_by', 'is_active', 'created_at', 'updated_at', 'created_by_detail', 'members']

class SharedNoteSerializer(serializers.ModelSerializer):
    shared_by_detail = UserBasicSerializer(source='shared_by', read_only=True)
    note_title = serializers.CharField(source='note.title', read_only=True)

    class Meta:
        model = SharedNote
        fields = ['id', 'note', 'group', 'shared_by', 'permission', 'created_at', 'shared_by_detail', 'note_title']
        read_only_fields = ['group', 'shared_by']

class SharedFileSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserBasicSerializer(source='uploaded_by', read_only=True)
    uploaded_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = SharedFile
        fields = ['id', 'group', 'uploaded_by', 'file', 'original_filename', 'file_size', 'mime_type', 'description', 'created_at', 'uploaded_by_detail']
        read_only_fields = ['group', 'original_filename', 'file_size', 'mime_type']

    def validate_file(self, value):
        MAX_SIZE = 10 * 1024 * 1024
        if value.size > MAX_SIZE:
            raise serializers.ValidationError("File size cannot exceed 10MB.")
        return value

class CommentSerializer(serializers.ModelSerializer):
    author_detail = UserBasicSerializer(source='author', read_only=True)
    author = serializers.HiddenField(default=serializers.CurrentUserDefault())
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'note', 'author', 'parent', 'content', 'is_deleted', 'created_at', 'updated_at', 'author_detail', 'replies']
        read_only_fields = ['note', 'is_deleted']

    def get_replies(self, obj):
        if not obj.parent_id:
            qs = Comment.objects.filter(parent=obj).order_by('created_at')
            return CommentSerializer(qs, many=True, context=self.context).data
        return []
