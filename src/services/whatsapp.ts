export interface WhatsAppInstance {
  id: string;
  token: string;
}

const WUZAPI_URL = process.env.WUZAPI_URL || "http://localhost:8080";
const WUZAPI_ADMIN_TOKEN = process.env.WUZAPI_ADMIN_TOKEN || "master_token_conext";

export class WhatsAppService {
  /**
   * Normaliza para algo próximo de E.164 (apenas dígitos, com DDI se possível).
   *
   * Heurísticas:
   * - aceita "+", "00" e outros caracteres (remove tudo que não é dígito)
   * - remove prefixos internacionais comuns (00...)
   * - corrige caso de "55" digitado duas vezes (ex: 5555...)
   * - se NÃO houver DDI e o número parecer BR (10/11 dígitos), assume "55"
   */
  static normalizePhone(raw: string) {
    let digits = String(raw || "").trim();

    // Mantém apenas dígitos (remove +, espaços, parênteses, hífens, etc.)
    digits = digits.replace(/\D/g, "");

    // Remove prefixo internacional "00" (ex: 0055...)
    if (digits.startsWith("00") && digits.length > 2) {
      digits = digits.slice(2);
    }

    // Remove zeros à esquerda (ex: 0DDDNÚMERO)
    digits = digits.replace(/^0+/, "");

    // Caso comum de usuário digitando "55" duas vezes
    if (digits.startsWith("5555") && digits.length >= 13) {
      digits = digits.substring(2);
    }

    // Se o usuário informar apenas DDD+NÚMERO (BR), adiciona DDI 55
    // 10 dígitos: DDD+8 (fixo antigo) / 11 dígitos: DDD+9 (celular)
    if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
      digits = `55${digits}`;
    }

    // Para números internacionais: exige que o usuário informe DDI.
    // 8..15 dígitos é o range típico E.164 (sem o +). Se ficar fora disso, é inválido.
    if (digits.length < 8 || digits.length > 15) {
      return "";
    }

