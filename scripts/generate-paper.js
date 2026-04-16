#!/usr/bin/env node
/**
 * Research Paper Generator
 *
 * Generates a formatted DOCX research paper from a completed research project.
 * Reads the project's markdown output files and produces a professional document
 * with proper footnotes for all cited sources.
 *
 * Usage:
 *   node scripts/generate-paper.js <project-folder-path>
 *
 * Example:
 *   node scripts/generate-paper.js projects/2026-04-15-douglas-wilson-worldview
 *
 * Expects the project folder to contain:
 *   - README.md (project metadata)
 *   - executive-summary.md
 *   - deep-dive.md
 *   - synthesis.md
 *   - key-players.md
 *   - open-questions.md
 *   - lens-*.md or ##-*.md (lens analysis files)
 *
 * Output: <project-folder>/<title-slug>.docx
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  BorderStyle,
  LevelFormat,
  FootnoteReferenceRun,
  TabStopType,
  TabStopPosition,
} = require("docx");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const projectPath = process.argv[2];
if (!projectPath) {
  console.error("Usage: node scripts/generate-paper.js <project-folder-path>");
  process.exit(1);
}

const absProject = path.resolve(projectPath);
if (!fs.existsSync(absProject)) {
  console.error(`Project folder not found: ${absProject}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Read project files
// ---------------------------------------------------------------------------

function readIfExists(filename) {
  const p = path.join(absProject, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
}

const readme = readIfExists("README.md") || "";
const execSummary = readIfExists("executive-summary.md") || "";
const deepDive = readIfExists("deep-dive.md") || "";
const synthesis = readIfExists("synthesis.md") || "";
const keyPlayers = readIfExists("key-players.md") || "";
const openQuestions = readIfExists("open-questions.md") || "";

// ---------------------------------------------------------------------------
// Footnote registry — collects sources across all content
// ---------------------------------------------------------------------------

class FootnoteRegistry {
  constructor() {
    this.referenced = []; // { id, title, url } — each inline ref gets unique id
    this.catalog = []; // { title, url } — ALL known sources for bibliography (deduplicated)
    this.catalogUrls = new Set();
    this.nextId = 1;
  }

  /**
   * Add a source to the catalog (bibliography) without creating a footnote.
   * Used during lens file pre-scan.
   */
  addToCatalog(title, url) {
    if (!this.catalogUrls.has(url)) {
      this.catalogUrls.add(url);
      this.catalog.push({ title, url });
    }
  }

  /**
   * Register an inline source reference. Returns a unique footnote ID.
   * Each call creates a NEW footnote — Word requires every
   * footnoteReference to map to a unique footnote definition.
   * Also adds to catalog (deduplicated) for the bibliography.
   */
  register(title, url) {
    this.addToCatalog(title, url);
    const id = this.nextId++;
    this.referenced.push({ id, title, url });
    return id;
  }

  /**
   * Build the footnotes config object for the Document constructor.
   * Only includes sources that are actually referenced inline.
   */
  toDocxConfig() {
    const config = {};
    for (const fn of this.referenced) {
      config[fn.id] = {
        children: [
          new Paragraph({
            style: "FootnoteText",
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: fn.title,
                font: "Arial",
                size: 18,
                italics: true,
              }),
              new TextRun({
                text: ". ",
                font: "Arial",
                size: 18,
              }),
              new TextRun({
                text: fn.url,
                font: "Arial",
                size: 18,
                color: "4472C4",
              }),
            ],
          }),
        ],
      };
    }
    return config;
  }
}

// ---------------------------------------------------------------------------
// Markdown parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse markdown text into an array of paragraph descriptors.
 */
