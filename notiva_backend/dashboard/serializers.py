from rest_framework import serializers
from .models import Notification, Activity

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['recipient', 'sender', 'created_at']

class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = ['actor', 'created_at']
