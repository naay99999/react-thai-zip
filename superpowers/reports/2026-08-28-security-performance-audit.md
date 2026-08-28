# รายงานตรวจสอบความปลอดภัยและประสิทธิภาพ — `react-thaizip`

- **วันที่:** 2026-08-28
- **ขอบเขต:** `react-thai-zip/` ทั้งแพ็กเกจ (`src/`, `templates/`, `.github/workflows/`, `scripts/`, การ publish ไป npm) รวมถึงโค้ดของ `thaizip` core เท่าที่ template เรียกใช้
- **เวอร์ชันที่ตรวจ:** `react-thaizip@0.3.1` ที่ commit `c616a08`
- **สภาพแวดล้อม:** Node v26.4.0, npm 11.17.0, darwin
- **วิธีตรวจ:** subagent (Sonnet 5) 4 ตัวตรวจแบบขนาน — security ของ CLI core / security ของ template + supply chain / performance ของ CLI / performance ของ React template — แล้วผมตรวจซ้ำ (verify) ทุกข้อที่รุนแรง ก่อนสรุปรวม

---

## 1. สรุปผู้บริหาร

โดยรวมโค้ดอยู่ในสภาพดี: **ไม่มีช่องโหว่ที่เกิดจาก input ที่ผู้โจมตีจากภายนอกส่งเข้ามาได้โดยตรง** — argv ถูก validate กับ allow-list, execa เรียกแบบไม่ผ่าน shell, ชื่อ package ที่ติดตั้งเป็น literal ที่ hardcode ไว้ทั้งหมด, template ไม่มี `dangerouslySetInnerHTML`, tarball ที่ publish สะอาด และ production dependency มี 0 ช่องโหว่

ปัญหาสำคัญที่พบทั้งหมดรวมศูนย์อยู่ที่จุดเดียว: **`thaizip.config.json` ถูกเชื่อใจ 100% โดยไม่ validate ค่าเชิง path** ซึ่งทำให้เกิดทั้งการเขียนไฟล์นอกโปรเจกต์ และการฉีดโค้ดเข้าไปในไฟล์ที่ scaffold ออกมา

| # | ประเภท | ระดับ | หัวข้อ | สถานะยืนยัน |
|---|--------|-------|--------|-------------|
| S1 | Security | 🔴 High | Path traversal จาก `componentDir`/`libDir`/`hooksDir` เขียนไฟล์นอกโปรเจกต์ | ยืนยันแล้ว |
| S2 | Security | 🔴 High | Code injection ผ่าน `libDir`/`hooksDir` เข้าไปใน import specifier ของไฟล์ที่ scaffold | ยืนยันแล้ว (รัน repro) |
| S3 | Security | 🟠 Medium | ไม่มีการตรวจ symlink บน write path → เขียนทะลุออกนอกโปรเจกต์ / ข้าม overwrite guard | ยืนยันจากโค้ด |
| S4 | Correctness | 🟠 Medium | `required` ของ autocomplete ผ่านได้ทั้งที่ยังไม่ได้เลือกที่อยู่จริง | ยืนยันแล้ว (แก้คำกล่าวอ้างของ agent) |
| S5 | Security | 🟡 Low | semver gate ตัด pre-release tag ทิ้ง → `0.7.0-alpha.0` ผ่านเกณฑ์ `>=0.7.0` | ยืนยันแล้ว |
| S6 | Security | 🟡 Low | `rewriteImports` ไม่กรอง `..` ในส่วนท้ายของ specifier (latent) | ยืนยันแล้ว |
| S7 | Robustness | 🟡 Low | `JSON.parse` ไม่มี try/catch → error ดิบแทนข้อความแนะนำ | ยืนยันแล้ว |
| S8 | Supply chain | ⚪ Info | GitHub Actions pin ที่ tag ไม่ใช่ SHA + ไม่มี npm provenance/OIDC | ยืนยันแล้ว |
| S9 | Dependencies | ⚪ Info | dev dependency มี 7 ช่องโหว่ (critical 1) — production 0 | ยืนยันแล้ว (`npm audit`) |
| P1 | Performance | 🔴 High | import `execa`/`prompts` แบบ eager ทำให้ `--help`/`--version` ช้าขึ้น ~25ms | วัดจริง |
| P2 | Performance | 🔴 High | `execa` ลาก 22 transitive packages มาเพื่อ spawn ครั้งเดียว | ยืนยันแล้ว |
| P3 | Performance | 🔴 High | index (~132 KB gzip) โหลดทันทีตอน mount ไม่ได้รอ interaction | ยืนยันจากโค้ด |
| P4 | Performance | 🟠 Medium | sourcemap กินพื้นที่ ~48% ของ tarball ที่ publish | วัดจริง |
| P5 | Performance | 🟠 Medium | อ่าน + parse `package.json` ซ้ำ 5-6 รอบต่อการรัน `add` หนึ่งครั้ง | ยืนยันจากโค้ด |
| P6 | Performance | 🟠 Medium | component ตัวที่ 2 ขึ้นไป กระพริบ skeleton ซ้ำทั้งที่ index cache แล้ว | ยืนยันจากโค้ด |
| P7 | Performance | 🟡 Low | `detectTailwind` อ่านไฟล์ CSS ชุดเดิมซ้ำสองรอบ | ยืนยันจากโค้ด |
| P8 | Performance | 🟡 Low | สร้าง `Intl.Collator` ใหม่ทุกครั้งใน cascade | ยืนยันจากโค้ด |
| P9 | Performance | 🟡 Low | `CascadeField` / handlers ไม่ memo → re-render ~152 item ต่อการคลิก | ยืนยันจากโค้ด |

