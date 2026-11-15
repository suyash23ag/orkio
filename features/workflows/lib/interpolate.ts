export type WorkflowNodeOutputs = Record<string, unknown>

function getByPath(value: unknown, path: string): unknown {
    const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)

    return segments.reduce<unknown>((current, segment) => {
        if (current === null || typeof current !== "object") {
            return undefined
        }

        return (current as Record<string, unknown>)[segment]
    }, value)
}

function toText(value: unknown): string {
    if (value === undefined || value === null) {
        return ""
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value)
        } catch {
            return ""
        }
    }

    return String(value)
}

/**
 * Replaces workflow-output placeholders such as `{{ open-url.title }}` and
 * `{{ fetch.items[0].name }}` with values from previously executed nodes.
 */
export function interpolate(
    text: string,
    outputs: WorkflowNodeOutputs,
    aliases?: Map<string, string>,
): string {
    return text.replace(/{{\s*([^{}]+?)\s*}}/g, (_, path: string) => {
        const trimmedPath = path.trim()
        const [root, ...rest] = trimmedPath.split(".")
        const resolvedRoot = aliases?.get(root) ?? root
        return toText(getByPath(outputs, [resolvedRoot, ...rest].join(".")))
    })
}
