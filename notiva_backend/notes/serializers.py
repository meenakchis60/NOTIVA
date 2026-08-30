from rest_framework import serializers
from .models import Note, Tag, Checklist, ChecklistItem, NoteAttachment, NoteVersion
from academics.models import Notebook

class TagSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Tag
        fields = ('id', 'user', 'name', 'color', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_name(self, value):
        return value.strip().lower()


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ('id', 'checklist', 'content', 'is_completed', 'position', 'created_at', 'updated_at')
        read_only_fields = ('id', 'checklist', 'created_at', 'updated_at')


class ChecklistSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Checklist
        fields = ('id', 'note', 'title', 'position', 'items', 'created_at', 'updated_at')
        read_only_fields = ('id', 'note', 'created_at', 'updated_at')


from PIL import Image, UnidentifiedImageError

ALLOWED_MIME_TYPES = {
    'pdf': ['application/pdf'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'txt': ['text/plain'],
    'png': ['image/png'],
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'webp': ['image/webp'],
    'ppt': ['application/vnd.ms-powerpoint'],
    'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
}

class NoteAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    file_url = serializers.FileField(source='file', read_only=True)
    
    class Meta:
        model = NoteAttachment
        fields = ('id', 'note', 'original_filename', 'file', 'file_url', 'file_size', 'content_type', 'uploaded_at')
        read_only_fields = ('id', 'note', 'original_filename', 'file_size', 'content_type', 'uploaded_at')
        
    def validate_file(self, value):
        MAX_SIZE = 10 * 1024 * 1024 # 10MB
        if value.size > MAX_SIZE:
            raise serializers.ValidationError(f"File size exceeds {MAX_SIZE/1024/1024}MB.")
            
        ext = value.name.split('.')[-1].lower() if '.' in value.name else ''
        if ext not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(f"File extension '{ext}' is not allowed.")
            
        reported_mime = value.content_type
        if reported_mime not in ALLOWED_MIME_TYPES[ext]:
            raise serializers.ValidationError("File extension and content type mismatch.")
            
        if ext in ['png', 'jpg', 'jpeg', 'webp']:
            try:
                img = Image.open(value)
                img.verify()
                value.seek(0)
            except (UnidentifiedImageError, IOError):
                raise serializers.ValidationError("Invalid image data.")
                
        return value


class NoteVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteVersion
        fields = ('id', 'note', 'title', 'content', 'version_number', 'created_at')
        read_only_fields = ('id', 'note', 'title', 'content', 'version_number', 'created_at')


class NoteSerializer(serializers.ModelSerializer):
    notebook_id = serializers.UUIDField(source='notebook.id', read_only=True)
    notebook_name = serializers.CharField(source='notebook.name', read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    attachment_count = serializers.IntegerField(source='attachments.count', read_only=True)
    checklist_count = serializers.IntegerField(source='checklists.count', read_only=True)
    version_count = serializers.IntegerField(source='versions.count', read_only=True)

    class Meta:
        model = Note
        fields = (
            'id', 'notebook', 'notebook_id', 'notebook_name',
            'title', 'content', 'is_pinned', 'is_starred',
            'is_archived', 'is_deleted', 'deleted_at',
            'created_at', 'updated_at', 'tags', 'tag_ids',
            'is_study_material', 'difficulty', 'estimated_read_time', 'last_studied_at', 'study_status',
            'attachment_count', 'checklist_count', 'version_count'
        )
        read_only_fields = (
            'id', 'notebook_id', 'notebook_name',
            'is_pinned', 'is_starred', 'is_archived',
            'is_deleted', 'deleted_at', 'created_at', 'updated_at',
            'attachment_count', 'checklist_count', 'version_count'
        )
        extra_kwargs = {
            'notebook': {'write_only': True}
        }

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Note title cannot be blank.')
        return value

    def validate_notebook(self, notebook):
        request = self.context['request']
        if notebook.subject.semester.owner != request.user:
            raise serializers.ValidationError('You do not have access to this notebook.')
        return notebook
        
    def validate_tag_ids(self, tag_ids):
        request = self.context['request']
        valid_tags = Tag.objects.filter(id__in=tag_ids, user=request.user)
        if len(valid_tags) != len(tag_ids):
            raise serializers.ValidationError('One or more tags are invalid or unauthorized.')
        return tag_ids

    def validate(self, data):
        # We need to account for partial updates where is_study_material might not be in data,
        # but exists on the instance.
        is_study = data.get('is_study_material', self.instance.is_study_material if self.instance else False)
        study_status = data.get('study_status', self.instance.study_status if self.instance else None)
        
        if not is_study and study_status:
            data['study_status'] = None
            
        return data

    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        note = super().create(validated_data)
        if tag_ids:
            note.tags.set(tag_ids)
        return note

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        
        # Track version change
        old_title = instance.title
        old_content = instance.content
        
        note = super().update(instance, validated_data)
        
        if tag_ids is not None:
            note.tags.set(tag_ids)
            
        if old_title != note.title or old_content != note.content:
            last_version = NoteVersion.objects.filter(note=note).order_by('-version_number').first()
            v_num = (last_version.version_number + 1) if last_version else 1
            NoteVersion.objects.create(
                note=note,
                title=old_title,
                content=old_content,
                version_number=v_num
            )
            
        return note


class NoteMoveSerializer(serializers.Serializer):
    notebook = serializers.UUIDField()

    def validate_notebook(self, value):
        request = self.context['request']
        try:
            notebook = Notebook.objects.get(pk=value)
            if notebook.subject.semester.owner != request.user:
                raise serializers.ValidationError('You do not have access to this notebook.')
            return notebook
        except Notebook.DoesNotExist:
            raise serializers.ValidationError('Notebook not found.')

class NoteTagsActionSerializer(serializers.Serializer):
    tag_ids = serializers.ListField(
        child=serializers.UUIDField()
    )
    
    def validate_tag_ids(self, tag_ids):
        request = self.context['request']
        valid_tags = Tag.objects.filter(id__in=tag_ids, user=request.user)
        if len(valid_tags) != len(tag_ids):
            raise serializers.ValidationError('One or more tags are invalid or unauthorized.')
        return tag_ids