function parseMarkdown(md) {
  if (!md) return [];
  const lines = md.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].replace(/\*\*/g, ""),
      });
      i++;
      continue;
    }

    // Blockquote (collect multi-line)
    if (line.trimStart().startsWith("> ")) {
      let quoteText = "";
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteText +=
          (quoteText ? " " : "") + lines[i].trimStart().replace(/^>\s*/, "");
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteText });
      continue;
    }

    // List items (- or numbered)
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    const numListMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (listMatch || numListMatch) {
      const match = listMatch || numListMatch;
      const indent = match[1].length;
      blocks.push({
        type: "list-item",
        text: match[2],
        indent: Math.floor(indent / 2),
        ordered: !!numListMatch,
      });
      i++;
      continue;
    }

    // Table rows (skip header separators)
    if (line.trim().startsWith("|")) {
      if (/^\|[\s-:|]+\|$/.test(line.trim())) {
        i++;
        continue;
      }
      const cells = line
        .trim()
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => c.trim());
      blocks.push({ type: "table-row", cells });
      i++;
      continue;
    }

    // Regular paragraph (collect until blank line or structural element)
    let paraText = line.trim();
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].trimStart().startsWith("> ") &&
      !lines[i].trimStart().startsWith("- ") &&
      !lines[i].trimStart().startsWith("* ") &&
      !lines[i].match(/^\d+\.\s/) &&
      !lines[i].trim().startsWith("|") &&
      !/^---+\s*$/.test(lines[i].trim())
    ) {
      paraText += " " + lines[i].trim();
      i++;
    }
    blocks.push({ type: "paragraph", text: paraText });
  }

  return blocks;
}

/**
 * Convert inline markdown (bold, italic, links, code) to a token array.
 * Links are emitted as { type: "link", text, url } for footnote processing.
 */
function parseInlineFormatting(text, baseStyle = {}) {
  if (!text) return [{ type: "text", text: "", style: { ...baseStyle } }];
  const runs = [];
  // Match **bold**, *italic*, [text](url), `code`
  const regex =
    /(\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
        style: { ...baseStyle },
      });
    }

    if (match[2]) {
      // Bold
      runs.push({
        type: "text",
        text: match[2],
        style: { ...baseStyle, bold: true },
      });
    } else if (match[3]) {
      // Italic
      runs.push({
        type: "text",
        text: match[3],
        style: { ...baseStyle, italics: true },
      });
    } else if (match[4] && match[5]) {
      // Link — will become a footnote
      runs.push({ type: "link", text: match[4], url: match[5] });
    } else if (match[6]) {
      // Code
      runs.push({
        type: "text",
        text: match[6],
        style: { ...baseStyle, font: "Courier New", size: 20 },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push({
      type: "text",
      text: text.slice(lastIndex),
      style: { ...baseStyle },
    });
  }

  return runs.length > 0
    ? runs
    : [{ type: "text", text, style: { ...baseStyle } }];
}

/**
 * Convert parsed inline tokens to docx children.
 * Links become: visible text + superscript footnote reference.
 */
function runsToChildren(parsedRuns, registry) {
  const children = [];
  for (const r of parsedRuns) {
    if (r.type === "link") {
      const fnId = registry.register(r.text, r.url);
      // Render the link text inline, then add footnote reference
      children.push(
        new TextRun({
          text: r.text,
          font: "Arial",
          size: 22,
          italics: true,
        })
      );
      children.push(new FootnoteReferenceRun(fnId));
    } else {
      children.push(
        new TextRun({ text: r.text, font: "Arial", size: 22, ...r.style })
      );
    }
  }
  return children;
}

// ---------------------------------------------------------------------------
// Convert markdown blocks to docx Paragraph array
// ---------------------------------------------------------------------------

function blocksToDocx(blocks, registry) {
  const paragraphs = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const level =
          block.level <= 1
            ? HeadingLevel.HEADING_1
            : block.level === 2
              ? HeadingLevel.HEADING_2
              : block.level === 3
                ? HeadingLevel.HEADING_3
                : HeadingLevel.HEADING_4;
        paragraphs.push(
          new Paragraph({
            heading: level,
            children: [new TextRun({ text: block.text, font: "Arial" })],
          })
        );
        break;
      }

      case "blockquote":
        paragraphs.push(
          new Paragraph({
            indent: { left: 720 },
            spacing: { before: 120, after: 120 },
            border: {
              left: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: "888888",
                space: 10,
              },
            },
            children: runsToChildren(
              parseInlineFormatting(block.text, { italics: true }),
              registry
            ),
          })
        );
        break;

      case "list-item":
        paragraphs.push(
          new Paragraph({
            numbering: {
              reference: block.ordered ? "numbers" : "bullets",
              level: block.indent || 0,
            },
            spacing: { before: 40, after: 40 },
            children: runsToChildren(
              parseInlineFormatting(block.text),
              registry
            ),
          })
        );
        break;

      case "hr":
        paragraphs.push(
          new Paragraph({
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 1,
                color: "CCCCCC",
                space: 8,
              },
            },
            spacing: { before: 200, after: 200 },
            children: [],
          })
        );
        break;

      case "paragraph":
      default:
        paragraphs.push(
          new Paragraph({
            spacing: { before: 80, after: 80, line: 340 },
            children: runsToChildren(
              parseInlineFormatting(block.text),
              registry
            ),
          })
        );
        break;
    }
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Extract title and metadata from README
// ---------------------------------------------------------------------------

