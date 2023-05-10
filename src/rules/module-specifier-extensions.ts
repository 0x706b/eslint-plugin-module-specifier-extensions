import { AST_NODE_TYPES, ESLintUtils, TSESTree } from "@typescript-eslint/experimental-utils"
import fs from "fs"
import module from "module"
import path from "path"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require("../package.json").version

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/0x706b/eslint-plugin-module-specifier-extensions/blob/v${version}/docs/rules/${name}.md`,
)

interface Options {
  ignore: Array<RegExp>
  extensions: Record<string, string>
  remove: Array<RegExp>
  force: Array<RegExp>
}

export default createRule({
  name: "module-specifier-extensions",
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce module specifier extensions",
      recommended: "warn",
    },
    fixable: "code",
    messages: {
      missingExtension: "Missing extension '{{ extension }}'",
      extraneousExtension: "Extraneous extension '{{ extension }}'",
    },
    schema: [
      {
        type: "object",
        properties: {
          ignore: {
            type: "any",
          },
          remove: {
            type: "any",
          },
          extensions: {
            type: "object",
          },
          force: {
            type: "any",
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      ignore: [],
      extensions: {
        ".js": ".js",
        ".ts": ".js",
      },
      remove: [],
      force: [],
    } as Options,
  ],
  create(context, optionsWithDefaults) {
    let _a, _b
    let { ignore, remove, force } = optionsWithDefaults[0]
    const { extensions } = optionsWithDefaults[0]
    if (Array.isArray(ignore)) {
      ignore = ignore
        .map((v) => (typeof v === "string" ? new RegExp(v) : v instanceof RegExp ? v : undefined))
        .filter((regExp): regExp is RegExp => !!regExp)
    } else if (typeof ignore === "string") {
      ignore = [new RegExp(ignore)]
    } else {
      ignore = []
    }
    if (Array.isArray(remove)) {
      remove = remove
        .map((v) => (typeof v === "string" ? new RegExp(v) : v instanceof RegExp ? v : undefined))
        .filter((regExp): regExp is RegExp => !!regExp)
    } else if (typeof remove === "string") {
      remove = [new RegExp(remove)]
    } else {
      remove = []
    }
    if (Array.isArray(force)) {
      force = force
        .map((v) => (typeof v === "string" ? new RegExp(v) : v instanceof RegExp ? v : undefined))
        .filter((regExp): regExp is RegExp => !!regExp)
    } else if (typeof force === "string") {
      remove = [new RegExp(force)]
    } else {
      remove = []
    }
    const options = {
      ignore,
      extensions,
      remove,
      force,
    }
    const sourcePath = context.getPhysicalFilename?.() ?? context.getFilename()
    const moduleSpecifiers: Array<TSESTree.StringLiteral> = []
    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") {
          return
        }
        if (module.builtinModules.includes(node.source.value)) {
          return
        }
        for (const pattern of ignore) {
          if (pattern.test(node.source.value)) {
            return
          }
        }
        moduleSpecifiers.push(node.source)
      },
      ExportNamedDeclaration(node) {
        if (node.exportKind === "type") {
          return
        }
        if (node.source) {
          for (const pattern of ignore) {
            if (pattern.test(node.source.value)) {
              return
            }
          }
          moduleSpecifiers.push(node.source)
        }
      },
      ExportAllDeclaration(node) {
        if (node.exportKind === "type") {
          return
        }
        if (node.source) {
          for (const pattern of ignore) {
            if (pattern.test(node.source.value)) {
              return
            }
          }
          moduleSpecifiers.push(node.source)
        }
      },
      ["Program:exit"]() {
        moduleSpecifiers.forEach((node) => {
          check(node, sourcePath)
        })
      },
    }
    function check(node: TSESTree.StringLiteral, sourceFilePath: string) {
      const specifier = node.value
      if (isPathExtensionEmpty(specifier)) {
        if (isPathRelative(specifier) || options.force.some((regex) => regex.test(specifier))) {
          const newSpeciferPath = createValidESMPath(specifier, "", sourceFilePath, options)
          if (newSpeciferPath !== specifier) {
            context.report({
              loc: node.loc,
              messageId: "missingExtension",
              data: {
                extension: newSpeciferPath.endsWith("/index.js") ? "/index.js" : path.extname(newSpeciferPath),
              },
              fix: (fixer) => fixer.replaceText(node, surroundWithQuotes(node.raw, newSpeciferPath)),
            })
          }
        }
      } else {
        for (const pattern of remove) {
          if (pattern.test(specifier)) {
            const parsedSpecifier = path.parse(specifier)
            context.report({
              loc: node.loc,
              messageId: "extraneousExtension",
              data: {
                extension: path.extname(specifier),
              },
              fix: (fixer) =>
                fixer.replaceText(node, surroundWithQuotes(node.raw, `${parsedSpecifier.dir}/${parsedSpecifier.name}`)),
            })
          }
        }
      }
    }
  },
})

function surroundWithQuotes(original: string, modified: string) {
  if (original.startsWith("'")) {
    return `'${modified}'`
  } else {
    return `"${modified}"`
  }
}

function isFile(path: string) {
  try {
    return fs.lstatSync(path).isFile()
  } catch {
    return false
  }
}

function isPathRelative(filePath: string) {
  return filePath.startsWith("./") || filePath.startsWith("../") || filePath.startsWith("..")
}

function isPathExtensionEmpty(filePath: string) {
  return path.extname(filePath) === ""
}

function createValidESMPath(specifier: string, resolvedPath: string, sourceFilePath: string, options: Options) {
  if (isPathExtensionEmpty(specifier)) {
    if (isPathRelative(specifier)) {
      resolvedPath = path.resolve(path.parse(sourceFilePath).dir, specifier === ".." ? "../" : specifier)
    }
    for (const extension in options.extensions) {
      if (isFile(resolvedPath + extension)) {
        return specifier + options.extensions[extension]
      }
    }
  }
  return specifier
}
