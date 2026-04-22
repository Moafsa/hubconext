import { prisma } from "@/lib/prisma";
import { MailService } from "./mail";
import { WhatsAppService } from "./whatsapp";

export class NotificationService {
  /**
   * Envia uma notificação imediata para o Admin
   */
  static async notifyAdminInstant(type: 'PROJECT_CREATED' | 'PROJECT_MODIFIED', project: any, details?: string) {
    try {
      const config = await prisma.systemConfig.findUnique({ where: { id: "master" } });
      if (!config) return;

      const adminEmail = config.adminNotificationEmail;
      const adminPhone = config.adminNotificationPhone;

      if (!adminEmail && !adminPhone) {
        console.warn("[NotificationService] Nenhum e-mail ou telefone de admin configurado para notificações.");
        return;
      }

      const subject = type === 'PROJECT_CREATED' ? `🆕 Novo Projeto: ${project.title}` : `📝 Projeto Modificado: ${project.title}`;
      const message = `
        *${subject}*
        
        *Projeto:* ${project.title}
        *Agência:* ${project.agency?.name || 'N/A'}
        *Status:* ${project.status}
        ${details ? `\n*Detalhes:* ${details}` : ''}
        
        Acesse o painel para ver mais detalhes.
      `;

      // Enviar WhatsApp
      if (adminPhone && config.uzapiInstanceId && config.uzapiToken) {
        await WhatsAppService.sendText(config.uzapiToken, adminPhone, message);
      }

      // Enviar E-mail
      if (adminEmail && config.smtpHost && config.smtpUser && config.smtpPass) {
        await MailService.sendMail({
          host: config.smtpHost,
          port: config.smtpPort || 587,
          user: config.smtpUser,
          pass: config.smtpPass,
          from: config.smtpFrom || config.smtpUser
        }, adminEmail, subject, `<div style="font-family: sans-serif;">${message.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<b>$1</b>')}</div>`);
      }

    } catch (error) {
      console.error("[NotificationService] Erro ao notificar admin:", error);
    }
  }

  /**
   * Adiciona uma notificação de comentário à fila para processamento posterior (batch de 1h)
   */
  static async queueCommentNotification(projectId: string, commentText: string, authorName: string) {
    try {
      // Agendar para 1 hora a partir de agora
      const scheduledFor = new Date();
      scheduledFor.setHours(scheduledFor.getHours() + 1);

      await prisma.notificationQueue.create({
        data: {
          type: 'COMMENT',
          projectId,
          content: commentText,
          metadata: { authorName },
          scheduledFor,
          status: 'PENDING'
        }
      });
    } catch (error) {
      console.error("[NotificationService] Erro ao enfileirar comentário:", error);
    }
  }

  /**
   * Processa a fila de notificações e envia batched messages
   */
  static async processQueue() {
    try {
      const config = await prisma.systemConfig.findUnique({ where: { id: "master" } });
      if (!config) return;

      const adminEmail = config.adminNotificationEmail;
      const adminPhone = config.adminNotificationPhone;
      if (!adminEmail && !adminPhone) return;

      // Buscar notificações pendentes que já passaram do horário agendado
      const pending = await prisma.notificationQueue.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() }
        },
        include: { project: { include: { agency: true } } },
        orderBy: { createdAt: 'asc' }
      });

      if (pending.length === 0) return;

      // Agrupar por projeto para enviar um único aviso por projeto
      const groups: Record<string, typeof pending> = {};
      for (const item of pending) {
        if (!groups[item.projectId]) groups[item.projectId] = [];
        groups[item.projectId].push(item);
      }

      for (const projectId in groups) {
        const items = groups[projectId];
        const project = items[0].project;
        
        const subject = `💬 Novas conversas no projeto: ${project.title}`;
        let message = `*${subject}*\n\n`;
        
        items.forEach(item => {
          const author = (item.metadata as any)?.authorName || 'Alguém';
          message += `• *${author}:* ${item.content}\n`;
        });

        message += `\nTotal de ${items.length} novas mensagens.`;

        // Enviar WhatsApp
        if (adminPhone && config.uzapiInstanceId && config.uzapiToken) {
          await WhatsAppService.sendText(config.uzapiToken, adminPhone, message);
        }

        // Enviar E-mail
        if (adminEmail && config.smtpHost && config.smtpUser && config.smtpPass) {
          await MailService.sendMail({
            host: config.smtpHost,
            port: config.smtpPort || 587,
            user: config.smtpUser,
            pass: config.smtpPass,
            from: config.smtpFrom || config.smtpUser
          }, adminEmail, subject, `<div style="font-family: sans-serif;">${message.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<b>$1</b>')}</div>`);
        }

        // Marcar como enviadas
        await prisma.notificationQueue.updateMany({
          where: { id: { in: items.map(i => i.id) } },
          data: { status: 'SENT', sentAt: new Date() }
        });
      }

    } catch (error) {
      console.error("[NotificationService] Erro ao processar fila:", error);
    }
  }
}
