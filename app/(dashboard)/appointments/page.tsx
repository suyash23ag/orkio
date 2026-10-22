import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { AppointmentDashboard } from "@/features/appointments/components/appointment-dashboard"
import { listAppointments } from "@/features/appointments/data"

export default async function AppointmentsPage() {
  const { orgId, isAuthenticated } = await auth()

  if (!isAuthenticated) {
    redirect("/sign-in")
  }

  if (!orgId) {
    redirect("/choose-organization")
  }

  const appointments = await listAppointments(orgId)

  return (
    <AppointmentDashboard
      appointments={appointments.map((appointment) => ({
        id: appointment.id,
        inviteeName: appointment.inviteeName,
        inviteeEmail: appointment.inviteeEmail,
        purpose: appointment.purpose,
        startsAt: appointment.startsAt.toISOString(),
        timezone: appointment.timezone,
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
      }))}
    />
  )
}
