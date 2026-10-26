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
        id: appointment.appointment.id,
        inviteeName: appointment.appointment.inviteeName,
        inviteeEmail: appointment.appointment.inviteeEmail,
        purpose: appointment.appointment.purpose,
        startsAt: appointment.appointment.startsAt.toISOString(),
        timezone: appointment.appointment.timezone,
        status: appointment.appointment.status,
        emailStatus: appointment.emailStatus,
        emailProviderMessageId: appointment.emailProviderMessageId,
        emailLastError: appointment.emailLastError,
        createdAt: appointment.appointment.createdAt.toISOString(),
      }))}
    />
  )
}
