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

/* === HELPER: extract YAML from a file === */
async function getYamlType(file) {
  const content = await app.vault.read(file);
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const yaml = match[1];
  const typeMatch = yaml.match(/^type:\s*(.+)$/m);
  return typeMatch ? typeMatch[1].trim() : null;
}

/* === HELPER: extract content under a heading === */
async function getHeadingContent(file, heading) {
  const content = await app.vault.read(file);
  const regex = new RegExp(`###\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/* === FIND ALL SESSION FILES IN FOLDER === */
let maxNum = 0;
let previousSessionFile = null;

for (const f of files) {
  const type = await getYamlType(f);
  if (type && type.toLowerCase() === "session") {
    const base = f.basename;
    const match = base.match(/^(\d{3})_/);
    if (match) {
      const n = parseInt(match[1]);
      if (n > maxNum) {
        maxNum = n;
        previousSessionFile = f;
      }
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
  if (summaryContent) {
    tR += `← Previous: [[${previousSessionFile.basename}]]\n\n`;
    tR += `${summaryContent}\n\n\n`;
  } else {
    tR += `*Previous session summary not found*\n\n\n`;
  }
} else {
  tR += `*No previous session found*\n\n\n`;
}

tR += `### Logs\n\n\n`
%>