**สิ่งที่ควรทำก่อน release ถัดไป:** S1 + S2 + S3 (แก้รวมกันได้ด้วย validation ชุดเดียว), แล้วตามด้วย P1 + P2 + P4 ที่เป็นงานเล็กแต่ได้ผลชัด

---

## 2. ข้อสังเกตเรื่อง Threat Model (อ่านก่อนตัดสินใจความรุนแรง)

S1–S3 ทั้งหมดมีเงื่อนไขเดียวกัน: **ผู้โจมตีต้องควบคุมเนื้อหาใน repo ที่เหยื่อกำลังรันคำสั่งอยู่** (ผ่าน PR ที่ถูก merge, repo ที่ clone มา, เพื่อนร่วมทีมที่ถูกเจาะ, หรือ dependency อื่นที่มี postinstall ไปแก้ config)

อาจแย้งได้ว่า "ถ้าเขาแก้ repo ได้แล้ว เขาก็รันโค้ดในเครื่องเหยื่อได้อยู่แล้ว" ซึ่งจริงบางส่วน — แต่ประเด็นสำคัญคือ:

1. `npm install` สมัยใหม่รัน `--ignore-scripts` กันมากขึ้น และ IDE/CI หลายตัวเปิดไฟล์ repo โดยไม่รันโค้ด การมี CLI ที่ *เขียนไฟล์นอก cwd ได้* จึงเป็นการยกระดับสิทธิ์จริง (เช่น เขียนทับ shell config, cache ของ CI runner ที่แชร์กันหลาย job, โปรเจกต์ข้างเคียง)
2. shadcn/ui ซึ่งเป็น prior art ตรงกันของเครื่องมือนี้ ก็ทำ path containment check — ถือเป็น baseline ที่ผู้ใช้คาดหวัง
3. ค่าใช้จ่ายในการแก้ต่ำมาก (~10 บรรทัด) เทียบกับความเสี่ยงตกค้าง

จึงคงระดับ High ไว้ แต่บันทึกเงื่อนไขนี้ไว้ให้ชัดเพื่อการจัดลำดับความสำคัญ

---

## 3. ผลตรวจด้านความปลอดภัย

### S1 — 🔴 High: Path traversal จากค่าใน `thaizip.config.json` เขียนไฟล์นอกโปรเจกต์

- **ไฟล์:** `src/commands/add.ts:115` และ `src/commands/add.ts:154` (มี 2 จุดเขียน), ต้นเหตุที่ `src/utils/config.ts:57-64`

```ts
// add.ts:115
const destination = path.join(cwd, config[file.target.dir], file.target.file)
```

```ts
// config.ts:57-64 — validateConfig ตรวจแค่ว่าเป็น string ที่ไม่ว่าง
if (typeof raw.componentDir !== 'string' || raw.componentDir.length === 0) { ... }
if (typeof raw.libDir !== 'string' || raw.libDir.length === 0) { ... }
if (typeof raw.hooksDir !== 'string' || raw.hooksDir.length === 0) { ... }
```

**สถานการณ์:** `thaizip.config.json` ที่มี `"libDir": "../../../../../../tmp/pwned"` ทำให้ `path.join()` ได้ผลลัพธ์เป็น `/tmp/pwned/utils.ts` ซึ่งอยู่นอก `cwd` โดยสมบูรณ์ จากนั้น `copyFileEnsuringDir` (`src/utils/fs.ts:14-17`) เรียก `mkdir(..., { recursive: true })` แล้ว `copyFile` — สร้างไดเรกทอรีและเขียนไฟล์ได้ทุกที่ที่ process มีสิทธิ์

ที่ทำให้แย่กว่าปกติ: ไฟล์ประเภท `lib`/`hook` ถูกเขียนโดย**ไม่ถามยืนยันเลย**เมื่อยังไม่มีไฟล์อยู่ (prompt overwrite ทำงานเฉพาะตอนไฟล์ปลายทางมีอยู่แล้ว) ดังนั้น `npx react-thaizip add autocomplete --yes` ในโปรเจกต์ที่ถูกวาง config ไว้ = เขียนไฟล์นอกโปรเจกต์แบบเงียบ ๆ

**หมายเหตุที่ตรวจแล้ว:** path แบบ absolute (`"/etc/passwd"`) **ไม่**หลุดออกไป — `path.join('/proj', '/etc/passwd', 'utils.ts')` ให้ `/proj/etc/passwd/utils.ts` มีเฉพาะ `..` เท่านั้นที่หลุด

**วิธีแก้:**
```ts
// ใน validateConfig — ปฏิเสธตั้งแต่ตอนอ่าน config
for (const key of ['componentDir', 'libDir', 'hooksDir'] as const) {
  const v = raw[key] as string
  if (path.isAbsolute(v) || v.split(/[\\/]/).includes('..')) {
    errors.push(`${key}: must be a project-relative path without ".." segments`)
  }
}
```
และเพิ่ม defense-in-depth ที่จุดเขียนทั้งสองใน `add.ts`:
```ts
const root = path.resolve(cwd)
if (!path.resolve(destination).startsWith(root + path.sep)) {
  throw new Error(`Refusing to write outside the project: ${destination}`)
}
```

