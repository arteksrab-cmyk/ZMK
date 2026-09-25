import { Router, type IRouter } from "express";
import nodemailer from "nodemailer";
import { SubmitLeadBody, SubmitLeadResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const recipient = "zmksmsresurs@gmail.com";

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = SubmitLeadBody.safeParse(req.body);
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
    });

    req.log.info("Lead email sent");
    res.json(SubmitLeadResponse.parse({ status: "sent" }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to send lead email");
    res.status(503).json({ error: "Не удалось отправить заявку. Попробуйте ещё раз." });
  }
});

export default router;