"use node";

type MpesaEnv = "sandbox" | "production";

type AccessTokenCache = {
  expiresAt: number;
  token: string;
};

let accessTokenCache: AccessTokenCache | null = null;

function getMpesaEnv(): MpesaEnv {
  const env = process.env.MPESA_ENV ?? "sandbox";
  return env === "production" ? "production" : "sandbox";
}

function getBaseUrl(): string {
  return getMpesaEnv() === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const raw = `${shortcode}${passkey}${timestamp}`;
  return btoa(raw);
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (accessTokenCache && accessTokenCache.expiresAt > now + 30_000) {
    return accessTokenCache.token;
  }

  const consumerKey = requireEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = requireEnv("MPESA_CONSUMER_SECRET");
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);

  const response = await fetch(
    `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`M-PESA OAuth failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: string;
  };

  if (!data.access_token) {
    throw new Error("M-PESA OAuth response missing access_token");
  }

  const expiresInSeconds = Number.parseInt(data.expires_in ?? "3599", 10);
  accessTokenCache = {
    expiresAt: now + expiresInSeconds * 1000,
    token: data.access_token,
  };

  return data.access_token;
}

export type StkPushResult = {
  CheckoutRequestID: string;
  CustomerMessage: string;
  MerchantRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
};

export async function initiateStkPush(args: {
  accountReference: string;
  amount: number;
  phone: string;
  transactionDesc: string;
}): Promise<StkPushResult> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const callbackUrl = requireEnv("MPESA_CALLBACK_URL");

  const timestamp = getTimestamp();
  const password = generatePassword(shortcode, passkey, timestamp);
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      body: JSON.stringify({
        AccountReference: args.accountReference.slice(0, 12),
        Amount: args.amount,
        BusinessShortCode: shortcode,
        CallBackURL: callbackUrl,
        PartyA: args.phone,
        PartyB: shortcode,
        Password: password,
        PhoneNumber: args.phone,
        Timestamp: timestamp,
        TransactionDesc: args.transactionDesc.slice(0, 13),
        TransactionType: "CustomerPayBillOnline",
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`M-PESA STK push failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as StkPushResult;

  if (data.ResponseCode !== "0") {
    throw new Error(
      data.ResponseDescription || "M-PESA STK push was rejected",
    );
  }

  if (!data.CheckoutRequestID) {
    throw new Error("M-PESA STK push missing CheckoutRequestID");
  }

  return data;
}

export type StkQueryResult = {
  ResponseCode: string;
  ResponseDescription: string;
  ResultCode?: string;
  ResultDesc?: string;
};

export async function queryStkPush(
  checkoutRequestId: string,
): Promise<StkQueryResult> {
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const timestamp = getTimestamp();
  const password = generatePassword(shortcode, passkey, timestamp);
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${getBaseUrl()}/mpesa/stkpushquery/v1/query`,
    {
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        CheckoutRequestID: checkoutRequestId,
        Password: password,
        Timestamp: timestamp,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`M-PESA STK query failed (${response.status}): ${body}`);
  }

  return (await response.json()) as StkQueryResult;
}
