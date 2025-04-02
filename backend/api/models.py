from django.db import models
import uuid

class ExerciseSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    date = models.DateField()
    duration = models.IntegerField(null=True, blank=True)  # Duration in seconds
    rating = models.IntegerField(null=True, blank=True)  
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.date}"

class Exercise(models.Model):
    EXERCISE_TYPES = [
        ('strength', 'Strength'),
        ('cardio', 'Cardio'),
        ('flexibility', 'Flexibility'),
        ('sprints', 'Sprints'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ExerciseSession, related_name='exercises', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=EXERCISE_TYPES)
    sets = models.IntegerField(null=True, blank=True)
    reps = models.IntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True)  # Duration in seconds
    distance = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
