from django.shortcuts import render
from django.http import JsonResponse
from rest_framework import viewsets
from .models import ExerciseSession, Exercise
from .serializers import ExerciseSessionSerializer, ExerciseSerializer, ExerciseSessionCreateSerializer

def test_api(request):
    return JsonResponse({"message": "Hello from Django!"})

class ExerciseSessionViewSet(viewsets.ModelViewSet):
    queryset = ExerciseSession.objects.all().order_by('-date')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExerciseSessionCreateSerializer
        return ExerciseSessionSerializer

class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer

# Create your views here.
