# Research Skill Graph

A local research engine powered by Claude Code CLI and Obsidian. Takes one research question and produces a multi-angle analysis through 6 analytical lenses.

Instead of asking an AI "research X" and getting a surface-level summary, this system gives Claude a structured methodology — source evaluation criteria, synthesis rules, contradiction protocols, and 6 forced analytical perspectives. The result is research that would normally take a team 2 weeks.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (uses your Claude subscription, no API key needed)
- [Obsidian](https://obsidian.md) (free, for viewing the knowledge graph — optional but recommended)

## Quickstart

1. Clone this repo
2. Open a terminal in this folder
3. Run `claude` to start Claude Code
4. Type: "Research: [your question here]"

Claude reads the methodology files, works through each analytical lens, and produces a structured analysis in the `projects/` folder.

## How It Works

The system forces Claude to analyze every topic through 6 lenses:

| Lens | Angle |
|------|-------|
| **Technical** | What do the numbers and data actually say? |
| **Economic** | Follow the money — who pays, who profits? |
| **Historical** | What patterns repeat? What's been tried before? |
| **Geopolitical** | Which power dynamics and alliances shape this? |
| **Contrarian** | What if the consensus is wrong? |
| **First Principles** | Rebuild from fundamental truths only |

Each lens often contradicts the others. That tension between perspectives is where real insight lives.

## Structure

```
├── CLAUDE.md              # Auto-loaded by Claude Code — system brief
├── index.md               # Execution protocol (the command center)
├── research-log.md        # Chronological log of all research
├── methodology/           # How to research
│   ├── research-frameworks.md
│   ├── source-evaluation.md
│   ├── synthesis-rules.md
│   └── contradiction-protocol.md
├── lenses/                # 6 analytical perspectives
│   ├── technical.md
│   ├── economic.md
│   ├── historical.md
│   ├── geopolitical.md
│   ├── contrarian.md
│   └── first-principles.md
├── knowledge/             # Compounds across projects
│   ├── concepts.md
│   └── data-points.md
├── sources/
│   └── source-template.md
└── projects/              # One subfolder per research topic
    └── _example/
```

## Knowledge Compounding

The `knowledge/` folder accumulates findings across all your research projects. After 5 projects, Claude starts each new session with 200+ verified data points and 50+ defined concepts — your research gets better over time.

## Obsidian Integration

Open this folder as an Obsidian vault to see the knowledge graph. Nodes are color-coded:
- Blue: methodology files
- Green: lens files
- Orange: project files
- Purple: knowledge files

## Customization

- Edit lens files to adjust the analytical angles
- Modify `methodology/source-evaluation.md` to change source trust criteria
- Add new lenses by creating a file in `lenses/` and adding it to `index.md`
- Remove the `projects/*` line from `.gitignore` to track your research in git

## Credits

Based on the research skill graph methodology by [@the_smart_ape](https://x.com/the_smart_ape/status/2043262727922053128). Adapted for Claude Code CLI and Obsidian.
