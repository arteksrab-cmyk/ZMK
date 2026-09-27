import express, { Router, type IRouter, type RequestHandler } from "express";
import nodemailer from "nodemailer";
import { SubmitLeadBody, SubmitLeadResponse } from "@workspace/api-zod";
import {
  maxLeadRequestSize,
  parseLeadSubmissionRequest,
} from "../lib/lead-submission";

const router: IRouter = Router();
const recipient = "zmksmsresurs@gmail.com";
const multipartBodyParser = express.raw({
  type: "multipart/form-data",
  limit: maxLeadRequestSize,
});

const parseMultipartBody: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    next();
    return;
  }

  multipartBodyParser(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const errorType =
      typeof error === "object" && error !== null && "type" in error
        ? (error as { type?: unknown }).type
        : undefined;
    const tooLarge = errorType === "entity.too.large";
    req.log.warn({ err: error }, "Invalid lead upload request");
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge
        ? "Суммарный размер файлов не должен превышать 18 МБ."
        : "Не удалось прочитать форму. Проверьте файлы и повторите отправку.",
    });
  });
};

router.post("/leads", parseMultipartBody, async (req, res): Promise<void> => {
  const submission = await parseLeadSubmissionRequest(req);
  if (!submission.ok) {
    req.log.warn({ status: submission.status }, "Invalid lead submission");
    res.status(submission.status).json({ error: submission.error });
    return;
  }

  const parsed = SubmitLeadBody.safeParse(submission.value);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid lead submission");
    res.status(400).json({ error: "Проверьте заполнение формы." });
    return;
  }

  const password = process.env.GMAIL_APP_PASSWORD;
  if (!password) {
    req.log.error("Gmail app password is not configured");
    res.status(503).json({ error: "Отправка заявок временно не настроена." });
    return;
  }

  const sender = process.env.GMAIL_USERNAME ?? recipient;
  const { name, company, phone, email, details } = parsed.data;
  const text = [
    "Новая заявка с сайта ЗМК СМС-РЕСУРС",
    "",
    `Имя: ${name}`,
    `Компания: ${company || "не указана"}`,
    `Телефон: ${phone || "не указан"}`,
    `E-mail: ${email || "не указан"}`,
    "",
    "Задача:",
    details || "не указана",
  ].join("\n");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: sender,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: sender,
      to: recipient,
      replyTo: email || undefined,
      subject: `Заявка на расчёт от ${name}`,
      text,
      attachments: submission.attachments,
    });

    req.log.info("Lead email sent");
    res.json(SubmitLeadResponse.parse({ status: "sent" }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to send lead email");
    res.status(503).json({ error: "Не удалось отправить заявку. Попробуйте ещё раз." });
  }
});

export default router;