---

### S2 — 🔴 High: Code injection ผ่าน `libDir`/`hooksDir` เข้าไปในไฟล์ที่ scaffold

- **ไฟล์:** `src/utils/rewriteImports.ts:28-32`

```ts
result = result.replace(pattern, (_match, quote: string, rest: string) => {
  let relative = path.relative(destinationDir, path.join(cwd, config[dirKey], rest)).split(path.sep).join('/')
  if (!relative.startsWith('.')) relative = `./${relative}`
  return `${quote}${relative}${quote}`   // ← ต่อ string ดิบ ไม่ escape
})
```

ค่า `relative` ถูกประกบด้วยเครื่องหมายคำพูดโดยตรง ถ้าค่านั้นมี `'` อยู่ข้างใน มันจะ "หลุดออกจาก string literal" ในไฟล์ `.tsx` ที่เขียนออกมา — และ `'` เป็นตัวอักษรที่ใช้ในชื่อ path บน POSIX ได้ตามปกติ

**Repro ที่รันจริงแล้ว** (`libDir` = `lib'; require('child_process').execSync('touch /tmp/pwned'); '`):

```
EMITTED: import { cn } from '../../lib'; require('child_process').execSync('touch /tmp/pwned'); '/utils'
```

ผลลัพธ์คือ statement ที่รันได้จริง ฝังอยู่ในไฟล์คอมโพเนนต์ของผู้ใช้ และจะทำงานทันทีที่ `next dev` คอมไพล์ไฟล์นั้น — ยกระดับจาก "config ที่ถูกแก้" ไปเป็น "รันโค้ดในเครื่อง dev / ใน CI"

**วิธีแก้ (เลือกอย่างใดอย่างหนึ่ง หรือทำทั้งคู่):**
```ts
return JSON.stringify(relative)   // serialize ให้ถูกต้องเสมอ แทนการต่อ string เอง
```
บวกกับปฏิเสธค่า `libDir`/`hooksDir` ที่มี `'`, `"`, backtick, หรือ newline ตั้งแต่ตอน validate

---

### S3 — 🟠 Medium: ไม่มีการตรวจ symlink บน write path

- **ไฟล์:** `src/utils/fs.ts:5-17`, `src/utils/copyTemplate.ts`

```ts
export async function pathExists(filePath: string): Promise<boolean> {
  try { await access(filePath, constants.F_OK); return true } catch { return false }
}
export async function copyFileEnsuringDir(source: string, destination: string): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(source, destination)
}
```

ยืนยันแล้วว่าไม่มี `lstat` / `realpath` / การตรวจ symlink ที่ใดเลยใน write path ผลกระทบมีสองแบบ:

1. **Dangling symlink ข้าม overwrite guard** — ถ้า `lib/utils.ts` ใน repo เป็น symlink ที่ชี้ไปไฟล์ที่ยังไม่มี `access()` จะ fail → `pathExists` คืน `false` → ระบบคิดว่า "ยังไม่มีไฟล์" ทั้งที่กติกาคือไฟล์ `lib`/`hook` ต้องไม่ถูกเขียนทับเด็ดขาด จากนั้น `copyFile` เดินตาม symlink ไปเขียนที่ปลายทางจริง
2. **Directory symlink** — `components -> ../outside-project` จะไม่ถูกตรวจจับโดย `access`/`mkdir`/`copyFile` เลย ทุกไฟล์จะไปตกนอกโปรเจกต์อย่างเงียบ ๆ (ข้อนี้ทำให้การแก้ S1 แบบเช็ค string อย่างเดียวไม่พอ)

**วิธีแก้:** ใช้ `fs.realpath` บนไดเรกทอรีปลายทางหลัง `mkdir` แล้วยืนยันว่ายังอยู่ใต้ `realpath(cwd)` และใช้ `lstat` แทน `access` ใน `pathExists` เพื่อให้ dangling symlink นับว่า "มีอยู่" (บล็อกการเขียนทับ)

---

### S4 — 🟠 Medium: `required` ของ autocomplete ผ่านได้ทั้งที่ยังไม่ได้เลือกที่อยู่

- **ไฟล์:** `templates/react/ts/thai-address-autocomplete.tsx:274` (required อยู่บน `Combobox.Input`) เทียบกับ `:334-359` (hidden input ทั้ง 4 ตัวไม่มี `required`)

ผู้ใช้พิมพ์ข้อความอิสระโดยไม่เลือกจาก suggestion → `resolvedAddress` ยังเป็น `null` → hidden input ทั้งสี่ (`${name}-subdistrict|-district|-province|-zipcode`) ส่งค่าว่าง แต่ native validation ผ่านเพราะช่องข้อความที่มองเห็นมีตัวอักษรอยู่ ฟอร์ม checkout ที่พึ่ง HTML5 validation จึงส่งที่อยู่เปล่าไป backend ได้

