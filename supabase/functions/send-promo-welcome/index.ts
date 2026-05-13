import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailHtml = (email: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
  <style>
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; padding: 0 !important; }
      .content { padding: 20px 16px !important; }
      .header { padding: 28px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FDF2F4; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF2F4;">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <table role="presentation" class="container" width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(232,115,155,0.12);">

          <!-- Pink gradient header -->
          <tr>
            <td class="header" align="center" style="background: linear-gradient(135deg, #FFB6C8, #E8739B); padding: 36px 24px;">
              <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Peptide Lifestyle Program</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 1px; text-transform: uppercase;">Your Trusted Partner</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding: 32px 28px;">
              <p style="margin: 0; font-size: 15px; color: #555; line-height: 1.7;">
                Hi there,
              </p>
              <p style="margin: 16px 0 0; font-size: 15px; color: #333; line-height: 1.7;">
                Welcome and thank you for subscribing to <strong style="color: #E8739B;">Peptide Lifestyle Program</strong>!
              </p>
              <p style="margin: 16px 0 0; font-size: 15px; color: #333; line-height: 1.7;">
                We'll notify you whenever there's a promo available.
              </p>

              <!-- Divider with heart -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td style="height: 1px; background-color: #F5D5DC;"></td>
                  <td style="width: 40px; text-align: center; font-size: 14px; color: #E8739B;">&#10084;</td>
                  <td style="height: 1px; background-color: #F5D5DC;"></td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 15px; color: #555; line-height: 1.7;">
                With love,<br>
                <strong style="color: #333;">Peptide Lifestyle Program Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FDF2F4; padding: 20px 28px; border-top: 1px solid #F5D5DC;">
              <p style="margin: 0; font-size: 12px; color: #bbb; line-height: 1.6; text-align: center;">
                Peptide Lifestyle Program &bull; <a href="https://peptidelifestyleprogram.com" style="color: #E8739B; text-decoration: none;">peptidelifestyleprogram.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Peptide Lifestyle Program <hello@peptidelifestyleprogram.com>",
        to: [email],
        subject: "Welcome PLP Babe 💖",
        html: emailHtml(email),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
