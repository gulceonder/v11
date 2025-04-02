"use client"

import { useState, useEffect, useCallback } from "react"
import { format, parseISO } from "date-fns"
import { Plus, X, Edit, Star, StarOff, Copy, Calendar, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ExerciseChart from "@/components/exercise-chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import MonthlyCalendar from "@/components/monthly-calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import ProgressSummary from "@/components/progress-summary"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/components/ui/use-toast"
import { exerciseApi, ExerciseType, ExerciseSession, Exercise, ExerciseTemplate } from "@/services/api"


export default function ExerciseTracker() {
  // State for sessions
  const [sessions, setSessions] = useState<ExerciseSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Fetch sessions from the API
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await exerciseApi.getSessions()
      setSessions(data)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
      setError("Failed to load your exercise sessions. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load your exercise sessions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])
  
  // Load data on component mount
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])
  
  // Create a new session
  const createSession = async (newSession: Omit<ExerciseSession, 'id'>) => {
    try {
      const created = await exerciseApi.createSession(newSession)
      setSessions(prev => [...prev, created])
      toast({
        title: "Success",
        description: "Exercise session created",
      })
      return created
    } catch (err) {
      console.error("Failed to create session:", err)
      toast({
        title: "Error",
        description: "Failed to create exercise session",
        variant: "destructive",
      })
      throw err
    }
  }
  
  // Update an existing session
  const updateSession = async (id: string, sessionData: Partial<ExerciseSession>) => {
    try {
      const updated = await exerciseApi.updateSession(id, sessionData)
      setSessions(prev => prev.map(session => 
        session.id === id ? updated : session
      ))
      toast({
        title: "Success",
        description: "Exercise session updated",
      })
      return updated
    } catch (err) {
      console.error("Failed to update session:", err)
      toast({
        title: "Error",
        description: "Failed to update exercise session",
        variant: "destructive",
      })
      throw err
    }
  }
  
  // Delete a session
  const deleteSession = async (id: string) => {
    try {
      await exerciseApi.deleteSession(id)
      setSessions(prev => prev.filter(session => session.id !== id))
      toast({
        title: "Success",
        description: "Exercise session deleted",
      })
    } catch (err) {
      console.error("Failed to delete session:", err)
      toast({
        title: "Error",
        description: "Failed to delete exercise session",
        variant: "destructive",
      })
      throw err
    }
  }

  // State for current session
  const [currentSession, setCurrentSession] = useState<ExerciseSession>({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    name: "",
    notes: "",
    exercises: [],
  })

  // State for planned sessions
  const [plannedSession, setPlannedSession] = useState<ExerciseSession>({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split("T")[0],
    name: "",
    notes: "",
    exercises: [],
    planned: true,
  })

  // State for exercise templates
  const [exerciseTemplates, setExerciseTemplates] = useState<ExerciseTemplate[]>([])

  // State for current exercise being added
  const [currentExercise, setCurrentExercise] = useState<Exercise>({
    id: crypto.randomUUID(),
    name: "",
    type: "strength",
  })

  // State for editing
  const [editingSession, setEditingSession] = useState<ExerciseSession | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("")

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedSessions = localStorage.getItem("exerciseSessions")
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions))
    }

    const savedTemplates = localStorage.getItem("exerciseTemplates")
    if (savedTemplates) {
      setExerciseTemplates(JSON.parse(savedTemplates))
    }
  }, [])

  // Save data to localStorage when sessions change
  useEffect(() => {
    localStorage.setItem("exerciseSessions", JSON.stringify(sessions))
  }, [sessions])

  // Save templates to localStorage when they change
  useEffect(() => {
    localStorage.setItem("exerciseTemplates", JSON.stringify(exerciseTemplates))
  }, [exerciseTemplates])

  // Calculate total session duration
  const calculateSessionDuration = (exercises: Exercise[]): number => {
    return exercises.reduce((total, exercise) => {
      if (exercise.type === "strength") {
        // Estimate strength exercise duration (e.g., 1 minute per set)
        if (exercise.sets && exercise.sets.length > 0) {
          return total + exercise.sets.reduce((setTotal, set) => setTotal + set.setCount * 60, 0)
        } else if (exercise.setCount) {
          // Backward compatibility
          return total + (exercise.setCount || 0) * 60
        }
        return total
      } else if (exercise.type === "sprints") {
        // For sprints, sum up all sprint durations
        if (exercise.sprints && exercise.sprints.length > 0) {
          return (
            total +
            exercise.sprints.reduce((sprintTotal, sprint) => sprintTotal + (sprint.duration * sprint.repCount || 0), 0)
          )
        } else if (exercise.duration && exercise.reps) {
          // Backward compatibility
          return total + (exercise.duration || 0) * (exercise.reps || 0)
        }
        return total
      } else {
        // For cardio and flexibility, use the duration directly
        return total + (exercise.duration || 0)
      }
    }, 0)
  }

  // Handle exercise type change
  const handleExerciseTypeChange = (type: ExerciseType, isEditing = false) => {
    const targetExercise = isEditing ? editingExercise : currentExercise

    if (type === "strength") {
      if (isEditing) {
        // Convert existing data to new format if needed
        let initialSets = []
        if (targetExercise?.sets && Array.isArray(targetExercise.sets)) {
          initialSets = targetExercise.sets
        } else if (targetExercise?.setCount && targetExercise?.reps && targetExercise?.weight) {
          // Create sets from legacy data
          initialSets = [
            {
              id: crypto.randomUUID(),
              reps: targetExercise.reps || 0,
              weight: targetExercise.weight || 0,
              setCount: targetExercise.setCount || 1,
            },
          ]
        } else {
          // Default sets
          initialSets = [{ id: crypto.randomUUID(), reps: 10, weight: 0, setCount: 3 }]
        }

        setEditingExercise({
          ...targetExercise!,
          type,
          sets: initialSets,
          setCount: undefined,
          reps: undefined,
          weight: undefined,
          duration: undefined,
          distance: undefined,
          sprints: undefined,
        })
      } else {
        setCurrentExercise({
          ...targetExercise!,
          type,
          sets: [{ id: crypto.randomUUID(), reps: 10, weight: 0, setCount: 3 }],
          setCount: undefined,
          reps: undefined,
          weight: undefined,
          duration: undefined,
          distance: undefined,
          sprints: undefined,
        })
      }
    } else if (type === "cardio") {
      if (isEditing) {
        setEditingExercise({
          ...targetExercise!,
          type,
          duration: targetExercise?.duration || 1800, // 30 minutes in seconds
          sets: undefined,
          reps: undefined,
          weight: undefined,
          distance: undefined,
          sprints: undefined,
        })
      } else {
        setCurrentExercise({
          ...targetExercise!,
          type,
          duration: targetExercise?.duration || 1800, // 30 minutes in seconds
          sets: undefined,
          reps: undefined,
          weight: undefined,
          distance: undefined,
          sprints: undefined,
        })
      }
    } else if (type === "flexibility") {
      if (isEditing) {
        setEditingExercise({
          ...targetExercise!,
          type,
          duration: targetExercise?.duration || 900, // 15 minutes in seconds
          sets: undefined,
          reps: undefined,
          weight: undefined,
          distance: undefined,
          sprints: undefined,
        })
      } else {
        setCurrentExercise({
          ...targetExercise!,
          type,
          duration: targetExercise?.duration || 900, // 15 minutes in seconds
          sets: undefined,
          reps: undefined,
          weight: undefined,
          distance: undefined,
          sprints: undefined,
        })
      }
    } else if (type === "sprints") {
      if (isEditing) {
        // Convert existing data to new format if needed
        let initialSprints = []
        if (targetExercise?.sprints && Array.isArray(targetExercise.sprints)) {
          initialSprints = targetExercise.sprints
        } else if (targetExercise?.reps && targetExercise?.distance && targetExercise?.duration) {
          // Create sprints from legacy data
          initialSprints = [
            {
              id: crypto.randomUUID(),
              distance: targetExercise.distance || 0,
              duration: targetExercise.duration || 0,
              repCount: targetExercise.reps || 1,
            },
          ]
        } else {
          // Default sprints
          initialSprints = [{ id: crypto.randomUUID(), distance: 100, duration: 15, repCount: 5 }]
        }

        setEditingExercise({
          ...targetExercise!,
          type,
          sprints: initialSprints,
          reps: undefined,
          distance: undefined,
          duration: undefined,
          sets: undefined,
          setCount: undefined,
          weight: undefined,
        })
      } else {
        setCurrentExercise({
          ...targetExercise!,
          type,
          sprints: [{ id: crypto.randomUUID(), distance: 100, duration: 15, repCount: 5 }],
          reps: undefined,
          distance: undefined,
          duration: undefined,
          sets: undefined,
          setCount: undefined,
          weight: undefined,
        })
      }
    }
  }

  // Add exercise to current session
  const addExerciseToSession = (isPlanned = false) => {
    if (!currentExercise.name) return

    const targetSession = isPlanned ? plannedSession : currentSession
    const setTargetSession = isPlanned ? setPlannedSession : setCurrentSession

    const newExercises = [...targetSession.exercises, { ...currentExercise, id: crypto.randomUUID() }]
    const sessionDuration = calculateSessionDuration(newExercises)

    setTargetSession({
      ...targetSession,
      exercises: newExercises,
      duration: sessionDuration,
    })

    // Reset current exercise
    setCurrentExercise({
      id: crypto.randomUUID(),
      name: "",
      type: "strength",
    })
  }

  // Remove exercise from current session
  const removeExerciseFromSession = (id: string, isPlanned = false) => {
    const targetSession = isPlanned ? plannedSession : currentSession
    const setTargetSession = isPlanned ? setPlannedSession : setCurrentSession

    const newExercises = targetSession.exercises.filter((exercise) => exercise.id !== id)
    const sessionDuration = calculateSessionDuration(newExercises)

    setTargetSession({
      ...targetSession,
      exercises: newExercises,
      duration: sessionDuration,
    })
  }

  // Save current session
  const saveSession = (isPlanned = false) => {
    const targetSession = isPlanned ? plannedSession : currentSession

    if (!targetSession.name || targetSession.exercises.length === 0) return

    const sessionDuration = calculateSessionDuration(targetSession.exercises)

    const newSession = {
      ...targetSession,
      date: targetSession.date || new Date().toISOString().split("T")[0],
      duration: sessionDuration,
      rating: targetSession.rating || 0,
      feedback: targetSession.feedback || "",
      planned: isPlanned,
    }

    setSessions([...sessions, newSession])

    // Reset current session
    if (isPlanned) {
      setPlannedSession({
        id: crypto.randomUUID(),
        date: new Date().toISOString().split("T")[0],
        name: "",
        notes: "",
        exercises: [],
        planned: true,
      })
    } else {
      setCurrentSession({
        id: crypto.randomUUID(),
        date: new Date().toISOString().split("T")[0],
        name: "",
        notes: "",
        exercises: [],
      })
    }
  }

  // Convert planned session to completed session
  const convertPlannedToCompleted = (sessionId: string) => {
    const updatedSessions = sessions.map((session) => {
      if (session.id === sessionId && session.planned) {
        return {
          ...session,
          planned: false,
          date: new Date().toISOString().split("T")[0], // Set to today
        }
      }
      return session
    })

    setSessions(updatedSessions)
  }

  // Start editing a session
  const startEditingSession = (session: ExerciseSession) => {
    setEditingSession({ ...session })
  }

  // Save edited session
  const saveEditedSession = () => {
    if (!editingSession) return

    // Recalculate duration based on exercises
    const sessionDuration = calculateSessionDuration(editingSession.exercises)
    const updatedSession = {
      ...editingSession,
      duration: sessionDuration,
    }

    const updatedSessions = sessions.map((session) => (session.id === updatedSession.id ? updatedSession : session))

    setSessions(updatedSessions)
    setEditingSession(null)
  }

  // Start editing an exercise
  const startEditingExercise = (exercise: Exercise, sessionId: string) => {
    setEditingExercise({ ...exercise })

    // Convert duration from seconds to minutes and seconds for UI
    if (exercise.duration) {
      const minutes = Math.floor(exercise.duration / 60)
      const seconds = exercise.duration % 60

      // Store these in a temporary state for the UI
      setEditingExercise(
        (prev) =>
          ({
            ...prev!,
            durationMinutes: minutes,
            durationSeconds: seconds,
          }) as any,
      )
    }
  }

  // Save edited exercise
  const saveEditedExercise = (sessionId: string) => {
    if (!editingExercise) return

    // Calculate total duration in seconds
    let totalDuration: number | undefined = undefined
    if (
      editingExercise.type === "cardio" ||
      editingExercise.type === "flexibility" ||
      editingExercise.type === "sprints"
    ) {
      const minutes = (editingExercise as any).durationMinutes || 0
      const seconds = (editingExercise as any).durationSeconds || 0
      totalDuration = minutes * 60 + seconds
    }

    // Create the updated exercise without the temporary UI fields
    const { durationMinutes, durationSeconds, ...cleanExercise } = editingExercise as any
    const updatedExercise = {
      ...cleanExercise,
      duration: totalDuration,
    }

    // Update the exercise in the session
    const updatedSessions = sessions.map((session) => {
      if (session.id === sessionId) {
        const updatedExercises = session.exercises.map((ex) => (ex.id === updatedExercise.id ? updatedExercise : ex))

        // Recalculate session duration
        const sessionDuration = calculateSessionDuration(updatedExercises)

        return {
          ...session,
          exercises: updatedExercises,
          duration: sessionDuration,
        }
      }
      return session
    })

    setSessions(updatedSessions)
    setEditingExercise(null)
  }



  // Delete an exercise from a session
  const deleteExerciseFromSession = (sessionId: string, exerciseId: string) => {
    const updatedSessions = sessions.map((session) => {
      if (session.id === sessionId) {
        const updatedExercises = session.exercises.filter((ex) => ex.id !== exerciseId)
        const sessionDuration = calculateSessionDuration(updatedExercises)

        return {
          ...session,
          exercises: updatedExercises,
          duration: sessionDuration,
        }
      }
      return session
    })

    setSessions(updatedSessions)
  }

  // Set session rating
  const setSessionRating = (sessionId: string, rating: number) => {
    const updatedSessions = sessions.map((session) => {
      if (session.id === sessionId) {
        return {
          ...session,
          rating,
        }
      }
      return session
    })

    setSessions(updatedSessions)
  }

  // Save exercise as template
  const saveExerciseAsTemplate = (exercise: Exercise) => {
    const template: ExerciseTemplate = {
      id: crypto.randomUUID(),
      name: exercise.name,
      type: exercise.type,
      sets: exercise.sets,
      duration: exercise.duration,
      distance: exercise.distance,
      sprints: exercise.sprints,
      notes: exercise.notes,
    }

    setExerciseTemplates([...exerciseTemplates, template])
  }

  // Use template for current exercise
  const useTemplate = useCallback(
    (template: ExerciseTemplate, isPlanned = false) => {
      const exercise: Exercise = {
        id: crypto.randomUUID(),
        name: template.name,
        type: template.type,
        sets: template.sets,
        duration: template.duration,
        distance: template.distance,
        sprints: template.sprints,
        notes: template.notes,
      }

      const targetSession = isPlanned ? plannedSession : currentSession
      const setTargetSession = isPlanned ? setPlannedSession : setCurrentSession

      const newExercises = [...targetSession.exercises, exercise]
      const sessionDuration = calculateSessionDuration(newExercises)

      setTargetSession({
        ...targetSession,
        exercises: newExercises,
        duration: sessionDuration,
      })
    },
    [currentSession, plannedSession, setCurrentSession, setPlannedSession],
  )

  // Delete template
  const deleteTemplate = (templateId: string) => {
    setExerciseTemplates(exerciseTemplates.filter((template) => template.id !== templateId))
  }

  // Get unique exercise names for the chart selector
  const uniqueExerciseNames = Array.from(
    new Set(sessions.flatMap((session) => session.exercises.map((exercise) => exercise.name))),
  )

  // Format duration for display
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0m 0s"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Render star rating
  const renderRating = (rating = 0, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange && onRatingChange(star)}
            className={`${onRatingChange ? "cursor-pointer" : "cursor-default"} text-lg p-0.5`}
          >
            {star <= rating ? (
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    )
  }

  // Get completed and planned sessions
  const completedSessions = sessions.filter((session) => !session.planned)
  const plannedSessions = sessions.filter((session) => session.planned)

  return (
    <Tabs defaultValue="log" className="w-full">
      <TabsList className="grid w-full grid-cols-6 mb-6">
        <TabsTrigger value="log">Log Exercise</TabsTrigger>
        <TabsTrigger value="plan">Plan Session</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="progress" id="progress-tab">
          Progress
        </TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
      </TabsList>

      {/* Log Exercise Tab */}
      <TabsContent value="log" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session-name">Session Name</Label>
                <Input
                  id="session-name"
                  placeholder="Morning Workout, Leg Day, etc."
                  value={currentSession.name}
                  onChange={(e) => setCurrentSession({ ...currentSession, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="session-date">Date</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={currentSession.date}
                  onChange={(e) => setCurrentSession({ ...currentSession, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="session-notes">Session Notes (optional)</Label>
              <Textarea
                id="session-notes"
                placeholder="How you felt, overall performance, etc."
                value={currentSession.notes || ""}
                onChange={(e) => setCurrentSession({ ...currentSession, notes: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exercise-name">Exercise Name</Label>
                <Input
                  id="exercise-name"
                  placeholder="Bench Press, Squats, Running, etc."
                  value={currentExercise.name}
                  onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="exercise-type">Exercise Type</Label>
                <Select
                  value={currentExercise.type}
                  onValueChange={(value) => handleExerciseTypeChange(value as ExerciseType)}
                >
                  <SelectTrigger id="exercise-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="sprints">Sprints</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currentExercise.type === "strength" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Sets</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentExercise({
                        ...currentExercise,
                        sets: [
                          ...(currentExercise.sets || []),
                          { id: crypto.randomUUID(), reps: 10, weight: 0, setCount: 1 },
                        ],
                      })
                    }}
                  >
                    Add Set Type
                  </Button>
                </div>

                {currentExercise.sets &&
                  currentExercise.sets.map((set, index) => (
                    <div key={set.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Label htmlFor={`set-${index}-count`}>Sets</Label>
                        <Input
                          id={`set-${index}-count`}
                          type="number"
                          min="1"
                          value={set.setCount}
                          onChange={(e) => {
                            const updatedSets = [...(currentExercise.sets || [])]
                            updatedSets[index] = {
                              ...updatedSets[index],
                              setCount: Number.parseInt(e.target.value) || 1,
                            }
                            setCurrentExercise({
                              ...currentExercise,
                              sets: updatedSets,
                            })
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <Label htmlFor={`set-${index}-reps`}>Reps</Label>
                        <Input
                          id={`set-${index}-reps`}
                          type="number"
                          min="1"
                          value={set.reps}
                          onChange={(e) => {
                            const updatedSets = [...(currentExercise.sets || [])]
                            updatedSets[index] = {
                              ...updatedSets[index],
                              reps: Number.parseInt(e.target.value) || 0,
                            }
                            setCurrentExercise({
                              ...currentExercise,
                              sets: updatedSets,
                            })
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <Label htmlFor={`set-${index}-weight`}>Weight (kg)</Label>
                        <Input
                          id={`set-${index}-weight`}
                          type="number"
                          min="0"
                          step="0.5"
                          value={set.weight}
                          onChange={(e) => {
                            const updatedSets = [...(currentExercise.sets || [])]
                            updatedSets[index] = {
                              ...updatedSets[index],
                              weight: Number.parseFloat(e.target.value) || 0,
                            }
                            setCurrentExercise({
                              ...currentExercise,
                              sets: updatedSets,
                            })
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="opacity-0">Remove</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updatedSets = [...(currentExercise.sets || [])]
                            updatedSets.splice(index, 1)
                            setCurrentExercise({
                              ...currentExercise,
                              sets: updatedSets,
                            })
                          }}
                          disabled={currentExercise.sets?.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {(currentExercise.type === "cardio" || currentExercise.type === "flexibility") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exercise-duration-min">Duration (minutes)</Label>
                  <Input
                    id="exercise-duration-min"
                    type="number"
                    min="0"
                    value={(currentExercise as any).durationMinutes || Math.floor((currentExercise.duration || 0) / 60)}
                    onChange={(e) =>
                      setCurrentExercise({
                        ...currentExercise,
                        durationMinutes: Number.parseInt(e.target.value) || 0,
                        duration:
                          (Number.parseInt(e.target.value) || 0) * 60 + ((currentExercise as any).durationSeconds || 0),
                      } as any)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="exercise-duration-sec">Seconds</Label>
                  <Input
                    id="exercise-duration-sec"
                    type="number"
                    min="0"
                    max="59"
                    value={(currentExercise as any).durationSeconds || (currentExercise.duration || 0) % 60}
                    onChange={(e) =>
                      setCurrentExercise({
                        ...currentExercise,
                        durationSeconds: Number.parseInt(e.target.value) || 0,
                        duration:
                          ((currentExercise as any).durationMinutes || 0) * 60 + (Number.parseInt(e.target.value) || 0),
                      } as any)
                    }
                  />
                </div>
              </div>
            )}

            {currentExercise.type === "sprints" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Sprints</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentExercise({
                        ...currentExercise,
                        sprints: [
                          ...(currentExercise.sprints || []),
                          { id: crypto.randomUUID(), distance: 100, duration: 15, repCount: 1 },
                        ],
                      })
                    }}
                  >
                    Add Sprint Type
                  </Button>
                </div>

                {currentExercise.sprints &&
                  currentExercise.sprints.map((sprint, index) => (
                    <div key={sprint.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Label htmlFor={`sprint-${index}-count`}>Reps</Label>
                        <Input
                          id={`sprint-${index}-count`}
                          type="number"
                          min="1"
                          value={sprint.repCount}
                          onChange={(e) => {
                            const updatedSprints = [...(currentExercise.sprints || [])]
                            updatedSprints[index] = {
                              ...updatedSprints[index],
                              repCount: Number.parseInt(e.target.value) || 1,
                            }
                            setCurrentExercise({
                              ...currentExercise,
                              sprints: updatedSprints,
                            })
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label htmlFor={`sprint-${index}-distance`}>Distance (m)</Label>
                        <Input
                          id={`sprint-${index}-distance`}
                          type="number"
                          min="1"
                          value={sprint.distance}
                          onChange={(e) => {
                            const updatedSprints = [...(currentExercise.sprints || [])]
                            updatedSprints[index] = {
                              ...updatedSprints[index],
                              distance: Number.parseInt(e.target.value) || 0,
                            }
                            setCurrentExercise({
                              ...currentExercise,
                              sprints: updatedSprints,
                            })
                          }}
                        />
                      </div>
                      <div className="col-span-6 grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`sprint-${index}-min`}>Minutes</Label>
                          <Input
                            id={`sprint-${index}-min`}
                            type="number"
                            min="0"
                            value={Math.floor((sprint.duration || 0) / 60)}
                            onChange={(e) => {
                              const minutes = Number.parseInt(e.target.value) || 0
                              const seconds = (sprint.duration || 0) % 60
                              const totalDuration = minutes * 60 + seconds

                              const updatedSprints = [...(currentExercise.sprints || [])]
                              updatedSprints[index] = {
                                ...updatedSprints[index],
                                duration: totalDuration,
                              }
                              setCurrentExercise({
                                ...currentExercise,
                                sprints: updatedSprints,
                              })
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`sprint-${index}-sec`}>Seconds</Label>
                          <Input
                            id={`sprint-${index}-sec`}
                            type="number"
                            min="0"
                            max="59"
                            value={(sprint.duration || 0) % 60}
                            onChange={(e) => {
                              const seconds = Number.parseInt(e.target.value) || 0
                              const minutes = Math.floor((sprint.duration || 0) / 60)
                              const totalDuration = minutes * 60 + seconds

                              const updatedSprints = [...(currentExercise.sprints || [])]
                              updatedSprints[index] = {
                                ...updatedSprints[index],
                                duration: totalDuration,
                              }
                              setCurrentExercise({
                                ...currentExercise,
                                sprints: updatedSprints,
                              })
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Label className="opacity-0">Remove</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updatedSprints = [...(currentExercise.sprints || [])]
                            updatedSprints.splice(index, 1)
                            setCurrentExercise({
                              ...currentExercise,
                              sprints: updatedSprints,
                            })
                          }}
                          disabled={currentExercise.sprints?.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div>
              <Label htmlFor="exercise-notes">Notes (optional)</Label>
              <Input
                id="exercise-notes"
                placeholder="Any additional details"
                value={currentExercise.notes || ""}
                onChange={(e) => setCurrentExercise({ ...currentExercise, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => addExerciseToSession(false)} className="flex-1">
                <Plus className="mr-2 h-4 w-4" /> Add Exercise
              </Button>

              {currentExercise.name && (
                <Button
                  variant="outline"
                  onClick={() => saveExerciseAsTemplate(currentExercise)}
                  title="Save as template"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>

            {exerciseTemplates.length > 0 && (
              <div className="mt-4">
                <Accordion type="single" collapsible>
                  <AccordionItem value="templates">
                    <AccordionTrigger>Exercise Templates</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {exerciseTemplates.map((template) => (
                          <div key={template.id} className="flex items-center justify-between border rounded-md p-2">
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">{template.type}</div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => useTemplate(template)}
                                title="Use template"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTemplate(template.id)}
                                title="Delete template"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>

        {currentSession.exercises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Current Session Exercises</CardTitle>
              {currentSession.duration && (
                <CardDescription>Total Duration: {formatDuration(currentSession.duration)}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {currentSession.exercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="outline">{exercise.type}</Badge>
                          {exercise.type === "strength" && (
                            <span className="ml-2">
                              {exercise.sets && exercise.sets.length > 0
                                ? exercise.sets
                                    .map((set, idx) => `${set.setCount}×${set.reps}@${set.weight}kg`)
                                    .join(", ")
                                : `${exercise.setCount} sets × ${exercise.reps} reps @ ${exercise.weight}kg`}
                            </span>
                          )}
                          {(exercise.type === "cardio" || exercise.type === "flexibility") && (
                            <span className="ml-2">{formatDuration(exercise.duration)}</span>
                          )}
                          {exercise.type === "sprints" && (
                            <span className="ml-2">
                              {exercise.sprints && exercise.sprints.length > 0
                                ? exercise.sprints
                                    .map(
                                      (sprint, idx) =>
                                        `${sprint.repCount}×${sprint.distance}m@${formatDuration(sprint.duration)}`,
                                    )
                                    .join(", ")
                                : `${exercise.reps} × ${exercise.distance}m @ ${formatDuration(exercise.duration)} per sprint`}
                            </span>
                          )}
                        </div>
                        {exercise.notes && <div className="text-sm mt-1">{exercise.notes}</div>}
                      </div>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveExerciseAsTemplate(exercise)}
                          title="Save as template"
                          className="mr-1"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExerciseFromSession(exercise.id)}
                          title="Remove exercise"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="session-rating">Session Rating</Label>
                  <div className="mt-2">
                    {renderRating(currentSession.rating || 0, (rating) =>
                      setCurrentSession({ ...currentSession, rating }),
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="session-feedback">Session Feedback (optional)</Label>
                  <Textarea
                    id="session-feedback"
                    placeholder="How did this workout feel? What would you improve next time?"
                    value={currentSession.feedback || ""}
                    onChange={(e) => setCurrentSession({ ...currentSession, feedback: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                <Button
                  onClick={() => saveSession(false)}
                  className="w-full"
                  disabled={!currentSession.name || currentSession.exercises.length === 0}
                >
                  Save Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Plan Session Tab */}
      <TabsContent value="plan" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plan Future Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="planned-session-name">Session Name</Label>
                <Input
                  id="planned-session-name"
                  placeholder="Morning Workout, Leg Day, etc."
                  value={plannedSession.name}
                  onChange={(e) => setPlannedSession({ ...plannedSession, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="planned-session-date">Planned Date</Label>
                <Input
                  id="planned-session-date"
                  type="date"
                  value={plannedSession.date}
                  onChange={(e) => setPlannedSession({ ...plannedSession, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="planned-session-notes">Session Notes (optional)</Label>
              <Textarea
                id="planned-session-notes"
                placeholder="Goals, focus areas, etc."
                value={plannedSession.notes || ""}
                onChange={(e) => setPlannedSession({ ...plannedSession, notes: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Exercises to Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {exerciseTemplates.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Exercise Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exerciseTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between border rounded-md p-2">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.type}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => useTemplate(template, true)} title="Add to plan">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <div className="text-sm text-muted-foreground">or</div>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground mb-4">
                No exercise templates yet. Save exercises as templates from the Log Exercise tab.
              </div>
            )}

            <div className="space-y-4 mt-4">
              <h3 className="text-sm font-medium">Create New Exercise</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="planned-exercise-name">Exercise Name</Label>
                  <Input
                    id="planned-exercise-name"
                    placeholder="Bench Press, Squats, Running, etc."
                    value={currentExercise.name}
                    onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="planned-exercise-type">Exercise Type</Label>
                  <Select
                    value={currentExercise.type}
                    onValueChange={(value) => handleExerciseTypeChange(value as ExerciseType)}
                  >
                    <SelectTrigger id="planned-exercise-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="flexibility">Flexibility</SelectItem>
                      <SelectItem value="sprints">Sprints</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Exercise type specific inputs - same as in Log Exercise tab */}
              {/* Strength */}
              {currentExercise.type === "strength" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Sets</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentExercise({
                          ...currentExercise,
                          sets: [
                            ...(currentExercise.sets || []),
                            { id: crypto.randomUUID(), reps: 10, weight: 0, setCount: 1 },
                          ],
                        })
                      }}
                    >
                      Add Set Type
                    </Button>
                  </div>

                  {currentExercise.sets &&
                    currentExercise.sets.map((set, index) => (
                      <div key={set.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2">
                          <Label htmlFor={`planned-set-${index}-count`}>Sets</Label>
                          <Input
                            id={`planned-set-${index}-count`}
                            type="number"
                            min="1"
                            value={set.setCount}
                            onChange={(e) => {
                              const updatedSets = [...(currentExercise.sets || [])]
                              updatedSets[index] = {
                                ...updatedSets[index],
                                setCount: Number.parseInt(e.target.value) || 1,
                              }
                              setCurrentExercise({
                                ...currentExercise,
                                sets: updatedSets,
                              })
                            }}
                          />
                        </div>
                        <div className="col-span-4">
                          <Label htmlFor={`planned-set-${index}-reps`}>Reps</Label>
                          <Input
                            id={`planned-set-${index}-reps`}
                            type="number"
                            min="1"
                            value={set.reps}
                            onChange={(e) => {
                              const updatedSets = [...(currentExercise.sets || [])]
                              updatedSets[index] = {
                                ...updatedSets[index],
                                reps: Number.parseInt(e.target.value) || 0,
                              }
                              setCurrentExercise({
                                ...currentExercise,
                                sets: updatedSets,
                              })
                            }}
                          />
                        </div>
                        <div className="col-span-4">
                          <Label htmlFor={`planned-set-${index}-weight`}>Weight (kg)</Label>
                          <Input
                            id={`planned-set-${index}-weight`}
                            type="number"
                            min="0"
                            step="0.5"
                            value={set.weight}
                            onChange={(e) => {
                              const updatedSets = [...(currentExercise.sets || [])]
                              updatedSets[index] = {
                                ...updatedSets[index],
                                weight: Number.parseFloat(e.target.value) || 0,
                              }
                              setCurrentExercise({
                                ...currentExercise,
                                sets: updatedSets,
                              })
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="opacity-0">Remove</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updatedSets = [...(currentExercise.sets || [])]
                              updatedSets.splice(index, 1)
                              setCurrentExercise({
                                ...currentExercise,
                                sets: updatedSets,
                              })
                            }}
                            disabled={currentExercise.sets?.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Cardio and Flexibility */}
              {(currentExercise.type === "cardio" || currentExercise.type === "flexibility") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="planned-exercise-duration-min">Duration (minutes)</Label>
                    <Input
                      id="planned-exercise-duration-min"
                      type="number"
                      min="0"
                      value={
                        (currentExercise as any).durationMinutes || Math.floor((currentExercise.duration || 0) / 60)
                      }
                      onChange={(e) =>
                        setCurrentExercise({
                          ...currentExercise,
                          durationMinutes: Number.parseInt(e.target.value) || 0,
                          duration:
                            (Number.parseInt(e.target.value) || 0) * 60 +
                            ((currentExercise as any).durationSeconds || 0),
                        } as any)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="planned-exercise-duration-sec">Seconds</Label>
                    <Input
                      id="planned-exercise-duration-sec"
                      type="number"
                      min="0"
                      max="59"
                      value={(currentExercise as any).durationSeconds || (currentExercise.duration || 0) % 60}
                      onChange={(e) =>
                        setCurrentExercise({
                          ...currentExercise,
                          durationSeconds: Number.parseInt(e.target.value) || 0,
                          duration:
                            ((currentExercise as any).durationMinutes || 0) * 60 +
                            (Number.parseInt(e.target.value) || 0),
                        } as any)
                      }
                    />
                  </div>
                </div>
              )}

              {/* Sprints */}
              {currentExercise.type === "sprints" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Sprints</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentExercise({
                          ...currentExercise,
                          sprints: [
                            ...(currentExercise.sprints || []),
                            { id: crypto.randomUUID(), distance: 100, duration: 15, repCount: 1 },
                          ],
                        })
                      }}
                    >
                      Add Sprint Type
                    </Button>
                  </div>

                  {currentExercise.sprints &&
                    currentExercise.sprints.map((sprint, index) => (
                      <div key={sprint.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2">
                          <Label htmlFor={`planned-sprint-${index}-count`}>Reps</Label>
                          <Input
                            id={`planned-sprint-${index}-count`}
                            type="number"
                            min="1"
                            value={sprint.repCount}
                            onChange={(e) => {
                              const updatedSprints = [...(currentExercise.sprints || [])]
                              updatedSprints[index] = {
                                ...updatedSprints[index],
                                repCount: Number.parseInt(e.target.value) || 1,
                              }
                              setCurrentExercise({
                                ...currentExercise,
                                sprints: updatedSprints,
                              })
                            }}
                          />
                        </div>
                        <div className="col-span-3">
                          <Label htmlFor={`planned-sprint-${index}-distance`}>Distance (m)</Label>
                          <Input
                            id={`planned-sprint-${index}-distance`}
                            type="number"
                            min="1"
                            value={sprint.distance}
                            onChange={(e) => {
                              const updatedSprints = [...(currentExercise.sprints || [])]
                              updatedSprints[index] = {
                                ...updatedSprints[index],
                                distance: Number.parseInt(e.target.value) || 0,
                              }
                              setCurrentExercise({
                                ...currentExercise,
                                sprints: updatedSprints,
                              })
                            }}
                          />
                        </div>
                        <div className="col-span-6 grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`planned-sprint-${index}-min`}>Minutes</Label>
                            <Input
                              id={`planned-sprint-${index}-min`}
                              type="number"
                              min="0"
                              value={Math.floor((sprint.duration || 0) / 60)}
                              onChange={(e) => {
                                const minutes = Number.parseInt(e.target.value) || 0
                                const seconds = (sprint.duration || 0) % 60
                                const totalDuration = minutes * 60 + seconds

                                const updatedSprints = [...(currentExercise.sprints || [])]
                                updatedSprints[index] = {
                                  ...updatedSprints[index],
                                  duration: totalDuration,
                                }
                                setCurrentExercise({
                                  ...currentExercise,
                                  sprints: updatedSprints,
                                })
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`planned-sprint-${index}-sec`}>Seconds</Label>
                            <Input
                              id={`planned-sprint-${index}-sec`}
                              type="number"
                              min="0"
                              max="59"
                              value={(sprint.duration || 0) % 60}
                              onChange={(e) => {
                                const seconds = Number.parseInt(e.target.value) || 0
                                const minutes = Math.floor((sprint.duration || 0) / 60)
                                const totalDuration = minutes * 60 + seconds

                                const updatedSprints = [...(currentExercise.sprints || [])]
                                updatedSprints[index] = {
                                  ...updatedSprints[index],
                                  duration: totalDuration,
                                }
                                setCurrentExercise({
                                  ...currentExercise,
                                  sprints: updatedSprints,
                                })
                              }}
                            />
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Label className="opacity-0">Remove</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updatedSprints = [...(currentExercise.sprints || [])]
                              updatedSprints.splice(index, 1)
                              setCurrentExercise({
                                ...currentExercise,
                                sprints: updatedSprints,
                              })
                            }}
                            disabled={currentExercise.sprints?.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div>
                <Label htmlFor="planned-exercise-notes">Notes (optional)</Label>
                <Input
                  id="planned-exercise-notes"
                  placeholder="Any additional details"
                  value={currentExercise.notes || ""}
                  onChange={(e) => setCurrentExercise({ ...currentExercise, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => addExerciseToSession(true)} className="flex-1">
                  <Plus className="mr-2 h-4 w-4" /> Add to Plan
                </Button>

                {currentExercise.name && (
                  <Button
                    variant="outline"
                    onClick={() => saveExerciseAsTemplate(currentExercise)}
                    title="Save as template"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {plannedSession.exercises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Planned Exercises</CardTitle>
              {plannedSession.duration && (
                <CardDescription>Estimated Duration: {formatDuration(plannedSession.duration)}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {plannedSession.exercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="outline">{exercise.type}</Badge>
                          {exercise.type === "strength" && (
                            <span className="ml-2">
                              {exercise.sets && exercise.sets.length > 0
                                ? exercise.sets
                                    .map((set, idx) => `${set.setCount}×${set.reps}@${set.weight}kg`)
                                    .join(", ")
                                : `${exercise.setCount} sets × ${exercise.reps} reps @ ${exercise.weight}kg`}
                            </span>
                          )}
                          {(exercise.type === "cardio" || exercise.type === "flexibility") && (
                            <span className="ml-2">{formatDuration(exercise.duration)}</span>
                          )}
                          {exercise.type === "sprints" && (
                            <span className="ml-2">
                              {exercise.sprints && exercise.sprints.length > 0
                                ? exercise.sprints
                                    .map(
                                      (sprint, idx) =>
                                        `${sprint.repCount}×${sprint.distance}m@${formatDuration(sprint.duration)}`,
                                    )
                                    .join(", ")
                                : `${exercise.reps} × ${exercise.distance}m @ ${formatDuration(exercise.duration)} per sprint`}
                            </span>
                          )}
                        </div>
                        {exercise.notes && <div className="text-sm mt-1">{exercise.notes}</div>}
                      </div>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveExerciseAsTemplate(exercise)}
                          title="Save as template"
                          className="mr-1"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExerciseFromSession(exercise.id, true)}
                          title="Remove exercise"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4">
                <Button
                  onClick={() => saveSession(true)}
                  className="w-full"
                  disabled={!plannedSession.name || plannedSession.exercises.length === 0}
                >
                  <Calendar className="mr-2 h-4 w-4" /> Save Planned Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Exercise History</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">Completed</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Planned
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No exercise sessions recorded yet.</div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {[...sessions].reverse().map((session) => (
                    <Card key={session.id} className={session.planned ? "border-blue-200 bg-blue-50" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-lg flex items-center">
                              {session.name}
                              {session.planned && (
                                <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                                  Planned
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="text-sm text-muted-foreground">
                                {format(parseISO(session.date), "PPP")}
                              </div>
                              {session.duration && (
                                <Badge variant="secondary">
                                  {session.planned ? "Est. Duration: " : "Duration: "}
                                  {formatDuration(session.duration)}
                                </Badge>
                              )}
                              {!session.planned && session.rating > 0 && (
                                <div className="flex items-center">{renderRating(session.rating)}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex">
                            {session.planned && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => convertPlannedToCompleted(session.id)}
                                title="Mark as completed"
                                className="mr-1"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => startEditingSession(session)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Session</DialogTitle>
                                </DialogHeader>
                                {editingSession && (
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="edit-session-name">Session Name</Label>
                                        <Input
                                          id="edit-session-name"
                                          value={editingSession.name}
                                          onChange={(e) =>
                                            setEditingSession({ ...editingSession, name: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="edit-session-date">Date</Label>
                                        <Input
                                          id="edit-session-date"
                                          type="date"
                                          value={editingSession.date}
                                          onChange={(e) =>
                                            setEditingSession({ ...editingSession, date: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor="edit-session-notes">Session Notes</Label>
                                      <Textarea
                                        id="edit-session-notes"
                                        value={editingSession.notes || ""}
                                        onChange={(e) =>
                                          setEditingSession({ ...editingSession, notes: e.target.value })
                                        }
                                      />
                                    </div>
                                    {!editingSession.planned && (
                                      <>
                                        <div>
                                          <Label htmlFor="edit-session-rating">Session Rating</Label>
                                          <div className="mt-2">
                                            {renderRating(editingSession.rating || 0, (rating) =>
                                              setEditingSession({ ...editingSession, rating }),
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-session-feedback">Session Feedback</Label>
                                          <Textarea
                                            id="edit-session-feedback"
                                            value={editingSession.feedback || ""}
                                            onChange={(e) =>
                                              setEditingSession({ ...editingSession, feedback: e.target.value })
                                            }
                                            className="min-h-[80px]"
                                          />
                                        </div>
                                      </>
                                    )}
                                    <div className="flex justify-between">
                                      <Button variant="destructive" onClick={() => deleteSession(session.id)}>
                                        Delete Session
                                      </Button>
                                      <Button onClick={saveEditedSession}>Save Changes</Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        {session.notes && <div className="text-sm text-muted-foreground mt-2">{session.notes}</div>}
                        {session.feedback && (
                          <div className="text-sm mt-2 p-2 bg-muted rounded-md">
                            <div className="font-medium mb-1">Feedback:</div>
                            {session.feedback}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {session.exercises.map((exercise) => (
                            <div key={exercise.id} className="p-2 border rounded-md">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{exercise.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    <Badge variant="outline">{exercise.type}</Badge>
                                    {exercise.type === "strength" && (
                                      <span className="ml-2">
                                        {exercise.sets && exercise.sets.length > 0
                                          ? exercise.sets
                                              .map((set, idx) => `${set.setCount}×${set.reps}@${set.weight}kg`)
                                              .join(", ")
                                          : `${exercise.setCount || 0} sets × ${exercise.reps || 0} reps @ ${exercise.weight || 0}kg`}
                                      </span>
                                    )}
                                    {(exercise.type === "cardio" || exercise.type === "flexibility") && (
                                      <span className="ml-2">{formatDuration(exercise.duration)}</span>
                                    )}
                                    {exercise.type === "sprints" && (
                                      <span className="ml-2">
                                        {exercise.sprints && exercise.sprints.length > 0
                                          ? exercise.sprints
                                              .map(
                                                (sprint, idx) =>
                                                  `${sprint.repCount}×${sprint.distance}m@${formatDuration(sprint.duration)}`,
                                              )
                                              .join(", ")
                                          : `${exercise.reps || 0} × ${exercise.distance || 0}m @ ${formatDuration(exercise.duration)} per sprint`}
                                      </span>
                                    )}
                                  </div>
                                  {exercise.notes && <div className="text-sm mt-1">{exercise.notes}</div>}
                                </div>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => startEditingExercise(exercise, session.id)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Exercise</DialogTitle>
                                    </DialogHeader>
                                    {editingExercise && (
                                      <div className="space-y-4 py-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <Label htmlFor="edit-exercise-name">Exercise Name</Label>
                                            <Input
                                              id="edit-exercise-name"
                                              value={editingExercise.name}
                                              onChange={(e) =>
                                                setEditingExercise({ ...editingExercise, name: e.target.value })
                                              }
                                            />
                                          </div>
                                          <div>
                                            <Label htmlFor="edit-exercise-type">Exercise Type</Label>
                                            <Select
                                              value={editingExercise.type}
                                              onValueChange={(value) =>
                                                handleExerciseTypeChange(value as ExerciseType, true)
                                              }
                                            >
                                              <SelectTrigger id="edit-exercise-type">
                                                <SelectValue placeholder="Select type" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="strength">Strength</SelectItem>
                                                <SelectItem value="cardio">Cardio</SelectItem>
                                                <SelectItem value="flexibility">Flexibility</SelectItem>
                                                <SelectItem value="sprints">Sprints</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>

                                        {editingExercise?.type === "strength" && (
                                          <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                              <h3 className="text-sm font-medium">Sets</h3>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setEditingExercise({
                                                    ...editingExercise,
                                                    sets: [
                                                      ...(editingExercise.sets || []),
                                                      { id: crypto.randomUUID(), reps: 10, weight: 0, setCount: 1 },
                                                    ],
                                                  })
                                                }}
                                              >
                                                Add Set Type
                                              </Button>
                                            </div>

                                            {editingExercise.sets &&
                                              editingExercise.sets.map((set, index) => (
                                                <div key={set.id} className="grid grid-cols-12 gap-2 items-center">
                                                  <div className="col-span-2">
                                                    <Label htmlFor={`edit-set-${index}-count`}>Sets</Label>
                                                    <Input
                                                      id={`edit-set-${index}-count`}
                                                      type="number"
                                                      min="1"
                                                      value={set.setCount}
                                                      onChange={(e) => {
                                                        const updatedSets = [...(editingExercise.sets || [])]
                                                        updatedSets[index] = {
                                                          ...updatedSets[index],
                                                          setCount: Number.parseInt(e.target.value) || 1,
                                                        }
                                                        setEditingExercise({
                                                          ...editingExercise,
                                                          sets: updatedSets,
                                                        })
                                                      }}
                                                    />
                                                  </div>
                                                  <div className="col-span-4">
                                                    <Label htmlFor={`edit-set-${index}-reps`}>Reps</Label>
                                                    <Input
                                                      id={`edit-set-${index}-reps`}
                                                      type="number"
                                                      min="1"
                                                      value={set.reps}
                                                      onChange={(e) => {
                                                        const updatedSets = [...(editingExercise.sets || [])]
                                                        updatedSets[index] = {
                                                          ...updatedSets[index],
                                                          reps: Number.parseInt(e.target.value) || 0,
                                                        }
                                                        setEditingExercise({
                                                          ...editingExercise,
                                                          sets: updatedSets,
                                                        })
                                                      }}
                                                    />
                                                  </div>
                                                  <div className="col-span-4">
                                                    <Label htmlFor={`edit-set-${index}-weight`}>Weight (kg)</Label>
                                                    <Input
                                                      id={`edit-set-${index}-weight`}
                                                      type="number"
                                                      min="0"
                                                      step="0.5"
                                                      value={set.weight}
                                                      onChange={(e) => {
                                                        const updatedSets = [...(editingExercise.sets || [])]
                                                        updatedSets[index] = {
                                                          ...updatedSets[index],
                                                          weight: Number.parseFloat(e.target.value) || 0,
                                                        }
                                                        setEditingExercise({
                                                          ...editingExercise,
                                                          sets: updatedSets,
                                                        })
                                                      }}
                                                    />
                                                  </div>
                                                  <div className="col-span-2">
                                                    <Label className="opacity-0">Remove</Label>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => {
                                                        const updatedSets = [...(editingExercise.sets || [])]
                                                        updatedSets.splice(index, 1)
                                                        setEditingExercise({
                                                          ...editingExercise,
                                                          sets: updatedSets,
                                                        })
                                                      }}
                                                      disabled={editingExercise.sets?.length === 1}
                                                    >
                                                      <X className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}

                                        {(editingExercise.type === "cardio" ||
                                          editingExercise.type === "flexibility") && (
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label htmlFor="edit-exercise-duration-min">Duration (minutes)</Label>
                                              <Input
                                                id="edit-exercise-duration-min"
                                                type="number"
                                                min="0"
                                                value={(editingExercise as any).durationMinutes || 0}
                                                onChange={(e) =>
                                                  setEditingExercise({
                                                    ...editingExercise,
                                                    durationMinutes: Number.parseInt(e.target.value) || 0,
                                                  } as any)
                                                }
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="edit-exercise-duration-sec">Seconds</Label>
                                              <Input
                                                id="edit-exercise-duration-sec"
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={(editingExercise as any).durationSeconds || 0}
                                                onChange={(e) =>
                                                  setEditingExercise({
                                                    ...editingExercise,
                                                    durationSeconds: Number.parseInt(e.target.value) || 0,
                                                  } as any)
                                                }
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {editingExercise?.type === "sprints" && (
                                          <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                              <h3 className="text-sm font-medium">Sprints</h3>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setEditingExercise({
                                                    ...editingExercise,
                                                    sprints: [
                                                      ...(editingExercise.sprints || []),
                                                      {
                                                        id: crypto.randomUUID(),
                                                        distance: 100,
                                                        duration: 15,
                                                        repCount: 1,
                                                      },
                                                    ],
                                                  })
                                                }}
                                              >
                                                Add Sprint Type
                                              </Button>
                                            </div>

                                            {editingExercise.sprints &&
                                              editingExercise.sprints.map((sprint, index) => (
                                                <div key={sprint.id} className="grid grid-cols-12 gap-2 items-center">
                                                  <div className="col-span-2">
                                                    <Label htmlFor={`edit-sprint-${index}-count`}>Reps</Label>
                                                    <Input
                                                      id={`edit-sprint-${index}-count`}
                                                      type="number"
                                                      min="1"
                                                      value={sprint.repCount}
                                                      onChange={(e) => {
                                                        const updatedSprints = [...(editingExercise.sprints || [])]
                                                        updatedSprints[index] = {
                                                          ...updatedSprints[index],
                                                          repCount: Number.parseInt(e.target.value) || 1,
                                                        }
                                                        setEditingExercise({
                                                          ...editingExercise,
                                                          sprints: updatedSprints,
                                                        })
                                                      }}
                                                    />
                                                  </div>
                                                  <div className="col-span-3">
                                                    <Label htmlFor={`edit-sprint-${index}-distance`}>
                                                      Distance (m)
                                                    </Label>
                                                    <Input
                                                      id={`edit-sprint-${index}-distance`}
                                                      type="number"
                                                      min="1"
                                                      value={sprint.distance}
                                                      onChange={(e) => {
                                                        const updatedSprints = [...(editingExercise.sprints || [])]
                                                        updatedSprints[index] = {
                                                          ...updatedSprints[index],
                                                          distance: Number.parseInt(e.target.value) || 0,
                                                        }
                                                        setEditingExercise({
                                                          ...editingExercise,
                                                          sprints: updatedSprints,
                                                        })
                                                      }}
                                                    />
                                                  </div>
                                                  <div className="col-span-6 grid grid-cols-2 gap-2">
                                                    <div>
                                                      <Label htmlFor={`edit-sprint-${index}-min`}>Minutes</Label>
                                                      <Input
                                                        id={`edit-sprint-${index}-min`}
                                                        type="number"
                                                        min="0"
                                                        value={Math.floor((sprint.duration || 0) / 60)}
                                                        onChange={(e) => {
                                                          const minutes = Number.parseInt(e.target.value) || 0
                                                          const seconds = (sprint.duration || 0) % 60
                                                          const totalDuration = minutes * 60 + seconds

                                                          const updatedSprints = [...(editingExercise.sprints || [])]
                                                          updatedSprints[index] = {
                                                            ...updatedSprints[index],
                                                            duration: totalDuration,
                                                          }
                                                          setEditingExercise({
                                                            ...editingExercise,
                                                            sprints: updatedSprints,
                                                          })
                                                        }}
                                                      />
                                                    </div>
                                                    <div>
                                                      <Label htmlFor={`edit-sprint-${index}-sec`}>Seconds</Label>
                                                      <Input
                                                        id={`edit-sprint-${index}-sec`}
                                                        type="number"
                                                        min="0"
                                                        max="59"
                                                        value={(sprint.duration || 0) % 60}
                                                        onChange={(e) => {
                                                          const seconds = Number.parseInt(e.target.value) || 0
                                                          const minutes = Math.floor((sprint.duration || 0) / 60)
                                                          const totalDuration = minutes * 60 + seconds

                                                          const updatedSprints = [...(editingExercise.sprints || [])]
                                                          updatedSprints[index] = {
                                                            ...updatedSprints[index],
                                                            duration: totalDuration,
                                                          }
                                                          setEditingExercise({
                                                            ...editingExercise,
                                                            sprints: updatedSprints,
                                                          })
                                                        }}
                                                      />
                                                    </div>
                                                  </div>
                                                  <div className="col-span-1">
                                                    <Label className="opacity-0">Remove</Label>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => {
                                                        const updatedSprints = [...(editingExercise.sprints || [])]
                                                        updatedSprints.splice(index, 1)
                                                        setEditingExercise({
                                                          ...editingExercise,
                                                          sprints: updatedSprints,
                                                        })
                                                      }}
                                                      disabled={editingExercise.sprints?.length === 1}
                                                    >
                                                      <X className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}

                                        <div>
                                          <Label htmlFor="edit-exercise-notes">Notes (optional)</Label>
                                          <Input
                                            id="edit-exercise-notes"
                                            value={editingExercise.notes || ""}
                                            onChange={(e) =>
                                              setEditingExercise({ ...editingExercise, notes: e.target.value })
                                            }
                                          />
                                        </div>

                                        <div className="flex justify-between">
                                          <Button
                                            variant="destructive"
                                            onClick={() => deleteExerciseFromSession(session.id, exercise.id)}
                                          >
                                            Delete Exercise
                                          </Button>
                                          <Button onClick={() => saveEditedExercise(session.id)}>Save Changes</Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Progress Tab */}
      <TabsContent value="progress">
        <Card>
          <CardHeader>
            <CardTitle>Progress Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            {uniqueExerciseNames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No exercise data available for visualization.
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="exercise-select">Select Exercise</Label>
                  <Select
                    value={selectedExerciseName || uniqueExerciseNames[0]}
                    onValueChange={setSelectedExerciseName}
                  >
                    <SelectTrigger id="exercise-select">
                      <SelectValue placeholder="Select exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueExerciseNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-[400px]">
                  <ExerciseChart
                    sessions={completedSessions}
                    exerciseName={selectedExerciseName || uniqueExerciseNames[0]}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Summary Tab */}
      <TabsContent value="summary">
        <Card>
          <CardHeader>
            <CardTitle>Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {completedSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No exercise data available for summary.</div>
            ) : (
              <ProgressSummary sessions={completedSessions} formatDuration={formatDuration} />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Calendar Tab */}
      <TabsContent value="calendar">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Calendar</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">Completed</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Planned
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <MonthlyCalendar
              sessions={sessions}
              onSelectExercise={(exerciseName) => {
                setSelectedExerciseName(exerciseName)
                document.getElementById("progress-tab")?.click()
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