> **แก้คำกล่าวอ้างของ subagent:** agent รายงานว่า cascade-select ใส่ `required` เฉพาะช่องจังหวัด — **ไม่จริง** ตรวจแล้วพบว่าส่งครบทั้งสามช่อง (`thai-address-cascade-select.tsx:327, 346, 363`) ปัญหานี้มีเฉพาะใน autocomplete เท่านั้น

จัดเป็นปัญหาด้าน **data integrity ไม่ใช่ security** — client-side validation ไม่เคยเป็นเส้นแบ่งความปลอดภัยอยู่แล้ว backend ต้อง validate เองเสมอ

**วิธีแก้:** ใส่ `required` บน hidden input ด้วย หรือใช้ `setCustomValidity()` บนช่อง input เมื่อ `resolvedAddress === null` เพื่อไม่ให้ข้อความอิสระผ่าน validation

---

### S5 — 🟡 Low: semver gate ตัด pre-release tag ทิ้ง

- **ไฟล์:** `src/utils/semver.ts:29` — `.split(/[-+]/)[0]`

`0.7.0-alpha.0` ถูกตัดเหลือ `0.7.0` จึงผ่านเกณฑ์ `MINIMUM_THAIZIP_VERSION` ทั้งที่ pre-release อาจยังไม่มี cascade/enumeration API ที่ gate นี้มีไว้เพื่อรับประกัน ผลคือ error ตอน build แทนที่จะถูกจับตั้งแต่ต้น ตามสเปก semver แล้ว pre-release ต้องมีลำดับ **ต่ำกว่า** เวอร์ชันตัวเลขเดียวกันที่ไม่มี pre-release

---

### S6 — 🟡 Low: `rewriteImports` ไม่กรอง `..` ในส่วน specifier (latent)

- **ไฟล์:** `src/utils/rewriteImports.ts:10-11, 29`

regex `([^'"]+)` จับทุกอย่างหลัง `@/lib/` แล้วส่งเข้า `path.join` โดยไม่ปฏิเสธ `..` template ที่ ship อยู่ตอนนี้ใช้แค่ `'@/lib/utils'` และ `'@/hooks/use-thai-address-index'` จึง**ยังไม่ถูก exploit ได้** แต่ template ในอนาคตหรือจาก third-party ที่เขียน `'@/lib/../../../x'` จะทำให้ import ที่ rewrite แล้วชี้ออกนอก `libDir` — เมื่อรวมกับ S1 จะกลายเป็นการชี้ไปยัง module ที่ผู้โจมตีวางไว้ (ไม่พบปัญหา ReDoS — `[^'"]+` เป็น negated character class ที่ไม่มี nested quantifier)

---

### S7 — 🟡 Low: `JSON.parse` ไม่มี try/catch

- **ไฟล์:** `src/utils/config.ts:119`, `src/utils/packageJson.ts:18`

config ที่มี trailing comma หรือ merge conflict ค้างอยู่ จะทำให้ CLI ตายด้วย `SyntaxError` ดิบผ่าน `main().catch()` แทนข้อความ "Invalid thaizip.config.json … re-run init" ที่มีอยู่แล้ว — ไม่ใช่ช่องโหว่ แต่เป็น UX ที่ควรเก็บ

---

### S8 — ⚪ Info: Supply chain ของ CI/release

- **ไฟล์:** `.github/workflows/ci.yml`, `.github/workflows/release-please.yml`

`actions/checkout@v4`, `actions/setup-node@v4`, `googleapis/release-please-action@v4` pin ไว้ที่ major tag ที่เปลี่ยนได้ ไม่ใช่ commit SHA และ `npm publish` ใช้ `NPM_TOKEN` แบบ long-lived ไม่มี `--provenance`/OIDC

**ยังไม่ exploit ได้ตอนนี้** — `ci.yml` ใช้ `pull_request` (ไม่ใช่ `pull_request_target`) โค้ดจาก PR ภายนอกจึงไม่เห็น `NPM_TOKEN` และ job publish รันหลัง release-please merge เข้า main เท่านั้น ความเสี่ยงที่เหลือคือถ้า third-party action ตัวใดถูกเจาะแล้ว retag `@v4` มันจะรันพร้อม `NPM_TOKEN` ในการ release ครั้งถัดไป

**แนะนำ:** pin ที่ SHA (Dependabot ยัง bump ให้ได้), เพิ่ม `permissions: contents: read` ระดับ top-level ใน `ci.yml`, และย้ายไปใช้ npm trusted publisher (`id-token: write` + `--provenance`) เพื่อเลิกใช้ secret ถาวร

---

### S9 — ⚪ Info: `npm audit`

```
npm audit --omit=dev  →  found 0 vulnerabilities     ✅ production สะอาด
npm audit (รวม dev)   →  7 vulnerabilities (3 moderate, 3 high, 1 critical)
```

| severity | package | direct | หมายเหตุ |
|----------|---------|--------|----------|
| critical | vitest ≤3.2.5 | ✅ | Vitest UI server อ่าน/รันไฟล์ได้เมื่อเปิด listen |
| high | vite ≤6.4.2 | ❌ | path traversal ใน optimized deps `.map` |
| high | postcss ≤8.5.22 | ❌ | arbitrary `.map` file read ผ่าน sourceMappingURL |
| high | nanoid ≤3.3.17 | ❌ | infinite loop |
| moderate | esbuild, vite-node, @vitest/mocker | ❌ | dev server เท่านั้น |

