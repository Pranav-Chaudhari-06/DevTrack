from django.urls import path
from .views import BugAnalyzeView

urlpatterns = [
    path('analyze', BugAnalyzeView.as_view(), name='bug-analyze'),
]
