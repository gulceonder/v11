"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Exercise {
  id: string
  name: string
  type: string
  sets?: { reps: number; weight: number; setCount: number }[]
  setCount?: number // Legacy
  reps?: number
  weight?: number
  duration?: number
  distance?: number
  notes?: string
  sprints?: { duration: number; distance: number; repCount: number }[]
}

interface ExerciseSession {
  id: string
  date: string
  name: string
  notes?: string
  exercises: Exercise[]
}

interface ChartData {
  date: string
  weight?: number
  duration?: number
  volume?: number // For strength exercises (sets * reps * weight)
  distance?: number // For sprints
  formattedDuration?: string // For display in tooltip
}

interface ExerciseChartProps {
  sessions: ExerciseSession[]
  exerciseName: string
}

export default function ExerciseChart({ sessions, exerciseName }: ExerciseChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [exerciseType, setExerciseType] = useState<string>("strength")

  useEffect(() => {
    if (!exerciseName) return

    // Find all instances of the selected exercise across sessions
    const exerciseData: ChartData[] = []
    const exerciseInstances = sessions
      .filter((session) => session.exercises.some((ex) => ex.name === exerciseName))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Determine the exercise type from the first instance
    const firstInstance = sessions.flatMap((session) => session.exercises).find((ex) => ex.name === exerciseName)

    if (firstInstance) {
      setExerciseType(firstInstance.type)
    }

    // Process data for chart
    exerciseInstances.forEach((session) => {
      const exercise = session.exercises.find((ex) => ex.name === exerciseName)
      if (exercise) {
        const dataPoint: ChartData = {
          date: format(parseISO(session.date), "MMM d"),
        }

        if (exercise.type === "strength") {
          if (exercise.sets && exercise.sets.length > 0) {
            // Calculate max weight and average weight
            const weights = exercise.sets.map((set) => set.weight)
            dataPoint.weight = Math.max(...weights)

            // Calculate total volume (sum of sets * reps * weight)
            dataPoint.volume = exercise.sets.reduce((total, set) => total + set.setCount * set.reps * set.weight, 0)
          } else if (exercise.setCount && exercise.reps && exercise.weight) {
            // Legacy data
            dataPoint.weight = exercise.weight
            dataPoint.volume = exercise.setCount * exercise.reps * exercise.weight
          }
        } else if (exercise.type === "cardio" || exercise.type === "flexibility") {
          dataPoint.duration = exercise.duration
          dataPoint.formattedDuration = formatDuration(exercise.duration)
        } else if (exercise.type === "sprints") {
          if (exercise.sprints && exercise.sprints.length > 0) {
            // Calculate total distance
            const totalDistance = exercise.sprints.reduce(
              (total, sprint) => total + sprint.distance * sprint.repCount,
              0,
            )
            dataPoint.distance = totalDistance

            // Calculate total duration
            const totalDuration = exercise.sprints.reduce(
              (total, sprint) => total + sprint.duration * sprint.repCount,
              0,
            )
            dataPoint.duration = totalDuration
            dataPoint.formattedDuration = formatDuration(totalDuration)
          } else if (exercise.reps && exercise.distance) {
            // Legacy data
            dataPoint.distance = exercise.distance * exercise.reps
            dataPoint.duration = exercise.duration * exercise.reps
            dataPoint.formattedDuration = formatDuration(exercise.duration * exercise.reps)
          }
        }

        exerciseData.push(dataPoint)
      }
    })

    setChartData(exerciseData)
  }, [sessions, exerciseName])

  // Format duration for display
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0m 0s"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border p-2 rounded-md shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name === "Duration" && entry.payload.formattedDuration
                ? `${entry.name}: ${entry.payload.formattedDuration}`
                : `${entry.name}: ${entry.value}${entry.unit || ""}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available for this exercise</p>
      </div>
    )
  }

  return (
    <div className="h-full">
      {exerciseType === "strength" ? (
        <Tabs defaultValue="weight">
          <TabsList className="mb-4">
            <TabsTrigger value="weight">Weight</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
          </TabsList>

          <TabsContent value="weight" className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Weight (kg)", angle: -90, position: "insideLeft" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="volume" className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Volume (sets × reps × kg)", angle: -90, position: "insideLeft" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="volume" name="Volume" stroke="#82ca9d" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      ) : exerciseType === "sprints" ? (
        <Tabs defaultValue="distance">
          <TabsList className="mb-4">
            <TabsTrigger value="distance">Distance</TabsTrigger>
            <TabsTrigger value="duration">Duration</TabsTrigger>
          </TabsList>

          <TabsContent value="distance" className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Distance (meters)", angle: -90, position: "insideLeft" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="distance" name="Distance (m)" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="duration" className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Duration (seconds)", angle: -90, position: "insideLeft" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="duration" name="Duration" stroke="#ffc658" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: "Duration (seconds)", angle: -90, position: "insideLeft" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="duration" name="Duration" stroke="#ffc658" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