ทั้งหมดเป็น devDependency — **ไม่กระทบผู้ใช้ที่ติดตั้ง `react-thaizip`** เพราะ tarball ที่ publish มีแค่ `dist/` + `templates/` และ runtime deps คือ `execa` + `prompts` ที่สะอาด ความเสี่ยงจำกัดอยู่ที่เครื่อง maintainer และ CI ทางแก้คือ `npm audit fix --force` ซึ่งจะอัป vitest เป็น 4.x (breaking — ต้องแก้เทสต์)

---

## 4. ผลตรวจด้านประสิทธิภาพ

### P1 — 🔴 High: import แบบ eager ทำให้ทุกคำสั่งช้าลง รวมถึง `--help`

- **ไฟล์:** `src/cli.ts:3-4` → `src/commands/add.ts` → `src/utils/install.ts` (execa) และ `src/utils/prompt.ts` (prompts)

`cli.ts` import `addComponents`/`initProject` ที่ระดับ module ก่อนจะ parse flag ใด ๆ ดังนั้น `execa` และ `prompts` พร้อม module graph ทั้งชุดจะถูก resolve และ evaluate แม้แต่ตอนรัน `--help`/`--version` ที่ไม่ได้ใช้ทั้งคู่

**ผลวัดจริง (เฉลี่ย 20 รอบ บนเครื่องนี้):**

| คำสั่ง | เวลา |
|--------|------|
| `node dist/cli.js --help` | **52 ms** |
| script `console.log` เปล่า ๆ | **27 ms** |
| ส่วนต่าง (import ที่ไม่ได้ใช้) | **~25 ms (~2 เท่า)** |

**วิธีแก้:** ย้ายการจัดการ `printHelp`/version ขึ้นไปก่อน import ใด ๆ แล้วใช้ `await import('./commands/add.js')` ภายใน branch ที่ใช้จริงเท่านั้น

---

### P2 — 🔴 High: `execa` ลาก 22 packages มาเพื่อ spawn ครั้งเดียว

- **ไฟล์:** `src/utils/install.ts` — มีจุดเรียกแค่ 2 ที่ ทั้งคู่เป็น `execa(cmd[0], cmd.slice(1), { stdio: 'inherit' })`

argv array ถูกประกอบเสร็จแล้วโดย `getPackageManagerCommands` จึงไม่ได้ใช้ความสามารถด้าน escaping/promise-interop ของ execa เลย — `node:child_process.spawn` ทำได้เท่ากันโดยไม่ต้องพึ่ง dependency

| package | transitive deps | unpacked |
|---------|-----------------|----------|
| `execa` | **22** (cross-spawn, human-signals, get-stream, npm-run-path, pretty-ms, signal-exit, figures, which, shebang-command, …) | 656 KB |
| `prompts` | 3 (kleur, sisteransi) | 376 KB |

ทุกครั้งที่ `npx react-thaizip` รันแบบ cold registry ต้อง resolve + ดาวน์โหลด manifest/tarball เพิ่มอีก ~22 ตัวโดยไม่จำเป็น ซึ่งเป็นต้นทุน network round-trip จริงบนเส้นทางที่แพงที่สุดของเครื่องมือนี้

**วิธีแก้:** เขียน wrapper บาง ๆ ครอบ `node:child_process.spawn` (promisify + เช็ค exit code) แล้วถอด `execa` ออกจาก `dependencies`

---

### P3 — 🔴 High: index ~132 KB gzip โหลดทันทีตอน mount

- **ไฟล์:** `templates/react/ts/hooks/use-thai-address-index.ts:21-36`

```ts
useEffect(() => {
  let active = true
  setError(null)
  loadDefaultIndex().then((loaded) => { if (active) setIndex(loaded) })...
}, [generation])
```

ไม่มี gate ที่ focus / pointerdown / visibility เลย — data chunk ~132 KB gzip และการ build index จะทำงานทันทีที่ component เข้า tree แม้จะอยู่ใต้ fold หรือผู้ใช้ไม่เคยแตะเลย

`loadDefaultIndex()` (`thai-zip/src/data/loader.ts:19-24`) dynamic-import `defaultData` (77 จังหวัด / 920 อำเภอ / **7,412 ตำบล** นับจากไฟล์จริง) แล้วรัน `buildThaiAddressIndex` ซึ่งทำ trigram-set insert ~5 ครั้งต่อตำบล (≈37,000 map writes) บวก `normalizeThaiAddressText` อีก 2 ครั้งต่อตำบล

ซ้ำร้าย ทั้งสอง template ล็อก control ทั้งตัวไว้หลังการโหลดนี้ (`thai-address-autocomplete.tsx:127-144` render input เป็น `disabled readOnly` จนกว่า index จะพร้อม) บนฟอร์ม checkout ที่ช่องนี้อยู่เหนือ fold ผู้ใช้จะกดอะไรไม่ได้เลยตลอดช่วงดาวน์โหลด (หลักร้อย ms ถึงหลักวินาทีบน 3G/4G ช้า) แถมยังแย่ง main-thread กับ hydration

**วิธีแก้:** เลื่อน `loadDefaultIndex()` ไปทำตอน `onFocus`/`onPointerDown` ครั้งแรก และเปิด prop `preload` ให้ผู้ที่ต้องการโหลดทันทีเลือกเอง (cache/dedup ระดับ module ที่มีอยู่แล้วยังทำงานเหมือนเดิม)

