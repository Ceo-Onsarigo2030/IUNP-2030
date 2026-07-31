import AfricasTalking from "africastalking";

let atClient: ReturnType<typeof AfricasTalking> | null = null;

function getSmsClient() {
  if (!atClient) {
    // Lazily created — avoids crashing `next build` if AFRICASTALKING_* env vars
    // aren't set yet (same pattern as lib/resend.ts and lib/web-push.ts).
    atClient = AfricasTalking({
      apiKey: process.env.AFRICASTALKING_API_KEY || "placeholder",
      username: process.env.AFRICASTALKING_USERNAME || "sandbox",
    });
  }
  return atClient;
}

export async function sendOtpSms(phone: string, code: string) {
  const client = getSmsClient();
  await client.SMS.send({
    to: [phone],
    message: `Your UniNexus Gala Awards voting code is ${code}. It expires in 5 minutes. Never share this code with anyone.`,
    from: process.env.AFRICASTALKING_SENDER_ID || undefined,
  });
}
