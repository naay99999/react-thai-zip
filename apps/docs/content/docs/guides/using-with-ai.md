---
title: ใช้ react-thaizip กับ AI
description: ให้ AI scaffold และประกอบคอมโพเนนต์ที่อยู่ไทยจากซอร์สจริงในโปรเจกต์
---

ให้ AI ใช้ CLI เพื่อเพิ่มคอมโพเนนต์ลงในโปรเจกต์ React หรือ Next.js แล้วเขียนหน้าฟอร์มโดย import ไฟล์ที่ได้ คอมโพเนนต์เป็นซอร์สในโปรเจกต์ของคุณ ไม่ใช่ runtime export จากแพ็กเกจ `react-thaizip`

## เลือกคอมโพเนนต์

| งานที่ต้องการ | คำสั่ง `add` | คอมโพเนนต์ |
| --- | --- | --- |
| ค้นหาที่อยู่จากข้อความหรือรหัสไปรษณีย์ | `autocomplete` | `ThaiAddressAutocomplete` |
| เลือกจังหวัด → อำเภอ/เขต → ตำบล/แขวง | `cascade-select` | `ThaiAddressCascadeSelect` |
| กรอกบ้านเลขที่และรายละเอียดถนนด้วย | `address-form` | `ThaiAddressForm` |
| แสดงที่อยู่ที่บันทึกไว้ | `address-display` | `ThaiAddressDisplay` |
| ใช้ cascade กับ react-hook-form | `address-form-field` | `ThaiAddressFormField` |

อ่านพฤติกรรมและ props ของแต่ละตัวในหมวด Components ก่อนเลือก โดยเฉพาะรูปแบบ `ResolvedThaiAddress | null`, hidden inputs ของฟอร์ม และการ reset cascade ที่ยังเลือกไม่ครบ

## ขั้นตอนในโปรเจกต์ปลายทาง

รันจากรากโปรเจกต์ React หรือ Next.js ที่ติดตั้ง Tailwind CSS v3 หรือ v4 แล้ว:

```bash
npx react-thaizip init
npx react-thaizip add autocomplete
```

`init` สร้าง `thaizip.config.json` v4 และเลือก template แบบ vanilla หรือ shadcn/ui ตาม `components.json` ของโปรเจกต์ ส่วน `add` ติดตั้ง dependencies และพิมพ์ import path ของไฟล์ที่สร้าง ใช้ path ที่พิมพ์จริง เพราะตำแหน่งไฟล์และนามสกุล `.tsx`/`.jsx` ขึ้นอยู่กับโปรเจกต์ หลีกเลี่ยง `--overwrite` หากยังไม่ได้ตรวจซอร์สที่เคยแก้เอง

## Prompt สำหรับ AI

คัดลอกข้อความนี้ไปให้ coding agent ที่เข้าถึงโปรเจกต์ปลายทางได้ แล้วแทนงานในวงเล็บตามต้องการ:

```text
สร้าง [หน้ากรอกที่อยู่สำหรับ checkout] ในโปรเจกต์นี้ด้วย react-thaizip

1. ตรวจ package.json, Tailwind, components.json และ thaizip.config.json ก่อน
2. ถ้ายังไม่ได้ตั้งค่า ให้รัน npx react-thaizip init จากรากโปรเจกต์
3. เลือกคอมโพเนนต์ที่เหมาะ แล้วรัน npx react-thaizip add <target>
4. ใช้ import path ที่ CLI พิมพ์ออกมา และ import คอมโพเนนต์จากไฟล์ที่ scaffold ในโปรเจกต์
5. ใช้ API ตาม docs ของคอมโพเนนต์นั้น; เมื่อเป็นฟอร์ม ให้จัดการค่า null, validation, submit และ reset
6. อย่าเขียน implementation ของคอมโพเนนต์ที่ CLI สร้างขึ้นใหม่ และอย่าเขียนทับไฟล์เดิมโดยไม่ตรวจ diff
7. รัน typecheck/build ของโปรเจกต์ แล้วสรุปไฟล์ที่สร้างและผลการตรวจ
```

หาก agent อ่านเว็บได้ ให้ส่งลิงก์หน้านี้หรือ `/llms.txt` พร้อมคำสั่งงาน หน้า docs แต่ละหน้ามีปุ่ม Copy Markdown สำหรับส่งเนื้อหาเฉพาะหน้าด้วย

## ตัวอย่างใช้ไฟล์ที่สร้าง

ตัวอย่างนี้สมมติว่า CLI สร้างไฟล์ใน `components/` ที่รากโปรเจกต์ หากโปรเจกต์ใช้ path อื่น ให้ใช้ import path ที่ `add` พิมพ์แทน:

```tsx
'use client'

import { useState } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressAutocomplete } from './components/thai-address-autocomplete'

export function AddressField() {
  const [address, setAddress] = useState<ResolvedThaiAddress | null>(null)

  return (
    <ThaiAddressAutocomplete
      name="address"
      value={address}
      onValueChange={setAddress}
    />
  )
}
```

`onValueChange` ส่ง `null` เมื่อค่าที่เลือกถูกล้าง หากใช้ `name="address"` คอมโพเนนต์จะสร้าง hidden inputs สำหรับ `address-subdistrict`, `address-district`, `address-province` และ `address-zipcode` ดูตัวอย่าง submit ได้ที่ [การใช้งานร่วมกับฟอร์ม](/docs/guides/forms)

## ตรวจงานที่ AI สร้าง

- ไฟล์คอมโพเนนต์มาจาก `add` และ import ชี้ไปยัง path จริงในโปรเจกต์
- `thaizip` ที่ติดตั้งมีเวอร์ชันอย่างน้อย `0.7.5`; dependency และ shadcn primitives ที่ CLI ต้องการติดตั้งครบ
- ฟอร์มรับมือค่า `null`, validation และการล้างค่า; ตรวจชื่อ hidden inputs หรือค่าใน react-hook-form ตามวิธี submit ที่เลือก
- รัน typecheck/build และทดลองเลือกที่อยู่จริงอย่างน้อยหนึ่งรายการ

หากคำสั่งล้มเหลว ดู [การแก้ปัญหา](/docs/troubleshooting), [ข้อมูลอ้างอิง CLI](/docs/reference/cli) และ [การตั้งค่า](/docs/reference/config)