---

### P4 — 🟠 Medium: sourcemap กิน ~48% ของ tarball

- **ไฟล์:** `tsup.config.ts:8` (`sourcemap: true`)

```
npm pack --dry-run  →  package 33.7 kB (gzip), unpacked 139.4 kB
  dist/cli.js.map    66.3 kB   (47.6% ของ unpacked)
  dist/cli.js        32.9 kB   (23.6%)
```

map ใหญ่กว่าโค้ดที่มัน map — และ CLI ที่รันผ่าน npx ไม่มี devtools มาอ่าน map อยู่แล้ว

**วิธีแก้:** ตั้ง `sourcemap: false` หรือคง sourcemap ไว้สำหรับ build ในเครื่อง แล้วตัด `dist/*.map` ออกจาก `files`

---

### P5 — 🟠 Medium: อ่าน `package.json` ซ้ำ 5-6 รอบต่อการรัน `add`

- **ไฟล์:** `src/utils/packageJson.ts:11-19`, เรียกจาก `src/utils/detectTailwind.ts:38`, `src/commands/add.ts:65` และ `src/commands/add.ts:174-186`

`readPackageJson` ทำ `pathExists` + `readFile` + `JSON.parse` ใหม่ทุกครั้ง ไม่มี cache ระดับการรัน: `detectTailwind` อ่าน 1 ครั้ง → `getMissingDependencies` อ่าน **1 ครั้งต่อ dependency** (สูงสุด 4) ใน `for` loop ที่ `await` แบบเรียงลำดับ (ไม่ใช่ `Promise.all`) → `checkCorePackageVersion` อาจอ่านเป็นรอบที่ 6

**วิธีแก้:** อ่าน/parse ครั้งเดียวต่อการรันแล้วส่งต่อ และเปลี่ยน loop ใน `getMissingDependencies` เป็น `Promise.all`

---

### P6 — 🟠 Medium: component ตัวที่ 2 ขึ้นไปกระพริบ skeleton ซ้ำ

- **ไฟล์:** `templates/react/ts/hooks/use-thai-address-index.ts:25-27`, `thai-zip/src/data/loader.ts:15-16`

`loadDefaultIndex` เป็น `async` แม้แต่ fast path `if (cached) return cached` ก็ resolve ผ่าน microtask ทุก instance ใหม่จึงเริ่มจาก `index === null` และทั้งสอง template ล็อก subtree ไว้ด้วย `if (!index)` (`autocomplete:127`, `cascade:179`) ฟอร์มที่มีทั้งสอง component จึง render skeleton เกินความจำเป็น และเกิดซ้ำทุกครั้งที่ client-side navigation remount → เสี่ยง CLS เล็กน้อย

**วิธีแก้:** export accessor แบบ sync จาก `thaizip/data` เพื่อเช็คสถานะ "warm แล้ว" และใช้ initialize `useState` โดยข้าม effect ไปเลย

---

### P7 — 🟡 Low: `detectTailwind` อ่านไฟล์ CSS ชุดเดิมซ้ำสองรอบ

- **ไฟล์:** `src/utils/detectTailwind.ts:30-67`

loop แรก (31-36) อ่าน `globalCssCandidates` ทั้ง 7 ไฟล์หา `@import` ของ v4; ถ้าเจอ config v3 ทีหลัง loop ที่สอง (48-55) อ่านไฟล์ชุดเดิมซ้ำหา `@tailwind` ทั้งคู่ `await` แบบเรียงลำดับ กรณีแย่สุดคือ 7 + 4 + 7 = **18 fs operation แบบ sequential**

**วิธีแก้:** อ่านทั้งหมดครั้งเดียวด้วย `Promise.all` เก็บไว้ในหน่วยความจำ แล้วเทสต์ทั้ง v4 และ v3 กับเนื้อหาชุดเดียวกัน

---

### P8 — 🟡 Low: สร้าง `Intl.Collator` ใหม่ทุกครั้งใน cascade

- **ไฟล์:** `templates/react/ts/thai-address-cascade-select.tsx:265-278`

`provinces`, `amphures`, `tambons` ต่างสร้าง `new Intl.Collator(...)` ของตัวเองใน `useMemo` สร้างใหม่ทุกครั้งที่เลือกจังหวัด/อำเภอ — น่าสนใจตรงที่ core library เองระบุไว้ชัดว่านี่คือ anti-pattern ที่เคยแก้ไปแล้ว (`thai-zip/src/core/search.ts:9-11`, `enumerate.ts:3-6`: *"Constructing Intl.Collator is expensive… build it once at module load"*) แต่ template กลับนำกลับมาให้ผู้ใช้ปลายทาง

ผลกระทบจริงต่ำมาก (ต่ำกว่า 1 ms ต่อการคลิก) แต่แก้ง่ายและควรสอดคล้องกับ convention ของไลบรารีเอง — hoist เป็น const ระดับ module

---

### P9 — 🟡 Low: `CascadeField` และ handler ไม่ memo

- **ไฟล์:** `templates/react/ts/thai-address-cascade-select.tsx:292-312` (handlers), `:420-489` (`CascadeField`), `:469-481` (`options.map`)

