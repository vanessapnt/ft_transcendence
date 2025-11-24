class CommandParser {
    parseCommandTarget(command, fullText) {
        const content = fullText.substring(command.length).trim();
        if (content.startsWith('"')) {
            // Username entre guillemets
            const closingQuoteIndex = content.indexOf('"', 1);
            if (closingQuoteIndex === -1) {
                return null;
            }
            return content.substring(1, closingQuoteIndex);
        }
        else {
            // Username sans guillemets
            const spaceIndex = content.indexOf(" ");
            if (spaceIndex === -1) {
                return content || null;
            }
            return content.substring(0, spaceIndex);
        }
    }
    parseDMCommand(text) {
        const dmContent = text.substring(4).trim(); // Enlever "/dm "
        let target, body;
        if (dmContent.startsWith('"')) {
            // Username entre guillemets
            const closingQuoteIndex = dmContent.indexOf('"', 1);
            if (closingQuoteIndex === -1) {
                return null;
            }
            target = dmContent.substring(1, closingQuoteIndex);
            body = dmContent.substring(closingQuoteIndex + 1).trim();
        }
        else {
            // Username sans guillemets
            const firstSpaceIndex = dmContent.indexOf(" ");
            if (firstSpaceIndex === -1) {
                return null;
            }
            target = dmContent.substring(0, firstSpaceIndex);
            body = dmContent.substring(firstSpaceIndex + 1);
        }
        if (!target || !body) {
            return null;
        }
        return { target, body };
    }
}
//# sourceMappingURL=CommandParser.js.map