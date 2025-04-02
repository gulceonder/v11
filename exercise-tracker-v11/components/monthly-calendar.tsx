"use client"

import { useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Exercise {
  id: string
  name: string
  type: string
  sets?: { id?: string; reps: number; weight: number; setCount: number }[]
  setCount?: number
  reps?: number
  weight?: number
  duration?: number
  distance?: number
  notes?: string
  sprints?: { id?: string; distance: number; duration: number; repCount: number }[]
}

interface ExerciseSession {
  id: string
  date: string
  name: string
  notes?: string
  duration?: number
  rating?: number
  feedback?: string
  exercises: Exercise[]
  planned?: boolean
}

interface MonthlyCalendarProps {
  sessions: ExerciseSession[]
  onSelectExercise: (exerciseName: string) => void
}

export default function MonthlyCalendar({ sessions, onSelectExercise }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<ExerciseSession | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  // Get days for the current month view
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Navigation functions
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  // Get sessions for a specific day
  const getSessionsForDay = (day: Date) => {
    return sessions.filter((session) => isSameDay(parseISO(session.date), day))
  }

  // Get all instances of a specific exercise across all sessions
  const getExerciseHistory = (exerciseName: string) => {
    return sessions
      .filter((session) => session.exercises.some((ex) => ex.name === exerciseName))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((session) => {
        const exercise = session.exercises.find((ex) => ex.name === exerciseName)
        return {
          date: session.date,
          sessionName: session.name,
          exercise,
        }
      })
  }

  // Format duration for display
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0m 0s"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Render star rating
  const renderRating = (rating = 0) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day names */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-medium py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, i) => {
          const daysSessions = getSessionsForDay(day)
          const hasSession = daysSessions.length > 0

          return (
            <div
              key={i}
              className={`min-h-[100px] border rounded-md p-1 ${
                isSameMonth(day, currentMonth) ? "bg-background" : "bg-muted/40 text-muted-foreground"
              }`}
            >
              <div className="text-right p-1">{format(day, "d")}</div>

              {hasSession && (
                <div className="mt-1 space-y-1">
                  {daysSessions.map((session) => (
                    <Dialog key={session.id}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-full justify-start text-xs h-auto py-1 truncate ${
                            session.planned ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" : ""
                          }`}
                          onClick={() => setSelectedSession(session)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{session.name}</span>
                            {session.duration && (
                              <Badge
                                variant="outline"
                                className={`ml-1 text-[10px] ${
                                  session.planned ? "bg-blue-100 text-blue-700 border-blue-200" : ""
                                }`}
                              >
                                {formatDuration(session.duration)}
                              </Badge>
                            )}
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center">
                            {session.name}
                            {session.planned && (
                              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                                Planned
                              </Badge>
                            )}
                          </DialogTitle>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">{format(parseISO(session.date), "PPP")}</div>
                            {session.rating && session.rating > 0 && !session.planned && (
                              <div className="flex items-center">{renderRating(session.rating)}</div>
                            )}
                          </div>
                        </DialogHeader>
                        {session.duration && (
                          <div className="text-sm">
                            <Badge variant="secondary">
                              {session.planned ? "Est. Duration: " : "Duration: "}
                              {formatDuration(session.duration)}
                            </Badge>
                          </div>
                        )}
                        {session.notes && (
                          <div className="text-sm border-b pb-3 mb-3">
                            <div className="font-medium mb-1">Session Notes:</div>
                            {session.notes}
                          </div>
                        )}
                        {session.feedback && !session.planned && (
                          <div className="text-sm p-2 bg-muted rounded-md mb-3">
                            <div className="font-medium mb-1">Feedback:</div>
                            {session.feedback}
                          </div>
                        )}
                        <ScrollArea className="mt-4 max-h-[60vh]">
                          <div className="space-y-3">
                            {session.exercises.map((exercise) => (
                              <Dialog key={exercise.id}>
                                <DialogTrigger asChild>
                                  <div
                                    className="p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedExercise(exercise)}
                                  >
                                    <div className="font-medium">{exercise.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      <Badge variant="outline">{exercise.type}</Badge>
                                      {exercise.type === "strength" && (
                                        <span className="ml-2">
                                          {exercise.sets && exercise.sets.length > 0
                                            ? exercise.sets
                                                .map((set) => `${set.setCount}×${set.reps}@${set.weight}kg`)
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
                                                  (sprint) =>
                                                    `${sprint.repCount}×${sprint.distance}m@${formatDuration(sprint.duration)}`,
                                                )
                                                .join(", ")
                                            : `${exercise.reps || 0} × ${exercise.distance || 0}m @ ${formatDuration(exercise.duration)} per sprint`}
                                        </span>
                                      )}
                                    </div>
                                    {exercise.notes && <div className="text-sm mt-1">{exercise.notes}</div>}
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Exercise History: {exercise.name}</DialogTitle>
                                  </DialogHeader>
                                  <ExerciseHistory
                                    exerciseName={exercise.name}
                                    sessions={sessions.filter((s) => !s.planned)} // Only show completed sessions in history
                                    onViewProgress={() => onSelectExercise(exercise.name)}
                                    formatDuration={formatDuration}
                                  />
                                </DialogContent>
                              </Dialog>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ExerciseHistoryProps {
  exerciseName: string
  sessions: ExerciseSession[]
  onViewProgress: () => void
  formatDuration: (seconds?: number) => string
}

function ExerciseHistory({ exerciseName, sessions, onViewProgress, formatDuration }: ExerciseHistoryProps) {
  // Get all instances of this exercise
  const history = sessions
    .filter((session) => session.exercises.some((ex) => ex.name === exerciseName))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Most recent first
    .map((session) => {
      const exercise = session.exercises.find((ex) => ex.name === exerciseName)!
      return {
        date: session.date,
        sessionName: session.name,
        exercise,
      }
    })

  if (history.length === 0) {
    return <div className="text-center py-4">No history found for this exercise.</div>
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {history.map((item, index) => (
            <Card key={index}>
              <CardHeader className="py-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">{item.sessionName}</CardTitle>
                  <div className="text-xs text-muted-foreground">{format(parseISO(item.date), "PPP")}</div>
                </div>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-sm">
                  {item.exercise.type === "strength" && (
                    <div>
                      {item.exercise.sets && item.exercise.sets.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-medium text-xs">Sets:</div>
                          {item.exercise.sets.map((set, idx) => (
                            <div key={set.id || idx} className="text-xs">
                              {set.setCount}×{set.reps} reps @ {set.weight}kg
                            </div>
                          ))}
                        </div>
                      ) : (
                        `${item.exercise.setCount || 0} sets × ${item.exercise.reps || 0} reps @ ${item.exercise.weight || 0}kg`
                      )}
                    </div>
                  )}
                  {item.exercise.type === "sprints" && (
                    <div>
                      {item.exercise.sprints && item.exercise.sprints.length > 0 ? (
                        <div className="space-y-1">
                          <div className="font-medium text-xs">Sprints:</div>
                          {item.exercise.sprints.map((sprint, idx) => (
                            <div key={sprint.id || idx} className="text-xs">
                              {sprint.repCount}×{sprint.distance}m @ {formatDuration(sprint.duration)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        `${item.exercise.reps || 0} × ${item.exercise.distance || 0}m @ ${formatDuration(item.exercise.duration)} per sprint`
                      )}
                    </div>
                  )}
                  {item.exercise.notes && <div className="mt-1 text-muted-foreground">{item.exercise.notes}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <DialogClose asChild>
        <Button className="w-full" onClick={onViewProgress}>
          View Progress Chart
        </Button>
      </DialogClose>
    </div>
  )
}

