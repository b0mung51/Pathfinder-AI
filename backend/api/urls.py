from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MatchInsightsView, MatchScoreView, PlaceholderViewSet, healthcheck

router = DefaultRouter()
router.register("placeholders", PlaceholderViewSet, basename="placeholder")

urlpatterns = [
    path("health/", healthcheck, name="healthcheck"),
    path("match-scores/", MatchScoreView.as_view(), name="match-scores"),
    path("match-insights/", MatchInsightsView.as_view(), name="match-insights"),
    path("", include(router.urls)),
]
