// app/api/send-whatsapp/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { contactName, message } = await req.json();

  try {
    // Generate WhatsApp Web URL
    const phoneNumber = encodeURIComponent(contactName);
    const formattedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${formattedMessage}`;

    // Return WhatsApp Web URL so frontend can open it
    return NextResponse.json({ message: 'WhatsApp message URL generated successfully!', url: whatsappUrl });
  } catch (error) {
    console.error('Error generating WhatsApp message URL:', error);
    return NextResponse.json({ error: 'Failed to generate WhatsApp message URL.' }, { status: 500 });
  }
}
