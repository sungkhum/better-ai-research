# Research Skill Graph — Command Center

## 1. Mission

Deep research system that takes ONE question and produces a multi-angle analysis no single prompt could ever match.

Instead of 50 open tabs and scattered notes, this system forces structured thinking through 6 research lenses, each one rethinking the question from a fundamentally different angle.

**Research Question**: [PASTE YOUR QUESTION HERE]
**Scope**: [DEFINE BOUNDARIES — what's in, what's out]
**Time Horizon**: [how far back and forward are we looking?]
**Output Goal**: [what decision does this research inform?]

## Prior Research

Check [[research-log]] for previous research that may connect to this question.
Check [[concepts]] and [[data-points]] for accumulated knowledge from past projects.
Relevant prior projects: [link any related projects, or leave empty for clean slate]

## 2. Node Map

Every node below is a knowledge file. Read the relevant ones before executing any task. The [[wikilinks]] are clickable — follow them.

### Methodology
- [[research-frameworks]] — how to approach different types of questions. start here to pick the right research structure
- [[source-evaluation]] — criteria for judging if a source is worth trusting. tier system from primary data to random blog posts
- [[synthesis-rules]] — how to combine findings across lenses without losing nuance. the hardest part of research
- [[contradiction-protocol]] — what to do when sources disagree. this is where the real insights hide

### Lenses (the core engine)
- [[technical]] — how does it work mechanically? what do the numbers actually say? strip away narrative, look at data
- [[economic]] — follow the money. who pays, who profits, what markets move, what incentives drive behavior
- [[historical]] — what patterns repeat? what's been tried before? what context does everyone forget?
- [[geopolitical]] — which countries, which power dynamics, which alliances and conflicts shape this?
- [[contrarian]] — what if the consensus is wrong? who benefits from the current narrative? what's nobody saying?
- [[first-principles]] — forget everything you think you know. rebuild from fundamental truths only

### Outputs (created per project)
- executive-summary — the final synthesis. 500 words max. what did we learn, what does it mean, what's still unknown
- deep-dive — the full analysis organized by lens, with cross-references and contradictions highlighted
- key-players — people, organizations, countries that matter most on this topic
- open-questions — what we STILL don't know after research. often more valuable than what we found

### Knowledge Base
- [[concepts]] — key terms, definitions, mental models relevant to the research
- [[data-points]] — hard numbers, statistics, metrics collected during research. always with source attribution

### Sources
- [[source-template]] — template for processing raw sources into structured notes

## 3. Execution Protocol

When given a research question, follow these phases in order.

### Phase 1: Preparation
1. Read this file completely — understand the scope and goal
2. Read [[research-log]] for any previous research that connects
3. Read [[concepts]] and [[data-points]] for existing knowledge
4. Create the project folder: `projects/YYYY-MM-DD-topic-slug/`
5. Create `projects/YYYY-MM-DD-topic-slug/README.md` with:
   - Research question
   - Date started
   - Status: in-progress
   - Scope and boundaries
   - Output goal

### Phase 2: Framework & Depth Selection
1. Read [[research-frameworks]] to select the right approach for this question type
2. Read [[source-evaluation]] so you know what counts as good evidence
3. Choose a depth level (Quick Scan / Standard / Deep Dive — see Section 5)
4. Record framework, depth level, and selected lenses in the project README

**If Quick Scan**: pick the 3 most relevant lenses for this question type and skip the rest in Phase 3.
**If Deep Dive**: generate sub-questions for each lens before starting Phase 3.

### Phase 3: Multi-Lens Analysis
For EACH selected lens in order (default: technical → economic → historical → geopolitical → contrarian → first-principles):

1. Read the lens file for its specific angle and questions
2. Research the topic THROUGH that lens only
3. Write findings to `projects/YYYY-MM-DD-topic-slug/lens-[name].md` with:
   - Key findings from this angle
   - Sources used (with tier from [[source-evaluation]])
   - Confidence level: high / medium / low
   - Surprises — what was unexpected from this angle
   - Contradictions with previous lenses
4. Move to the next lens

**CRITICAL RULE**: Each lens must RETHINK the question, not just add more information. The technical lens and the contrarian lens should feel like they were written by two different researchers who disagree with each other. That tension is where insight lives.

### Phase 4: Synthesis
1. Read [[contradiction-protocol]] — resolve or document disagreements between lenses
2. Read [[synthesis-rules]] — combine everything using the structured process
3. Create `projects/YYYY-MM-DD-topic-slug/synthesis.md` containing:
   - One-paragraph summary per lens
   - Agreement map: where 4+ lenses converge (high confidence)
   - Tension map: where lenses disagree (this IS the insight)
   - Second-order insights: what emerges from COMBINING lenses
   - Confidence calibration for each major finding

### Phase 5: Final Output & Knowledge Capture
1. Create `projects/YYYY-MM-DD-topic-slug/executive-summary.md`
   - 500 words max
   - What we learned, what it means, what's still unknown
   - The single most important insight

2. Create `projects/YYYY-MM-DD-topic-slug/deep-dive.md`
   - Full analysis organized by lens
   - Cross-references and contradictions highlighted
   - All sources cited with tiers

3. Create `projects/YYYY-MM-DD-topic-slug/key-players.md`
   - People, organizations, countries that matter most
   - Their positions, incentives, and influence

4. Create `projects/YYYY-MM-DD-topic-slug/open-questions.md`
   - What we STILL don't know after research
   - What evidence would resolve each question
   - Often more valuable than what we found

5. Append new concepts to [[concepts]]
6. Append new data points to [[data-points]]
7. Append project entry to [[research-log]]
8. Update project README status to: complete

## 4. Project Folder Structure

Each completed project contains:
```
projects/YYYY-MM-DD-topic-slug/
├── README.md              # Question, scope, status
├── lens-technical.md      # Technical lens findings
├── lens-economic.md       # Economic lens findings
├── lens-historical.md     # Historical lens findings
├── lens-geopolitical.md   # Geopolitical lens findings
├── lens-contrarian.md     # Contrarian lens findings
├── lens-first-principles.md  # First principles findings
├── synthesis.md           # Cross-lens analysis
├── executive-summary.md   # 500-word summary
├── deep-dive.md           # Full report
├── key-players.md         # Who matters
└── open-questions.md      # What we still don't know
```

## 5. Research Depth Levels

### Quick Scan (30 min)
- 3 lenses maximum (pick the most relevant)
- Top 5 sources only
- Goal: directional understanding, not certainty

### Standard Research (default)
- All 6 lenses
- 15-25 sources across lenses
- Cross-reference findings between lenses
- Goal: informed analysis backed by evidence

### Deep Dive
- All 6 lenses with sub-questions per lens
- 50+ sources including primary data
- Full contradiction resolution
- Goal: publishable analysis, decision-grade intelligence
