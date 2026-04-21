#!/usr/bin/env node

// src/commands/add.ts
import path6 from "path";
import prompts from "prompts";

// src/utils/detectPM.ts
import path2 from "path";

// src/utils/fs.ts
import { access, mkdir, copyFile } from "fs/promises";
import { constants } from "fs";
import path from "path";
async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
async function copyFileEnsuringDir(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

// src/utils/detectPM.ts
var lockfiles = [
  { file: "bun.lockb", pm: "bun" },
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "package-lock.json", pm: "npm" }
];
async function detectPM(cwd = process.cwd()) {
  for (const lockfile of lockfiles) {
    if (await pathExists(path2.join(cwd, lockfile.file))) {
      return lockfile.pm;
    }
  }
  return "npm";
}
function getPackageManagerCommands(pm) {
  switch (pm) {
    case "bun":
      return {
        name: "bun",
        install: ["bun", "install"],
        add: (packages, dev = false) => ["bun", "add", ...dev ? ["-d"] : [], ...packages],
        exec: (args) => ["bunx", ...args]
      };
    case "pnpm":
      return {
        name: "pnpm",
        install: ["pnpm", "install"],
        add: (packages, dev = false) => ["pnpm", "add", ...dev ? ["-D"] : [], ...packages],
        exec: (args) => ["pnpm", "exec", ...args]
      };
    case "yarn":
      return {
        name: "yarn",
        install: ["yarn", "install"],
        add: (packages, dev = false) => ["yarn", "add", ...dev ? ["-D"] : [], ...packages],
        exec: (args) => ["yarn", ...args]
      };
    case "npm":
    default:
      return {
        name: "npm",
        install: ["npm", "install"],
        add: (packages, dev = false) => ["npm", "install", ...dev ? ["--save-dev"] : [], ...packages],
        exec: (args) => ["npm", "exec", "--", ...args]
      };
  }
}

// src/utils/detectProjectStructure.ts
import path3 from "path";
async function detectProjectStructure(cwd = process.cwd()) {
  if (await pathExists(path3.join(cwd, "app"))) {
    const directory2 = path3.join(cwd, "app", "components");
    return {
      structure: "app-router",
      directory: directory2,
      filePath: path3.join(directory2, "ThaiAddressAutocomplete.tsx")
    };
  }
  if (await pathExists(path3.join(cwd, "pages"))) {
    const directory2 = path3.join(cwd, "components");
    return {
      structure: "pages-router",
      directory: directory2,
      filePath: path3.join(directory2, "ThaiAddressAutocomplete.tsx")
    };
  }
  const directory = path3.join(cwd, "src", "components");
  return {
    structure: "fallback",
    directory,
    filePath: path3.join(directory, "ThaiAddressAutocomplete.tsx")
  };
}

// src/utils/detectTailwind.ts
import path4 from "path";
var tailwindConfigFiles = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.cjs",
  "tailwind.config.mjs"
];
async function detectTailwind(cwd = process.cwd()) {
  for (const configFile of tailwindConfigFiles) {
    if (await pathExists(path4.join(cwd, configFile))) {
      return true;
    }
  }
  return false;
}

// src/utils/install.ts
import { execa } from "execa";
async function installPackage(packages, options) {
  const command = getPackageManagerCommands(options.pm).add(packages, options.dev);
  await execa(command[0], command.slice(1), {
    cwd: options.cwd,
    stdio: "inherit"
  });
}
async function runPackageManagerExec(args, options) {
  const command = getPackageManagerCommands(options.pm).exec(args);
  await execa(command[0], command.slice(1), {
    cwd: options.cwd,
    stdio: "inherit"
  });
}

// src/utils/installTailwind.ts
async function installTailwind(options) {
  await installPackage(["tailwindcss", "postcss", "autoprefixer"], {
    cwd: options.cwd,
    pm: options.pm,
    dev: true
  });
  await runPackageManagerExec(["tailwindcss", "init", "-p"], options);
}

// src/utils/copyTemplate.ts
import path5 from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
var currentFile = fileURLToPath(import.meta.url);
var currentDir = path5.dirname(currentFile);
function getTemplatePath() {
  const candidates = [
    path5.resolve(currentDir, "..", "templates", "react", "ThaiAddressAutocomplete.tsx"),
    path5.resolve(currentDir, "..", "..", "templates", "react", "ThaiAddressAutocomplete.tsx")
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}
async function copyTemplate(options) {
  const exists = await pathExists(options.destination);
  if (exists && !options.overwrite) {
    return "skipped";
  }
  await copyFileEnsuringDir(options.templatePath ?? getTemplatePath(), options.destination);
  return "copied";
}

// src/commands/add.ts
async function addAutocomplete(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const pm = await detectPM(cwd);
  const destination = await detectProjectStructure(cwd);
  console.log(`Detected package manager: ${pm}`);
  console.log(`Component destination: ${path6.relative(cwd, destination.filePath)}`);
  const hasTailwind = await detectTailwind(cwd);
  if (!hasTailwind) {
    const response = await prompts({
      type: "confirm",
      name: "install",
      message: "Tailwind not detected. Install it?",
      initial: true
    });
    if (!response.install) {
      console.log("\nTailwind CSS is required for the generated component styles.");
      console.log("Install it manually, then run this command again:");
      console.log("  npm install -D tailwindcss postcss autoprefixer");
      console.log("  npx tailwindcss init -p");
      process.exitCode = 1;
      return;
    }
    try {
      await installTailwind({ cwd, pm });
    } catch (error) {
      console.error("\nFailed to install Tailwind CSS.");
      console.error("Install it manually, then run this command again:");
      console.error("  npm install -D tailwindcss postcss autoprefixer");
      console.error("  npx tailwindcss init -p");
      if (error instanceof Error) {
        console.error(`
${error.message}`);
      }
      process.exitCode = 1;
      return;
    }
  }
  try {
    await installPackage(["thaizip"], { cwd, pm });
  } catch (error) {
    console.error("\nFailed to install thaizip.");
    console.error(`Install it manually with your package manager, then run this command again:`);
    console.error(`  ${pm === "npm" ? "npm install thaizip" : `${pm} add thaizip`}`);
    if (error instanceof Error) {
      console.error(`
${error.message}`);
    }
    process.exitCode = 1;
    return;
  }
  let overwrite = false;
  if (await pathExists(destination.filePath)) {
    const response = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `${path6.relative(cwd, destination.filePath)} already exists. Overwrite?`,
      initial: false
    });
    overwrite = Boolean(response.overwrite);
  }
  const copied = await copyTemplate({
    destination: destination.filePath,
    overwrite
  });
  if (copied === "skipped") {
    console.log("\nSkipped writing component.");
    return;
  }
  const importPath = `./${path6.relative(cwd, destination.filePath).replace(/\\/g, "/").replace(/\.tsx$/, "")}`;
  console.log("\nThaiAddressAutocomplete added successfully.");
  console.log(`
Import it from:`);
  console.log(`  import { ThaiAddressAutocomplete } from '${importPath}'`);
  console.log("\nUsage:");
  console.log(`  <ThaiAddressAutocomplete onSelect={(address) => console.log(address)} />`);
}

// src/cli.ts
import { pathToFileURL } from "url";
async function main(argv = process.argv.slice(2)) {
  const [command, target] = argv;
  if (command === "add" && target === "autocomplete") {
    await addAutocomplete();
    return;
  }
  console.error("Unknown command. Available: add autocomplete");
  process.exitCode = 1;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  });
}
export {
  main
};
//# sourceMappingURL=cli.js.map