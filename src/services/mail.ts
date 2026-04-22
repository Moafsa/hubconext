import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { promises as dns } from "dns";
import net from "net";

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
}

export class MailService {
  private static logDebug(message: string, data?: any) {
    try {
      const logDir = path.join(process.cwd(), "temp");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
      const logFile = path.join(logDir, "postmark-debug.log");
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ""}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (e) {
      console.error("Erro ao gravar log:", e);
    }
  }

  /**
   * Envia um e-mail usando o melhor método disponível (API para Postmark, SMTP para outros).
   */
  static async sendMail(config: MailConfig, to: string, subject: string, html: string) {
    const isPostmark = config.host.toLowerCase().includes("postmark");
    const isGmail = config.host.toLowerCase().includes("gmail");
    const fromEmail = config.from && config.from.includes("@") ? config.from : config.user;

    this.logDebug("Iniciando envio híbrido", { host: config.host, to, provider: isPostmark ? "Postmark API" : (isGmail ? "Gmail SMTP" : "Generic SMTP") });

    if (isPostmark) {
      return this.sendViaPostmarkAPI(config, fromEmail, to, subject, html);
    } else {
      return this.sendViaSMTP(config, fromEmail, to, subject, html);
    }
  }

  /**
   * Método robusto via SMTP (Nodemailer)
   */
  private static async sendViaSMTP(config: MailConfig, from: string, to: string, subject: string, html: string) {
    try {
      const transporterConfig: any = {
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass
        },
        // Evita timeout quando o host resolve primeiro para IPv6 em ambientes Docker sem egress IPv6
        family: 4,
        // Timeouts mais curtos para não travar o painel em caso de rede bloqueada
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
        socketTimeout: 20_000,
        tls: {
          rejectUnauthorized: false
        }
      };

      // Otimização para Gmail
      if (config.host.toLowerCase().includes("gmail")) {
        delete transporterConfig.host;
        delete transporterConfig.port;
        transporterConfig.service = "gmail";
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      const info = await transporter.sendMail({
        from: `"${from}" <${from}>`,
        to,
        subject,
        html
      });

      this.logDebug("Sucesso SMTP:", { messageId: info.messageId, response: info.response });
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      const errorMsg = error.message || "Erro SMTP desconhecido";
      this.logDebug("Falha SMTP:", errorMsg);
      
      let friendlyError = errorMsg;
      if (errorMsg.includes("535") || errorMsg.includes("Invalid login")) {
        friendlyError = "Erro de Autenticação: Verifique se o usuário/senha estão corretos. No Gmail, use uma 'Senha de App'.";
      } else if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ETIMEDOUT") || errorMsg.includes("ENOTFOUND")) {
        const suggestions = await this.getSmtpSuggestions(config.host, config.user);
        
        if (errorMsg.includes("ENOTFOUND")) {
          friendlyError = "Erro de DNS: O Host SMTP informado não foi encontrado.";
        } else {
          friendlyError = "Erro de Conexão: O servidor de e-mail não respondeu na porta escolhida.";
        }

        if (suggestions.length > 0) {
          friendlyError += ` Sugestão: Tente usar um destes servidores: ${suggestions.join(", ")}`;
        } else {
          friendlyError += " Verifique se o endereço e a porta estão corretos.";
        }
      }

      return { success: false, error: friendlyError };
    }
  }

  /**
   * Tenta encontrar sugestões de hosts SMTP baseadas no domínio.
   */
  private static async getSmtpSuggestions(host: string, user: string): Promise<string[]> {
    try {
      // Tentar extrair o domínio (lidando com mail.dominio.com.br)
      let domain = "";
      
      // 1. Prioridade para o domínio do e-mail do usuário
      if (user.includes("@")) {
        domain = user.split("@")[1];
      } 
      // 2. Fallback para o domínio do host atual
      else if (host.includes(".")) {
        const parts = host.split(".");
        if (parts.length >= 2) {
          // Pega os últimos 2 ou 3 segmentos (lidando com .com.br)
          domain = parts.slice(-3).join(".");
          if (domain.split(".").length > 3) domain = parts.slice(-2).join(".");
        }
      }

      if (!domain) return [];

      // Configurar servidores DNS confiáveis para garantir a resolução em qualquer ambiente
      try {
        const { setServers } = require("dns");
        setServers(["8.8.8.8", "1.1.1.1"]);
      } catch (e) {
        this.logDebug("Erro ao configurar servidores DNS:", e);
      }

      this.logDebug("Buscando MX para sugestão:", domain);
      const records = await dns.resolveMx(domain);
      return records
        .sort((a, b) => a.priority - b.priority)
        .map(r => r.exchange)
        .slice(0, 2); // Retorna top 2
    } catch (e) {
      this.logDebug("Falha ao buscar MX para sugestão", e);
      return [];
    }
  }

  /**
   * Método via API Postmark (HTTPS)
   */
  private static async sendViaPostmarkAPI(config: MailConfig, from: string, to: string, subject: string, html: string) {
    try {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": config.pass,
          "X-PM-Message-Stream": "outbound"
        },
        body: JSON.stringify({
          From: from,
          To: to,
          Subject: subject,
          HtmlBody: html,
          MessageStream: "outbound"
        })
      });

      const data = await response.json();
      this.logDebug("Resposta Postmark API:", { status: response.status, data });

      if (!response.ok) {
        return { success: false, error: data.Message || `Erro Postmark: ${response.status}` };
      }

      return { success: true, messageId: data.MessageID };
    } catch (error: any) {
      this.logDebug("Erro crítico API Postmark:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Testa a conexão conforme o provedor, com tentativa de correção automática.
   */
  static async testConnection(config: MailConfig): Promise<{ success: boolean; messageId?: string; error?: string; autoAdjustedHost?: string }> {
    const fromEmail = config.from && config.from.includes("@") ? config.from : config.user;
    const initialResult = await this.sendMail(config, fromEmail, "Teste de Conexão SMTP/API", "<p>Sua configuração está funcionando!</p>");

    // Se falhar e for erro de DNS/Conexão, tentar correção automática
    if (!initialResult.success && initialResult.error && (initialResult.error.includes("DNS") || initialResult.error.includes("Conexão"))) {
      this.logDebug("Iniciando tentativa de correção automática de Host...");
      const suggestions = await this.getSmtpSuggestions(config.host, config.user);
      
      for (const suggestion of suggestions) {
        if (suggestion === config.host) continue;

        this.logDebug("Tentando fallback automático para:", suggestion);
        const fallbackConfig = { ...config, host: suggestion };
        const fallbackResult = await this.sendMail(fallbackConfig, fromEmail, "Teste de Conexão (Correção Automática)", "<p>Este e-mail foi enviado após corrigirmos o Host automaticamente.</p>");
        
        if (fallbackResult.success) {
          return { 
            ...fallbackResult, 
            autoAdjustedHost: suggestion 
          };
        }
      }
    }

    return initialResult;
  }
}
