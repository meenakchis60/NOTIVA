from rest_framework import serializers
from .models import StudySession, StudyGoal, Reminder
from notes.models import Note

class StudySessionSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    note_title = serializers.CharField(source='note.title', read_only=True)

    class Meta:
        model = StudySession
        fields = ('id', 'user', 'note', 'note_title', 'started_at', 'ended_at', 'duration_seconds', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'started_at', 'ended_at', 'duration_seconds', 'status', 'created_at', 'updated_at')

    def validate_note(self, note):
        if note and note.notebook.subject.semester.owner != self.context['request'].user:
            raise serializers.ValidationError("You do not have access to this note.")
        return note

class StudyGoalSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = StudyGoal
        fields = ('id', 'user', 'title', 'goal_type', 'target_value', 'current_value', 'start_date', 'end_date', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'status', 'created_at', 'updated_at')

    def validate(self, data):
        if data.get('end_date') and data.get('start_date') and data['end_date'] < data['start_date']:
            raise serializers.ValidationError("End date cannot be before start date.")
        if data.get('target_value') is not None and data['target_value'] <= 0:
            raise serializers.ValidationError("Target value must be positive.")
        return data

    def update(self, instance, validated_data):
        # Prevent manual update of current_value for auto-calculated goals
        if instance.goal_type in ['DAILY_STUDY_TIME', 'WEEKLY_STUDY_TIME', 'NOTES_COMPLETED']:
            validated_data.pop('current_value', None)
        else:
            # For CUSTOM goals, allow update but ensure it doesn't drop below 0
            current_value = validated_data.get('current_value')
            if current_value is not None and current_value < 0:
                raise serializers.ValidationError({"current_value": "Progress cannot be negative."})
        return super().update(instance, validated_data)

class ReminderSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    note_title = serializers.CharField(source='note.title', read_only=True)

    class Meta:
        model = Reminder
        fields = ('id', 'user', 'note', 'note_title', 'title', 'description', 'remind_at', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'status', 'created_at', 'updated_at')

    def validate_note(self, note):
        if note and note.notebook.subject.semester.owner != self.context['request'].user:
            raise serializers.ValidationError("You do not have access to this note.")
        return note
