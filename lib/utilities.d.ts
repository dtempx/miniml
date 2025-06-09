export interface CollapseWhiteSpaceOptions {
    singleSpaced?: boolean;
    singleLine?: boolean;
    collapseSpaces?: boolean;
    unindent?: boolean;
}
export declare function collapseWhitespace(text: string, { singleSpaced, singleLine, collapseSpaces, unindent }?: CollapseWhiteSpaceOptions): string;
