"""
URL configuration for nexinvo project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse
from api.views import EmailTokenObtainPairView, register_view, send_otp_view, verify_otp_view, resend_otp_view

def api_root(request):
    return JsonResponse({
        'message': 'NexInvo API',
        'version': '1.0.0',
        'endpoints': {
            'register': '/api/register/',
            'login': '/api/token/',
            'refresh': '/api/token/refresh/',
            'admin': '/admin/',
        }
    })

urlpatterns = [
    path("", api_root),
    path("admin/", admin.site.urls),
    # Email OTP verification endpoints
    path("api/send-otp/", send_otp_view, name='send_otp'),
    path("api/verify-otp/", verify_otp_view, name='verify_otp'),
    path("api/resend-otp/", resend_otp_view, name='resend_otp'),
    # Registration endpoint (now requires email verification)
    path("api/register/", register_view, name='register'),
    path("api/token/", EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path("api/token/refresh/", TokenRefreshView.as_view(), name='token_refresh'),
    path("api/", include('api.urls')),
]
