"use client"

import { useState, useTransition } from "react"
import { CalendarDays, CheckCircle2, Clock3, Mail, UserRound, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cancelAppointmentAction, bookAppointmentAction } from "../actions"
import { formatAppointmentDate } from "../lib/time"
import type { AppointmentInput, AppointmentView } from "../types"

const timezones = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
]

type FormValues = Omit<AppointmentInput, "requestId">

const initialValues: FormValues = {
  name: "",
  email: "",
  purpose: "",
  date: "",
  time: "",
  timezone: "UTC",
}

export function AppointmentDashboard({
  appointments,
}: {
  appointments: AppointmentView[]
}) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [review, setReview] = useState<FormValues | null>(null)
  const [requestId, setRequestId] = useState("")
  const [isPending, startTransition] = useTransition()

  const update = (key: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function reviewAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestId(crypto.randomUUID())
    setReview(values)
  }

  function confirmAppointment() {
    if (!review || !requestId) return

    const input: AppointmentInput = {
      ...review,
      requestId,
    }

    startTransition(async () => {
      const result = await bookAppointmentAction(input)
      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success("Appointment booked and confirmation email queued")
      setReview(null)
      setRequestId("")
      setValues(initialValues)
      window.location.reload()
    })
  }

  function cancelAppointment(id: string) {
    startTransition(async () => {
      await cancelAppointmentAction(id)
      toast.success("Appointment canceled")
      window.location.reload()
    })
  }

  return (
    <main className="min-h-svh overflow-y-auto bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Scheduling</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Appointments</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Book a time for a guest, review the details, and send a reliable confirmation email.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle>New appointment</CardTitle>
              <CardDescription>
                The appointment is not created until you explicitly confirm the review step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!review ? (
                <form className="grid gap-5" onSubmit={reviewAppointment}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Name" htmlFor="appointment-name">
                      <Input
                        id="appointment-name"
                        value={values.name}
                        onChange={(event) => update("name", event.target.value)}
                        required
                        maxLength={120}
                        placeholder="Alex Morgan"
                      />
                    </Field>
                    <Field label="Email" htmlFor="appointment-email">
                      <Input
                        id="appointment-email"
                        type="email"
                        value={values.email}
                        onChange={(event) => update("email", event.target.value)}
                        required
                        maxLength={320}
                        placeholder="alex@example.com"
                      />
                    </Field>
                  </div>
                  <Field label="Purpose" htmlFor="appointment-purpose">
                    <Textarea
                      id="appointment-purpose"
                      value={values.purpose}
                      onChange={(event) => update("purpose", event.target.value)}
                      required
                      maxLength={500}
                      placeholder="Discuss the project scope"
                      rows={3}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label="Date" htmlFor="appointment-date">
                      <Input
                        id="appointment-date"
                        type="date"
                        value={values.date}
                        onChange={(event) => update("date", event.target.value)}
                        onInput={(event) => update("date", event.currentTarget.value)}
                        required
                      />
                    </Field>
                    <Field label="Time" htmlFor="appointment-time">
                      <Input
                        id="appointment-time"
                        type="time"
                        value={values.time}
                        onChange={(event) => update("time", event.target.value)}
                        onInput={(event) => update("time", event.currentTarget.value)}
                        required
                      />
                    </Field>
                    <Field label="Timezone" htmlFor="appointment-timezone">
                      <select
                        id="appointment-timezone"
                        value={values.timezone}
                        onChange={(event) => update("timezone", event.target.value)}
                        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {timezones.map((timezone) => (
                          <option key={timezone} value={timezone}>
                            {timezone}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Button type="submit" className="w-fit">
                    Review appointment
                  </Button>
                </form>
              ) : (
                <ReviewCard
                  values={review}
                  isPending={isPending}
                  onEdit={() => {
                    setReview(null)
                    setRequestId("")
                  }}
                  onConfirm={confirmAppointment}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking safeguards</CardTitle>
              <CardDescription>Built into the server-side booking path.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <Safeguard icon={<CheckCircle2 />} text="Organization-scoped appointments" />
              <Safeguard icon={<Clock3 />} text="Timezone-aware date and time storage" />
              <Safeguard icon={<CalendarDays />} text="Active host slots cannot conflict" />
              <Safeguard icon={<Mail />} text="Confirmation email jobs are idempotent" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
            <CardDescription>{appointments.length} organization appointment(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No appointments booked yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{appointment.purpose}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                          {appointment.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-3.5" /> {appointment.inviteeName}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="size-3.5" /> {appointment.inviteeEmail}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" /> {formatAppointmentDate(appointment.startsAt, appointment.timezone)}
                        </span>
                      </div>
                    </div>
                    {appointment.status === "confirmed" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => cancelAppointment(appointment.id)}
                      >
                        <XCircle data-icon="inline-start" />
                        Cancel
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function Safeguard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  )
}

function ReviewCard({
  values,
  isPending,
  onEdit,
  onConfirm,
}: {
  values: FormValues
  isPending: boolean
  onEdit: () => void
  onConfirm: () => void
}) {
  return (
    <div className="grid gap-5 rounded-xl border bg-muted/30 p-5">
      <div>
        <p className="text-sm font-medium">Review details</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirming will reserve the slot and queue the email.
        </p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Name" value={values.name} />
        <Detail label="Email" value={values.email} />
        <Detail label="Purpose" value={values.purpose} />
        <Detail label="Date and time" value={`${values.date} at ${values.time}`} />
        <Detail label="Timezone" value={values.timezone} />
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onEdit} disabled={isPending}>
          Edit details
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Booking..." : "Confirm and book"}
        </Button>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{value}</dd>
    </div>
  )
}
