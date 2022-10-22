# automatically fixes module specifier extensions to be compliant with the ESM spec (`module-specifier-extensions`)

The `--fix` option on the command line can automatically fix some of the problems reported by this rule.

## Rule Details

This rule enforces spec-compliant extensions for module specifiers.

## Options

- `ignore`, an array of regular expressions defining patterns that should be excluded from this rule (default: `[]`)
- `remove`, an array of regular expressions defining patterns from which extensions should be removed (default: `[]`)
- `extensions`, a record that maps file extensions to module specifier extensions (default: `{ ".js": ".js", ".ts": ".js" }`)

## Usage

examples of **incorrect** code for this rule with the default options:

```javascript
/* eslint @0x706b/module-specifier-extensions/module-specifier-extensions: "error" */
import X from "./x"
import Y from "@scope/package/file"
```

examples of **correct** code for this rule with the default options:

```javascript
/* eslint @0x706b/module-specifier-extensions/module-specifier-extensions: "error" */
import X from "./x.js"
import Y from "@scope/package/file.js"
```

examples of **incorrect** code for this rule with the `remove` option:

```javascript
/* eslint @0x706b/module-specifier-extensions/module-specifier-extensions: ["error", { "remove": ["^@scope.*$"] }] */
import X from "@scope/package/file.js"
```

examples of **correct** code for this rule with the `remove` option:

```javascript
/* eslint @0x706b/module-specifier-extensions/module-specifier-extensions: ["error", { "remove": ["^@scope.*$"] }] */
import X from "@scope/package/file"
```

