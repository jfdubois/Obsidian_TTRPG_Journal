<%*
/* === CONTEXT === */
const folder = tp.file.folder(true);
const files = app.vault.getFiles().filter(f => f.parent.path === folder);
const contextMatch = folder.match(/^Worlds\/([^/]+)(?:\/([^/]+))?$/);

if (!contextMatch) {
  new Notice("Sessions must be created inside Worlds/<World>/<Campaign>.");
  return;
}

const currentWorld = contextMatch[1];
const currentCampaign = contextMatch[2] || contextMatch[1];

/* === HELPER: normalize simple frontmatter scalars === */
function normalizeScalar(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
}

/* === HELPER: identify session files reliably for both new and imported notes === */
function getSessionInfo(file) {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter || {};
  const normalizedType = normalizeScalar(frontmatter.type)?.toLowerCase();
  const fileMatch = file.basename.match(/^(\d{3})_(\d{8})$/);
  const frontmatterSessionNum = parseInt(normalizeScalar(frontmatter.sessionNum) || "", 10);

  if (normalizedType !== "session" && !fileMatch) {
    return null;
  }

  const fileSessionNum = fileMatch ? parseInt(fileMatch[1], 10) : NaN;
  const sessionNum = Number.isFinite(fileSessionNum)
    ? fileSessionNum
    : (Number.isFinite(frontmatterSessionNum) ? frontmatterSessionNum : NaN);

  if (!Number.isFinite(sessionNum)) {
    return null;
  }

  return { sessionNum };
}

/* === HELPER: extract content under a heading === */
async function getHeadingContent(file, heading) {
  const content = await app.vault.read(file);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const headingPattern = new RegExp(`^###\\s+${heading}\\s*$`, "i");

  let startIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (headingPattern.test(lines[i])) {
      startIndex = i + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return null;
  }

  let endIndex = lines.length;
  for (let i = startIndex; i < lines.length; i += 1) {
    if (/^#{1,3}\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join("\n").trim();
}

/* === FIND ALL SESSION FILES IN FOLDER === */
let maxNum = 0;
let previousSessionFile = null;

for (const f of files) {
  const sessionInfo = getSessionInfo(f);
  if (sessionInfo) {
    const n = sessionInfo.sessionNum;
    if (n > maxNum) {
      maxNum = n;
      previousSessionFile = f;
    }
  }
}

/* === NEXT SESSION NUMBER === */
const nextSessionNum = String(maxNum + 1).padStart(3, "0");
const today = tp.date.now("YYYYMMDD");
const newFileName = `${nextSessionNum}_${today}`;

/* === RENAME CURRENT FILE === */
await tp.file.rename(newFileName);

/* === BUILD CONTENT === */
tR += "---\n"
tR += "type: session\n"
tR += `campaign: ${currentCampaign}\n`
tR += `world: ${currentWorld}\n`
tR += `sessionNum: ${nextSessionNum}\n`
tR += `summary: ""\n`
tR += `location: \n`
tR += `date: ${tp.date.now("YYYY-MM-DD")}\n`
tR += "---\n"

tR += `# Session ${nextSessionNum}\n\n\n`
tR += `### Session Summary\n\n\n`
tR += `### Recap\n\n`

if (previousSessionFile) {
  const summaryContent = await getHeadingContent(previousSessionFile, "Session Summary");
  if (summaryContent !== null) {
    tR += `← Previous: [[${previousSessionFile.basename}]]\n\n`;
    if (summaryContent) {
      tR += `${summaryContent}\n\n\n`;
    } else {
      tR += `\n`;
    }
  } else {
    tR += `*Previous session summary not found*\n\n\n`;
  }
} else {
  tR += `*No previous session found*\n\n\n`;
}

tR += `### Logs\n\n\n`
%>
