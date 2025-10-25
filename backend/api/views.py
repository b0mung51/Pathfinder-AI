from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def healthcheck(_: object) -> Response:
    """Return a simple health payload for monitoring."""
    return Response({"status": "ok"}, status=status.HTTP_200_OK)


class PlaceholderViewSet(viewsets.ViewSet):
    """Simple viewset you can expand when wiring up real endpoints."""

    def list(self, request):
        return Response(
            {"message": "Replace this placeholder with your own implementation."}
        )