handler ทั้งสามเป็น closure ธรรมดา (ไม่ใช่ `useCallback`) และ `CascadeField` ไม่ได้ห่อ `React.memo` การเปลี่ยน state ใด ๆ ใน parent จะ re-render ทั้งสามช่อง แต่ละช่อง map `options` ผ่าน `cn()` ใหม่หมด รวมสูงสุด 77 (จังหวัด) + 50 (อำเภอสูงสุด: กทม.) + 25 (ตำบลสูงสุดต่ออำเภอ) = **~152 item** ต่อการโต้ตอบหนึ่งครั้ง แม้ช่องนั้นจะไม่ได้เปลี่ยนค่าเลย

ต้นทุนต่อ event ต่ำมาก (เกิดจากการคลิก ไม่ใช่ทุก keystroke) แต่หลีกเลี่ยงได้ฟรีด้วย `React.memo` + `useCallback` เพราะ `provinces`/`amphures`/`tambons` memo ไว้อยู่แล้ว

---

## 5. สิ่งที่ตรวจแล้วไม่พบปัญหา

บันทึกไว้เพื่อให้เห็นความครอบคลุมของการตรวจ

**ความปลอดภัย — CLI**
- `execa` เรียกแบบ argument array ไม่มี `shell: true` → ไม่มีทาง shell injection ไม่ว่าชื่อ package จะเป็นอะไร
- ชื่อ package ที่ติดตั้งทั้งหมดเป็น literal hardcode ใน `src/registry.ts` (`thaizip`, `@base-ui/react`, `clsx`, `tailwind-merge`) ไม่มีอะไรจาก argv/config ไหลเข้าไป → ไม่มี flag injection
- argv parsing: flag ที่ขึ้นต้นด้วย `-` และไม่รู้จัก throw ทันที; positional ไปได้แค่ `resolveRegistryItem` ที่ match กับ alias list คงที่ → argv ไม่มีทางแตะ filesystem layer
- template source path มาจากตาราง `registryItems` เท่านั้น → อ่านไฟล์ใดก็ได้ในฐานะ "template" ไม่ได้
- ไม่มี prototype pollution: `validateConfig`/`migrateLegacyConfig` อ่าน property ทีละชื่อและสร้าง object ใหม่ ไม่มี deep-merge/spread ของ JSON ที่ไม่น่าเชื่อถือ → key `__proto__` ไม่มีผล
- ไม่พบ ReDoS: regex ทุกตัว (`semver.ts` `\d+\.\d+\.\d+`, `rewriteImports.ts`, `tokens.ts` `--background\s*:`) เป็น linear-time ไม่มี nested quantifier
- ไม่มีการโหลด/รันโค้ดจากโปรเจกต์ผู้ใช้: อ่านเป็น text ล้วน ไม่มี dynamic `import()` ของ path ที่มาจากผู้ใช้
- `--yes` ปลอดภัยตามที่ออกแบบ: `confirm()` ที่กันการเขียนทับใช้ `initial: false` เสมอ มีแค่ `--overwrite` เท่านั้นที่ข้ามได้
- ไฟล์ `lib`/`hook` ถูกกันไม่ให้เขียนทับจริงในกรณีปกติ (ยกเว้นช่องทาง symlink ใน S3)
- ไม่มี log ข้อมูลอ่อนไหว env var หรือ token ที่ใดเลย

**ความปลอดภัย — template และ supply chain**
- ไม่มี `dangerouslySetInnerHTML` ในทั้ง 4 ไฟล์ template; ค่าทุกตัว (`texts.*`, `labelTh/labelEn`, `address.*`) render เป็น JSX children/attribute ที่ React escape ให้
- hidden input: `name` ส่งเป็น React prop ที่ React serialize เป็น attribute โดยตรง ไม่ได้ต่อเป็น raw HTML → ไม่มี attribute injection; `value` เป็น string ธรรมดาเสมอ
- `tokens.ts`: CSS เป็น static ทั้งหมด (v3/v4) ไม่ได้มาจาก config → inject CSS ผ่าน config ไม่ได้ และ `ensureTokens` idempotent (ตรวจ marker `--background`/`--input` แล้วข้าม)
- `npm pack --dry-run`: ship 8 ไฟล์พอดี (`dist/cli.js`, `.map`, `package.json`, `README.md`, template 4 ไฟล์) ตรงกับ allow-list ใน `files` — ไม่มี `src/`, tests, หรือเอกสาร design หลุดออกไป
- ไม่มี `preinstall`/`postinstall`/`prepare` ใน `package.json`
- `ci.yml` ไม่ใช้ `pull_request_target`; ไม่มี `${{ github.event.* }}` ที่ผู้โจมตีคุมได้ถูก interpolate เข้า `run:` block
- `scripts/sandbox.mjs` เขียนเฉพาะไฟล์ใต้ `apps/sandbox/` ที่ gitignore ไว้ และไม่ fetch/รันสคริปต์จากเครือข่าย

