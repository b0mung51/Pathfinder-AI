from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PlaceholderViewSet, healthcheck

router = DefaultRouter()
router.register("placeholders", PlaceholderViewSet, basename="placeholder")

urlpatterns = [
    path("health/", healthcheck, name="healthcheck"),
    path("", include(router.urls)),
]
