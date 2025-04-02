import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export type ExerciseType = "strength" | "cardio" | "flexibility" | "sprints"


export interface Exercise {
    id: string
    name: string
    type: ExerciseType
    sets?: Array<{
      id: string
      reps: number
      weight: number
      setCount: number // Number of sets with these exact reps/weight
    }>
    setCount?: number // For backward compatibility
    reps?: number // For backward compatibility
    weight?: number // For backward compatibility
    duration?: number // in seconds
    distance?: number // in meters
    sprints?: Array<{
      id: string
      distance: number
      duration: number
      repCount: number // Number of repetitions with these exact distance/duration
    }>
    notes?: string
  }
  
export interface ExerciseSession {
    id: string
    date: string
    name: string
    notes?: string
    duration?: number // Total session duration in seconds
    rating?: number // Session rating (1-5)
    feedback?: string // Session feedback
    exercises: Exercise[]
    planned?: boolean // Flag to indicate if this is a planned session
  }
  
export interface ExerciseTemplate {
    id: string
    name: string
    type: ExerciseType
    sets?: Array<{
      id: string
      reps: number
      weight: number
      setCount: number
    }>
    duration?: number
    distance?: number
    sprints?: Array<{
      id: string
      distance: number
      duration: number
      repCount: number
    }>
    notes?: string
  }

// API functions
export const exerciseApi = {
  // Get all sessions
  getSessions: async (): Promise<ExerciseSession[]> => {
    const response = await api.get('/sessions/');
    return response.data;
  },
  
  // Get a single session
  getSession: async (id: string): Promise<ExerciseSession> => {
    const response = await api.get(`/sessions/${id}/`);
    return response.data;
  },
  
  // Create a new session
  createSession: async (session: Omit<ExerciseSession, 'id'>): Promise<ExerciseSession> => {
    const response = await api.post('/sessions/', session);
    return response.data;
  },
  
  // Update a session
  updateSession: async (id: string, session: Partial<ExerciseSession>): Promise<ExerciseSession> => {
    const response = await api.put(`/sessions/${id}/`, session);
    return response.data;
  },
  
  // Delete a session
  deleteSession: async (id: string): Promise<void> => {
    await api.delete(`/sessions/${id}/`);
  },
  
  // Exercise-specific endpoints can be added here
  getExercises: async (): Promise<Exercise[]> => {
    const response = await api.get('/exercises/');
    return response.data;
  },
}; 