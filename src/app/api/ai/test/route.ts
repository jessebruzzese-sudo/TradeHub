import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a test assistant.',
        },
        {
          role: 'user',
          content: 'Reply with exactly: TradeHub AI Connected',
        },
      ],
    });

    const message = completion.choices[0]?.message?.content ?? '';

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error('AI TEST ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
