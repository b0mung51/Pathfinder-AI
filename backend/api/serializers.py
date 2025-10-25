from rest_framework import serializers


class PlaceholderSerializer(serializers.Serializer):
    """Example serializer to demonstrate wiring DRF into the project."""

    name = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