**ประสิทธิภาพ**
- `resolveWithDependencies` เป็น DFS บน array ที่ hardcode 4 รายการ — O(1) ในทางปฏิบัติ
- การติดตั้ง batch แล้วจริง: `add.ts:99` และ `init.ts:74` ต่างเรียก `installPackage` ครั้งเดียวต่อการรัน และมี `hasPackageDependency` กันการติดตั้งซ้ำ
- ไม่มี directory walk หรือ globbing แบบไม่จำกัดใน `src/` — ทุกการ probe เช็ค candidate list สั้น ๆ ที่คงที่
- `dist/cli.js` 32.9 KB ไฟล์เดียว (`splitting: false`) และ execa/prompts ถูกทิ้งเป็น external ถูกต้อง ไม่ถูก bundle ซ้ำ
- index loading dedup ถูกต้อง: `loadDefaultIndex()` ใช้ singleton `cached`/`inflightPromise` — mount สองคอมโพเนนต์พร้อมกันได้ dynamic import ครั้งเดียว build ครั้งเดียว
- ไม่กระทบ SSR: fetch + build อยู่ใน `useEffect` ของ module `'use client'` — chunk ข้อมูลไม่ถูกแตะระหว่าง server render และ Next.js แยก chunk ให้ผ่าน dynamic `import()`
- การหน่วง mount subtree จนกว่า index จะพร้อมเป็นความตั้งใจ: `useThaiAddressAutocomplete` จะ re-search เมื่อ reference ของ `index` เปลี่ยน การใส่ placeholder แล้วสลับทีหลังจะทำให้ search โดยไม่จำเป็น
- debounce ถูกต้อง: เคลียร์ timer ทุก keystroke, ตอน unmount และก่อน `selectSuggestion`/`clear`/`setQuerySilent` — ไม่มี timer รั่ว
- ไม่มี race condition: `searchThaiAddress` เป็น synchronous ผลลัพธ์เก่าจึงมาทีหลังไม่ได้
- **ไม่จำเป็นต้องทำ virtualization**: จากข้อมูลจริง 77 จังหวัด, อำเภอสูงสุด 50/จังหวัด, ตำบลสูงสุด 25/อำเภอ — popup render ไม่เกิน ~150 item ข้อกังวลเรื่อง "หลายพันรายการ" ไม่เกิดขึ้นจริง
- `filter={null}` บน `Combobox.Root` ถูกต้อง — ปิด filter ของ Base UI ไม่ให้กรองซ้ำผลที่ score/limit มาแล้ว
- suggestion list ถูกจำกัดที่ `limit: 10` โดยค่าเริ่มต้น
- แยก bundle สะอาด: `thaizip` emit 3 entry อิสระ (`index`, `react`, `data`) พร้อม `sideEffects: false`; `enumerate.ts` ไม่ import จาก `search.ts`/`normalizer.ts`/`romanize.ts` เลย cascade จึงไม่ต้องแบกโค้ด trigram/romanization
- import Base UI ผ่าน subpath (`@base-ui/react/combobox`, `/select`) ไม่ใช่ umbrella package
- search ทำงานตามสัดส่วนไม่ใช่ full-scan: ใช้ `Uint32Array` hit-counter จาก postings list ของ trigram ไม่ได้ไล่ทั้ง 7,412 รายการต่อ keystroke
- ไม่มี `addEventListener` ในทั้งสอง template; pattern `active` flag ใน `useThaiAddressIndex` กัน setState หลัง unmount

---

## 6. ลำดับการแก้ที่แนะนำ

**รอบที่ 1 — ก่อน release ถัดไป (ประมาณครึ่งวัน)**
1. **S1 + S2 + S6** แก้รวมกันได้ด้วย validation ชุดเดียว: ปฏิเสธ `..`/absolute path/เครื่องหมายคำพูด ใน `componentDir`/`libDir`/`hooksDir` ที่ `validateConfig`, เพิ่ม path-containment check ที่จุดเขียนทั้งสองใน `add.ts`, เปลี่ยนไปใช้ `JSON.stringify(relative)` ใน `rewriteImports`
2. **S3** ใช้ `lstat` ใน `pathExists` และ `realpath` ยืนยัน containment หลัง `mkdir`
3. เพิ่มเทสต์ regression ทั้งสามเคส (คล้ายที่มีอยู่แล้วสำหรับ symlinked bin)

**รอบที่ 2 — งานเล็กได้ผลชัด (ประมาณ 1-2 ชั่วโมง)**
4. **P4** ปิด sourcemap ในไฟล์ที่ publish → tarball เล็กลงเกือบครึ่ง
5. **P1** ทำ dynamic import ของ command → `--help` เร็วขึ้นเท่าตัว
6. **S5** แก้ semver ให้จัดลำดับ pre-release ถูกต้อง + **S7** ห่อ `JSON.parse` ด้วย try/catch

**รอบที่ 3 — งานที่ต้องคิดเชิงออกแบบ**
7. **P3** เลื่อนโหลด index ไปตอน interaction + prop `preload` — ผลต่อผู้ใช้ปลายทางมากที่สุดในบรรดาข้อ performance ทั้งหมด แต่เป็น behavior change จึงควรออกแบบให้ดีก่อน
8. **P2** ถอด `execa` ไปใช้ `node:child_process.spawn`
9. **P5 + P6 + P7 + P8 + P9** งานเก็บกวาดที่ทำเมื่อแตะไฟล์นั้น ๆ อยู่แล้ว
10. **S8** pin action ที่ SHA และย้ายไป npm trusted publisher; **S9** อัป vitest เมื่อมีเวลาแก้เทสต์
