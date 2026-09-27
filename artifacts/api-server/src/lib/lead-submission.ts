import type { Request } from "express";

const maxProjectFiles = 5;
export const maxProjectFilesSize = 18_000_000;
export const maxLeadRequestSize = maxProjectFilesSize + 128_000;

const textFieldNames = new Set(["name", "company", "phone", "email", "details"]);
const docSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const pdfSignature = Buffer.from("%PDF-");

export type LeadEmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type LeadSubmissionParseResult =
  | { ok: true; value: unknown; attachments: LeadEmailAttachment[] }
  | { ok: false; status: 400 | 413; error: string };

function cleanFilename(filename: string): string {
  const lastPathPart = filename.split(/[\\/]/).pop() ?? "";
  return lastPathPart.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180);
}

function getAttachmentContentType(
  filename: string,
  content: Buffer,
): string | undefined {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (
    extension === "pdf" &&
    content.subarray(0, 1024).includes(pdfSignature)
  ) {
    return "application/pdf";
  }

  if (extension === "doc" && content.subarray(0, 8).equals(docSignature)) {
    return "application/msword";
  }

  if (
    extension === "docx" &&
    content.subarray(0, 4).equals(zipSignature) &&
    content.includes(Buffer.from("[Content_Types].xml")) &&
    content.includes(Buffer.from("word/document.xml"))
  ) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return undefined;
}

export async function parseLeadSubmissionRequest(
  request: Request,
): Promise<LeadSubmissionParseResult> {
  if (!request.is("multipart/form-data")) {
    return { ok: true, value: request.body, attachments: [] };
  }

  if (!Buffer.isBuffer(request.body)) {
    return {
      ok: false,
      status: 400,
      error: "Не удалось получить файлы. Повторите отправку.",
    };
  }

  let formData: FormData;
  try {
    const contentType = request.get("content-type");
    if (!contentType) throw new Error("Missing multipart content type");

    const webRequest = new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "content-type": contentType },
      body: request.body,
    });
    formData = await webRequest.formData();
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Не удалось прочитать форму. Проверьте файлы и повторите отправку.",
    };
  }

  const fields: Record<string, unknown> = {};
  const seenFields = new Set<string>();
  const files: File[] = [];

  for (const [key, value] of formData.entries()) {
    if (key === "files") {
      if (typeof value === "string") {
        return {
          ok: false,
          status: 400,
          error: "Не удалось прочитать один из файлов.",
        };
      }
      files.push(value);
      continue;
    }

    if (
      !textFieldNames.has(key) ||
      typeof value !== "string" ||
      seenFields.has(key)
    ) {
      return {
        ok: false,
        status: 400,
        error: "Проверьте данные формы и повторите отправку.",
      };
    }

    fields[key] = value;
    seenFields.add(key);
  }

  if (files.length > maxProjectFiles) {
    return {
      ok: false,
      status: 400,
      error: "Можно приложить не более 5 файлов.",
    };
  }

  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (totalSize > maxProjectFilesSize) {
    return {
      ok: false,
      status: 413,
      error: "Суммарный размер файлов не должен превышать 18 МБ.",
    };
  }

  const attachments: LeadEmailAttachment[] = [];
  for (const file of files) {
    const filename = cleanFilename(file.name);
    if (!filename || file.size === 0) {
      return {
        ok: false,
        status: 400,
        error: "Пустые файлы или файлы без имени приложить нельзя.",
      };
    }

    let content: Buffer;
    try {
      content = Buffer.from(await file.arrayBuffer());
    } catch {
      return {
        ok: false,
        status: 400,
        error: `Не удалось прочитать файл «${filename}».`,
      };
    }

    const contentType = getAttachmentContentType(filename, content);
    if (!contentType) {
      return {
        ok: false,
        status: 400,
        error: `Файл «${filename}» должен быть PDF или документом Word (.doc/.docx).`,
      };
    }

    attachments.push({ filename, content, contentType });
  }

  return {
    ok: true,
    value: { ...fields, files },
    attachments,
  };
}