function extractMetadata(readmeText) {
  const titleMatch = readmeText.match(/^#\s+(.+)/m);
  const questionMatch = readmeText.match(
    /\*\*Research Question\*\*:\s*(.+?)(?:\n|$)/
  );
  const dateMatch = readmeText.match(/\*\*Date started\*\*:\s*(.+?)(?:\n|$)/);
  const frameworkMatch = readmeText.match(
    /\*\*Framework\*\*:\s*(.+?)(?:\n|$)/
  );
  const depthMatch = readmeText.match(/\*\*Depth\*\*:\s*(.+?)(?:\n|$)/);

  return {
    title: titleMatch ? titleMatch[1] : "Research Paper",
    question: questionMatch ? questionMatch[1] : "",
    date: dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0],
    framework: frameworkMatch ? frameworkMatch[1] : "",
    depth: depthMatch ? depthMatch[1] : "",
  };
}

/**
 * Convert a title to a filename-safe slug.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Post-process DOCX to fix docx-js footnote bugs
// ---------------------------------------------------------------------------

/**
 * Post-process DOCX to fix multiple docx-js bugs that cause Word to
 * show "unreadable content" or repair dialogs.
 *
 * Issues fixed:
 * 1. Separator/continuation footnotes contain invalid <w:footnoteRef/>
 * 2. Empty comments.xml and custom.xml files referenced in Content_Types
 * 3. Empty .rels files for footnotes, comments, endnotes, etc.
 */
function fixDocxXml(docxPath) {
  const tmpDir = path.join(
    require("os").tmpdir(),
    `docx-fix-${Date.now()}`
  );
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    execSync(`unzip -q -o "${docxPath}" -d "${tmpDir}"`);

    // 1. Fix separator footnotes — remove invalid <w:footnoteRef/>
    const fnPath = path.join(tmpDir, "word", "footnotes.xml");
    if (fs.existsSync(fnPath)) {
      let xml = fs.readFileSync(fnPath, "utf-8");
      xml = xml.replace(
        /<w:footnote w:type="separator" w:id="-1">[\s\S]*?<\/w:footnote>/,
        `<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>`
      );
      xml = xml.replace(
        /<w:footnote w:type="continuationSeparator" w:id="0">[\s\S]*?<\/w:footnote>/,
        `<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>`
      );
      fs.writeFileSync(fnPath, xml);
    }

    // 2. Remove empty/vestigial files docx-js creates
    const junkFiles = [
      "word/comments.xml",
      "word/_rels/comments.xml.rels",
      "word/_rels/footnotes.xml.rels",
      "word/_rels/endnotes.xml.rels",
      "word/_rels/fontTable.xml.rels",
      "word/_rels/footer1.xml.rels",
      "word/_rels/header1.xml.rels",
      "docProps/custom.xml",
    ];
    for (const f of junkFiles) {
      const fp = path.join(tmpDir, f);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    // 3. Clean Content_Types.xml — remove references to deleted files
    //    and unused image defaults
    const ctPath = path.join(tmpDir, "[Content_Types].xml");
    if (fs.existsSync(ctPath)) {
      let ct = fs.readFileSync(ctPath, "utf-8");
      // Remove Override entries for deleted files
      ct = ct.replace(/<Override[^>]*PartName="\/word\/comments\.xml"[^>]*\/>/g, "");
      ct = ct.replace(/<Override[^>]*PartName="\/docProps\/custom\.xml"[^>]*\/>/g, "");
      // Remove Default entries for image types (no images in the doc)
      ct = ct.replace(/<Default[^>]*Extension="(png|jpeg|jpg|bmp|gif|svg)"[^>]*\/>/g, "");
      // Remove Default entry for obfuscated fonts
      ct = ct.replace(/<Default[^>]*Extension="odttf"[^>]*\/>/g, "");
      fs.writeFileSync(ctPath, ct);
    }

    // 4. Clean document.xml.rels — remove relationship to comments.xml
    const relsPath = path.join(tmpDir, "word", "_rels", "document.xml.rels");
    if (fs.existsSync(relsPath)) {
      let rels = fs.readFileSync(relsPath, "utf-8");
      rels = rels.replace(/<Relationship[^>]*Target="comments\.xml"[^>]*\/>/g, "");
      fs.writeFileSync(relsPath, rels);
    }

    // Repack
    const tmpOutput = `${docxPath}.tmp`;
    execSync(`cd "${tmpDir}" && zip -q -r "${tmpOutput}" .`);
    fs.renameSync(tmpOutput, docxPath);
  } finally {
    execSync(`rm -rf "${tmpDir}"`);
  }
}

