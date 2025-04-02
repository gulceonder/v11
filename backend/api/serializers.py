from rest_framework import serializers
from .models import ExerciseSession, Exercise

class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'type', 'sets', 'reps', 'weight', 'duration', 'distance', 'notes']

class ExerciseSessionSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)
    
    class Meta:
        model = ExerciseSession
        fields = ['id', 'name', 'date', 'duration', 'rating', 'notes', 'exercises']

class ExerciseSessionCreateSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True)
    
    class Meta:
        model = ExerciseSession
        fields = ['id', 'name', 'date', 'duration', 'rating', 'notes', 'exercises']
        
    def create(self, validated_data):
        exercises_data = validated_data.pop('exercises')
        session = ExerciseSession.objects.create(**validated_data)
        
        for exercise_data in exercises_data:
            Exercise.objects.create(session=session, **exercise_data)
            
        return session
        
    def update(self, instance, validated_data):
        exercises_data = validated_data.pop('exercises', None)
        
        # Update session fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if exercises_data is not None:
            # Remove existing exercises
            instance.exercises.all().delete()
            
            # Create new exercises
            for exercise_data in exercises_data:
                Exercise.objects.create(session=instance, **exercise_data)
                
        return instance 