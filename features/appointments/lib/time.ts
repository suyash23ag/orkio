export function localDateTimeToUtc(
  date: string,
  time: string,
  timezone: string
): Date {
  const naiveUtc = Date.parse(`${date}T${time}:00.000Z`)
  if (!Number.isFinite(naiveUtc)) {
    throw new Error("Choose a valid appointment date and time")
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })

  const partsToUtc = (value: Date) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(value).map(({ type, value: partValue }) => [
        type,
        partValue,
      ])
    )

    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    )
  }

  const firstOffset = partsToUtc(new Date(naiveUtc)) - naiveUtc
  const firstCandidate = naiveUtc - firstOffset
  const secondOffset =
    partsToUtc(new Date(firstCandidate)) - firstCandidate

  return new Date(naiveUtc - secondOffset)
}

export function formatAppointmentDate(
  startsAt: string | Date,
  timezone: string
) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(startsAt))
}
