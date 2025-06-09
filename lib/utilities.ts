export interface CollapseWhiteSpaceOptions {
    singleSpaced?: boolean;
    singleLine?: boolean;
    collapseSpaces?: boolean;
    unindent?: boolean;
}

export function collapseWhitespace(text: string, { singleSpaced = false, singleLine = false, collapseSpaces = true, unindent = false }: CollapseWhiteSpaceOptions = {}): string {
    if (typeof text === "string") {
        text = text
            .replace(/\r\n/g, "\n") // Reformat windows crlf to just a newline
            .replace(/\n(?:[\t ]*\n)+/g, "\n\n") // Collapse lines that only contain whitespace between newlines
            .replace(/^\s+|\s+$/g, '') // Trim leading and trailing whitespace
            .replace(/\n{3,}/g, "\n\n"); // Collapse 3+ newlines to two newlines
        if (singleSpaced)
            text = text.replace(/\n{2,}/g, "\n");
        if (singleLine)
            text = text.replace(/\n/g, " ");
        if (collapseSpaces)
            text = text.replace(/[ \t]{2,}/g, " ");
        if (unindent)
            text = text.replace(/^[ \t]+/gm, "");
        text = text.trim();
    }
    return text;
}