// ---------------------------------------------------------------------------
// Build the document
// ---------------------------------------------------------------------------

async function buildDocument() {
  const meta = extractMetadata(readme);
  const today = meta.date;
  const registry = new FootnoteRegistry();

  // Parse all sections
  const execBlocks = parseMarkdown(execSummary);
  const deepBlocks = parseMarkdown(deepDive);
  const synthBlocks = parseMarkdown(synthesis);
  const playersBlocks = parseMarkdown(keyPlayers);
  const questionsBlocks = parseMarkdown(openQuestions);

  // Pre-scan lens files for sources so they get registered even if not
  // directly referenced in the output files. This ensures the bibliography
  // captures all research sources.
  const lensFiles = fs
    .readdirSync(absProject)
    .filter(
      (f) =>
        (f.startsWith("lens-") || /^\d{2}-/.test(f)) &&
        f.endsWith(".md") &&
        f !== "README.md"
    )
    .sort();
  for (const lf of lensFiles) {
    const content = fs.readFileSync(path.join(absProject, lf), "utf-8");
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let m;
    while ((m = linkRegex.exec(content)) !== null) {
      registry.addToCatalog(m[1], m[2]);
    }
  }

  // Build section content — registry accumulates footnotes as we render
  const children = [];

  // ---- TITLE PAGE ----
  children.push(
    new Paragraph({ spacing: { before: 3600 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: meta.title, font: "Arial", size: 52, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "A Multi-Lens Research Analysis",
          font: "Arial",
          size: 28,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: today,
          font: "Arial",
          size: 24,
          color: "888888",
        }),
      ],
    })
  );

  if (meta.question) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: "Research Question",
            font: "Arial",
            size: 22,
            bold: true,
            color: "333333",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        indent: { left: 1440, right: 1440 },
        children: [
          new TextRun({
            text: meta.question,
            font: "Arial",
            size: 22,
            italics: true,
            color: "444444",
          }),
        ],
      })
    );
  }

  if (meta.framework || meta.depth) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: [meta.framework, meta.depth].filter(Boolean).join("  |  "),
            font: "Arial",
            size: 20,
            color: "888888",
          }),
        ],
      })
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ---- EXECUTIVE SUMMARY ----
  if (execSummary) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: "Executive Summary", font: "Arial" }),
        ],
      })
    );
    const filteredExec = execBlocks.filter(
      (b, i) => !(i === 0 && b.type === "heading")
    );
    children.push(...blocksToDocx(filteredExec, registry));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ---- DEEP DIVE (main body) ----
  if (deepDive) {
    const filteredDeep = deepBlocks.filter(
      (b, i) => !(i === 0 && b.type === "heading" && b.level === 1)
    );
    children.push(...blocksToDocx(filteredDeep, registry));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ---- SYNTHESIS ----
  if (synthesis) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: "Cross-Lens Synthesis", font: "Arial" }),
        ],
      })
    );
    const filteredSynth = synthBlocks.filter(
      (b, i) => !(i === 0 && b.type === "heading")
    );
    children.push(...blocksToDocx(filteredSynth, registry));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ---- KEY PLAYERS ----
  if (keyPlayers) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: "Key Players", font: "Arial" }),
        ],
      })
    );
    const filteredPlayers = playersBlocks.filter(
      (b, i) => !(i === 0 && b.type === "heading")
    );
    children.push(...blocksToDocx(filteredPlayers, registry));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ---- OPEN QUESTIONS ----
  if (openQuestions) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: "Open Questions for Further Research",
            font: "Arial",
          }),
        ],
      })
    );
    const filteredQuestions = questionsBlocks.filter(
      (b, i) => !(i === 0 && b.type === "heading")
    );
    children.push(...blocksToDocx(filteredQuestions, registry));
  }

  // ---- BIBLIOGRAPHY ----
  if (registry.catalog.length > 0) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: "Bibliography", font: "Arial" }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${registry.catalog.length} sources consulted across 6 analytical lenses.`,
            font: "Arial",
            size: 22,
            color: "666666",
            italics: true,
          }),
        ],
      })
    );
    for (const src of registry.catalog) {
      children.push(
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: src.title,
              font: "Arial",
              size: 21,
              italics: true,
            }),
            new TextRun({
              text: `. ${src.url}`,
              font: "Arial",
              size: 19,
              color: "4472C4",
            }),
          ],
        })
      );
    }
  }

  // ---- BUILD DOCUMENT (footnotes are now fully collected) ----
  const footnoteConfig = registry.toDocxConfig();
  const footnoteCount = Object.keys(footnoteConfig).length;

  const doc = new Document({
    footnotes: footnoteConfig,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: "1a1a1a" },
          paragraph: {
            spacing: { before: 360, after: 200 },
            outlineLevel: 0,
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: "Arial", color: "2a2a2a" },
          paragraph: {
            spacing: { before: 280, after: 160 },
            outlineLevel: 1,
          },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: "3a3a3a" },
          paragraph: {
            spacing: { before: 200, after: 120 },
            outlineLevel: 2,
          },
        },
        {
          id: "Heading4",
          name: "Heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 24,
            bold: true,
            italics: true,
            font: "Arial",
            color: "4a4a4a",
          },
          paragraph: {
            spacing: { before: 160, after: 100 },
            outlineLevel: 3,
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "\u2013",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 1440, hanging: 360 } },
              },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: meta.title,
                    font: "Arial",
                    size: 18,
                    color: "999999",
                    italics: true,
                  }),
                ],
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "DDDDDD",
                    space: 4,
                  },
                },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "DDDDDD",
                    space: 4,
                  },
                },
                tabStops: [
                  { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
                ],
                children: [
                  new TextRun({
                    text: "Research Skill Graph Analysis",
                    font: "Arial",
                    size: 18,
                    color: "999999",
                  }),
                  new TextRun({
                    children: ["\tPage ", PageNumber.CURRENT],
                    font: "Arial",
                    size: 18,
                    color: "999999",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const slug = slugify(meta.title);
  const outputPath = path.join(absProject, `${slug}.docx`);
  fs.writeFileSync(outputPath, buffer);

  // Post-process: fix multiple docx-js XML bugs that cause Word repair dialogs.
  fixDocxXml(outputPath);

  console.log(`Research paper generated: ${outputPath}`);
  console.log(`  ${footnoteCount} inline footnotes, ${registry.catalog.length} bibliography entries`);
}

buildDocument().catch((err) => {
  console.error("Error generating paper:", err);
  process.exit(1);
});