    return digits;
  }
  /**
   * Cria uma nova instância (usuário) no Wuzapi local
   */
  static async createInstance(name: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = `tok_${Math.random().toString(36).substring(7)}`;
      
      const response = await fetch(`${WUZAPI_URL}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": WUZAPI_ADMIN_TOKEN
        },
        body: JSON.stringify({
          name,
          token
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      return { success: true, token };
    } catch (error: any) {
      console.error("Erro ao criar instância WhatsApp:", error);
      return { success: false, error: error.message };
    }
  }

  static async adminListUsers(): Promise<{ success: boolean; users?: any[]; error?: string }> {
    try {
      const res = await fetch(`${WUZAPI_URL}/admin/users`, {
        headers: { Authorization: WUZAPI_ADMIN_TOKEN },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      const users = Array.isArray(data?.data) ? data.data : [];
      return { success: true, users };
    } catch (error: any) {
      console.error("Erro ao listar users (admin) no Wuzapi:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém o QR Code para conexão
   */
  static async getQrCode(token: string): Promise<{ qr: string | null; status: number; connected?: boolean; loggedIn?: boolean }> {
    try {
      // Primeiro tenta conectar a sessão (Wuzapi exige ApiKeyAuth no header "token")
      await fetch(`${WUZAPI_URL}/session/connect`, {
        method: "POST",
        headers: {
          token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      // Depois pega o QR
      const res = await fetch(`${WUZAPI_URL}/session/qr`, {
        headers: { token },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Wuzapi QR Error (${res.status}):`, text);
        return { qr: null, status: res.status };
      }
      
      const data = await res.json();
      console.log("Wuzapi QR Response Data:", data);
      
      // Resposta padrão do Wuzapi: { data: { QRCode: "data:image/png;base64,..." } }
      const candidate = data?.data?.QRCode ?? data?.data?.qr ?? data?.qr ?? data?.qrcode ?? data?.data;
      const qr = typeof candidate === "string" && candidate.trim().length > 0 ? candidate : null;

      // Se não houver QR, pode ser porque já está logado. Confirma pelo status.
      if (!qr) {
        const st = await WhatsAppService.getStatus(token);
        return { qr: null, status: 200, connected: st.connected, loggedIn: st.loggedIn };
      }

      return { qr, status: 200, connected: false, loggedIn: false };
    } catch (error: any) {
      console.error("Erro ao carregar QR Code (Network/Fetch):", error);
      return { qr: null, status: 500 };
    }
  }

  /**
   * Envia uma mensagem de texto
   */
  static async sendText(
    token: string,
    phone: string,
    text: string
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // Se a sessão não estiver logada, o Wuzapi pode "aceitar" a request mas não entregar.
      const st = await WhatsAppService.getStatus(token);
      if (!st.loggedIn) {
        console.warn("WhatsApp não está logado no Wuzapi. Status:", st.raw);
        return { success: false, error: "WhatsApp da agência não está conectado no momento." };
      }

      // Limpar número (apenas dígitos). Wuzapi espera Phone sem + e sem sufixo.
      const cleanPhone = WhatsAppService.normalizePhone(phone);
      if (!cleanPhone) {
        console.error("Telefone inválido para WhatsApp. Raw:", phone);
        return { success: false, error: "Telefone inválido. Informe com DDI (ex: 55..., 1...)." };
      }

      // Confirma se o número realmente existe no WhatsApp (evita falso "Sent")
      const check = await WhatsAppService.checkUser(token, cleanPhone);
      if (!check.success) {
        console.error("Wuzapi user/check falhou:", check.error);
        return { success: false, error: `Falha ao validar número no WhatsApp: ${check.error}` };
      }
      if (!check.isInWhatsapp) {
        console.warn("Número não possui WhatsApp (Wuzapi user/check). Phone:", cleanPhone, "Raw:", phone);
        return { success: false, error: "Este número não possui WhatsApp (ou não está ativo)." };
      }

      // Preferir JID quando disponível: reduz ambiguidade (ex: números com device suffix)
      const destination = check.jid || cleanPhone;

      const response = await fetch(`${WUZAPI_URL}/chat/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token,
        },
        body: JSON.stringify({
          Phone: destination,
          Body: text,
        }),
      });

      const bodyText = await response.text();
      let parsed: any = null;
      try {
        parsed = bodyText ? JSON.parse(bodyText) : null;
      } catch {}

      if (!response.ok) {
        console.error("Wuzapi sendText HTTP error:", response.status, bodyText);
        return { success: false, error: `Wuzapi erro HTTP ${response.status}`, details: parsed || bodyText };
      }

      // Wuzapi costuma retornar { success: true/false, code: 200, data: {...} }
      const ok = parsed?.success === true;
      if (!ok) {
        console.error("Wuzapi sendText returned non-success payload:", parsed || bodyText);
        return { success: false, error: "Wuzapi retornou falha no envio.", details: parsed || bodyText };
      }
      return { success: true, details: { ...parsed, destination: { input: phone, normalized: cleanPhone, jid: check.jid, used: destination } } };
    } catch (error: any) {
      console.error("Erro ao enviar WhatsApp:", error);
      return { success: false, error: error?.message || String(error) };
    }
  }

  static async checkUser(token: string, phone: string): Promise<{ success: boolean; isInWhatsapp: boolean; jid?: string; raw?: any; error?: string }> {
    try {
      const res = await fetch(`${WUZAPI_URL}/user/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token,
        },
        body: JSON.stringify({ Phone: [phone] }),
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        return { success: false, isInWhatsapp: false, error: `HTTP ${res.status}: ${text}` };
      }

      const u = Array.isArray(parsed?.data?.Users) ? parsed.data.Users[0] : null;
      return {
        success: true,
        isInWhatsapp: Boolean(u?.IsInWhatsapp),
        jid: typeof u?.JID === "string" ? u.JID : undefined,
        raw: parsed,
      };
    } catch (error: any) {
      return { success: false, isInWhatsapp: false, error: error?.message || String(error) };
    }
  }

  static async getStatus(token: string): Promise<{ connected: boolean; loggedIn: boolean; raw?: any }> {
    try {
      const res = await fetch(`${WUZAPI_URL}/session/status`, {
        headers: { token },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Status HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      const d = data?.data || {};
      return {
        // Alguns builds retornam Connected/LoggedIn, outros connected/loggedIn
        connected: Boolean(d.Connected ?? d.connected),
        loggedIn: Boolean(d.LoggedIn ?? d.loggedIn),
        raw: data,
      };
    } catch (error) {
      console.error("Erro ao obter status WhatsApp:", error);
      return { connected: false, loggedIn: false };
    }
  }
}
