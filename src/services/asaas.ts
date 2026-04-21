const ASAAS_API_KEY = process.env.ASAAS_TOKEN;
const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3";

async function asaasRequest(endpoint: string, method: string = "GET", body?: any) {
  if (!ASAAS_API_KEY) {
    console.warn("⚠️ ASAAS_TOKEN não configurado no .env");
    return null;
  }

  try {
    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Erro no Asaas (${endpoint}):`, data);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`❌ Falha na requisição ao Asaas (${endpoint}):`, error);
    return null;
  }
}

/**
 * Cria um cliente (Agência) no Asaas
 */
export async function createAsaasCustomer(data: { name: string, cnpj: string, email: string }) {
  return await asaasRequest("/customers", "POST", {
    name: data.name,
    cpfCnpj: data.cnpj,
    email: data.email,
    mobilePhone: "", // Opcional
    postalCode: "",  // Opcional
    addressNumber: "",
  });
}

/**
 * Cria uma cobrança (Boleto/Pix) no Asaas
 */
export async function createAsaasPayment(data: { customerId: string, value: number, description: string }) {
  return await asaasRequest("/payments", "POST", {
    customer: data.customerId,
    billingType: "UNDEFINED", // Permite ao cliente escolher Boleto ou Pix
    value: data.value,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 dias de vencimento
    description: data.description,
  });
}

/**
 * Obtém os dados de um pagamento (incluindo URL do boleto e dados Pix)
 */
export async function getAsaasPayment(paymentId: string) {
  return await asaasRequest(`/payments/${paymentId}`);
}
