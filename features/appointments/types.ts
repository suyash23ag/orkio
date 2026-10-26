import { z } from "zod"

export const appointmentInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email address").max(320),
  purpose: z.string().trim().min(1, "Purpose is required").max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a valid time"),
  timezone: z.string().trim().min(1, "Timezone is required").max(80),
  requestId: z.string().uuid(),
})

export type AppointmentInput = z.infer<typeof appointmentInputSchema>

export type AppointmentView = {
  id: string
  inviteeName: string
  inviteeEmail: string
  purpose: string
  startsAt: string
  timezone: string
  status: string
  emailStatus: string | null
  emailProviderMessageId: string | null
  emailLastError: string | null
  createdAt: string
}
