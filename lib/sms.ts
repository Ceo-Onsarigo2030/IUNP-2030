import AfricasTalking from "africastalking";

let atClient: ReturnType<typeof AfricasTalking> | null = null;

function getSmsClient() {
  if (!atClient) {
    atClient = AfricasTalking({
      apiKey: process.env.AFRICASTALKING_API_KEY || "placeholder",
      username: process.env.AFRICASTALKING_USERNAME || "sandbox",
    });
  }
  return atClient;
}

export async function sendOtpSms(phone: string, code: string) {
  const client = getSmsClient();
  const result: any = await client.SMS.send({
    to: [phone],
    message: `Your UniNexus Gala Awards voting code is ${code}. It expires in 5 minutes. Never share this code with anyone.`,
    from: process.env.AFRICASTALKING_SENDER_ID || undefined,
  });

  const recipient = result?.SMSMessageData?.Recipients?.[0];
  if (!recipient || recipient.status !== "Success") {
    throw new Error(
      `Africa's Talking SMS failed for ${phone}: ${recipient?.status || "no recipient in response"} — ${JSON.stringify(result).slice(0, 300)}`
    );
  }
}
