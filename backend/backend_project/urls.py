from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path


def root_message(request):
    return HttpResponse(
        "<h1>Pathfinder AI Backend</h1><p>The API is available under <code>/api/</code>.</p>"
    )


urlpatterns = [
    path("", root_message, name="root-message"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
