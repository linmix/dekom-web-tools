function formatTitleCharacterCounts(editableTitle, publishedTitle) {
    if (!editableTitle && !publishedTitle) return "";

    const editable = (editableTitle || "").length;
    if (publishedTitle === undefined) {
        return `Characters: ${editable} editable · ${editable + " · DEKOM".length} expected rendered`;
    }

    const rendered = publishedTitle == null ? "unavailable" : publishedTitle.length;
    return `Characters: ${editable} editable · ${rendered} rendered`;
}

function formatCurrentSeoMetadata(page) {
    return [
        "## Current SEO metadata",
        "",
        "### Editable title",
        "",
        page.editableTitle || "",
        "",
        "### Description",
        "",
        page.description || "",
        "",
        formatTitleCharacterCounts(page.editableTitle, page.publishedTitle ?? null),
        "",
        `Description characters: ${page.descriptionLength || 0}`,
        "",
        `Published title: ${page.publishedTitle || ""}`
    ];
}

module.exports = { formatCurrentSeoMetadata, formatTitleCharacterCounts };
