# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Build: `npx tsc` - Compiles TypeScript to JavaScript
- Test: Uses Mocha for testing (no npm script defined, run tests directly with Mocha)
- Single test: `npx mocha -r ./mocha.js path/to/test.ts` (if mocha.js exists) or `npx mocha path/to/test.js`

## Architecture Overview

MiniML is a minimal semantic data modeling language that generates SQL queries from YAML model definitions. The architecture follows a pipeline pattern:

### Core Components

1. **Model Loading (`lib/load.ts`)**: 
   - Loads YAML model files and expands metadata definitions
   - Handles dimension and measure expansion with automatic SQL generation
   - Supports dimension aliasing and measure aggregation defaults
   - Infers SQL dialect from file path (bigquery/snowflake)

2. **Query Generation (`lib/query.ts`)**:
   - Transforms model definitions into SQL queries
   - Supports dimensions, measures, filtering, grouping, and ordering
   - Handles date truncation, joins, and filter reference expansion
   - Validates query parameters against model definitions

3. **Template Processing (`lib/jinja.ts`)**:
   - Uses Nunjucks for Jinja-style templating in model info sections
   - Generates dynamic documentation from model metadata

4. **YAML Processing (`lib/yaml.ts`)**:
   - Handles YAML file loading with CommonJS compatibility
   - Provides both async and sync loading functions

### Model Structure

Models are YAML files that define:
- `from`: Base table/view
- `join`: Named join definitions
- `dimensions`: Field definitions for grouping (auto-aliased)
- `measures`: Aggregation definitions (defaults to SUM)
- `dialect`: SQL dialect (bigquery/snowflake)
- `date_field`: Primary date field for filtering
- `where`: Base WHERE clause

### Code Style
- TypeScript with ESNext target and ES modules
- 4-space indentation
- Strict typing enabled
- Uses `.js` extensions in imports for ES module compatibility
- CommonJS dependencies loaded via `createRequire`
- Omit curly braces for if statements with only a single subordinate statement

### Testing
- Mocha test framework
- Test models located in `test/models/` with dialect-specific subdirectories
- Test files follow pattern: `*.test.ts`