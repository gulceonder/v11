"use client"

import { useState } from "react"
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameWeek,
  isSameMonth,
  isWithinInterval,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface Exercise {
  id: string
  name: string
  type: string
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  distance?: number
  notes?: string
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
}

interface ProgressSummaryProps {
  sessions: ExerciseSession[]
  formatDuration: (seconds?: number) => string
}

export default function ProgressSummary({ sessions, formatDuration }: ProgressSummaryProps) {
  const [currentPeriod, setCurrentPeriod] = useState(new Date())
  const [periodType, setPeriodType] = useState<"week" | "month">("week")

  // Get date range for current period
  const getDateRange = () => {
    if (periodType === "week") {
      const weekStart = startOfWeek(currentPeriod, { weekStartsOn: 0 })
      const weekEnd = endOfWeek(currentPeriod, { weekStartsOn: 0 })
      return { start: weekStart, end: weekEnd }
    } else {
      const monthStart = startOfMonth(currentPeriod)
      const monthEnd = endOfMonth(currentPeriod)
      return { start: monthStart, end: monthEnd }
    }
  }

  const dateRange = getDateRange()

  // Navigation functions
  const prevPeriod = () => {
    if (periodType === "week") {
      setCurrentPeriod(subWeeks(currentPeriod, 1))
    } else {
      setCurrentPeriod(subMonths(currentPeriod, 1))
    }
  }

  const nextPeriod = () => {
    if (periodType === "week") {
      setCurrentPeriod(addWeeks(currentPeriod, 1))
    } else {
      setCurrentPeriod(addMonths(currentPeriod, 1))
    }
  }

  const goToToday = () => {
    setCurrentPeriod(new Date())
  }

  // Filter sessions for current period
  const filteredSessions = sessions.filter((session) => {
    const sessionDate = parseISO(session.date)
    if (periodType === "week") {
      return isSameWeek(sessionDate, currentPeriod, { weekStartsOn: 0 })
    } else {
      return isSameMonth(sessionDate, currentPeriod)
    }
  })

  // Calculate total duration for the period
  const totalDuration = filteredSessions.reduce((total, session) => total + (session.duration || 0), 0)

  // Calculate average rating for the period
  const sessionsWithRating = filteredSessions.filter((session) => session.rating && session.rating > 0)
  const averageRating =
    sessionsWithRating.length > 0
      ? sessionsWithRating.reduce((total, session) => total + (session.rating || 0), 0) / sessionsWithRating.length
      : 0

  // Prepare data for exercise type distribution chart
  const exerciseTypeCounts: Record<string, number> = {}
  filteredSessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exerciseTypeCounts[exercise.type] = (exerciseTypeCounts[exercise.type] || 0) + 1
    })
  })

  const exerciseTypeData = Object.entries(exerciseTypeCounts).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
  }))

  // Prepare data for daily activity chart
  const dailyActivityData = () => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })

    return days.map((day) => {
      const daySessions = sessions.filter((session) => {
        const sessionDate = parseISO(session.date)
        return isWithinInterval(sessionDate, { start: day, end: day })
      })

      const dayDuration = daySessions.reduce((total, session) => total + (session.duration || 0), 0)

      return {
        name: format(day, "EEE"),
        duration: Math.round(dayDuration / 60), // Convert to minutes for better readability
        sessions: daySessions.length,
      }
    })
  }

  // Colors for pie chart
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border p-2 rounded-md shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name === "duration"
                ? `Duration: ${formatDuration(entry.value * 60)}`
                : `${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as "week" | "month")}>
          <TabsList>
            <TabsTrigger value="week">Weekly</TabsTrigger>
            <TabsTrigger value="month">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-xl font-bold">
        {periodType === "week"
          ? `Week of ${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
          : format(currentPeriod, "MMMM yyyy")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredSessions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatDuration(totalDuration)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageRating.toFixed(1)}/5</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivityData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#8884d8"
                    label={{ value: "Duration (min)", angle: -90, position: "insideLeft" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#82ca9d"
                    label={{ value: "Sessions", angle: 90, position: "insideRight" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="duration" name="Duration (min)" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="sessions" name="Sessions" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercise Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {exerciseTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exerciseTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {exerciseTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No data available for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">No sessions recorded for this {periodType}.</div>
      )}
    </div>
  )
}

