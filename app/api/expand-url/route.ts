import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const text = await response.text();
    
    // Try to extract coordinates using various patterns
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/, // Standard format
      /center=(-?\d+\.\d+),(-?\d+\.\d+)/, // Center parameter
      /ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // Latitude/Longitude parameter
      /!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/, // Data parameter format
      /viewpoint=(-?\d+\.\d+),(-?\d+\.\d+)/, // Viewpoint parameter
      /data=!3m1!4b1!4m[0-9]+!3m[0-9]+!1s0x[0-9a-f]+:0x[0-9a-f]+!8m2!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/ // Complex data format
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        const [_, lat, lng] = matches;
        return NextResponse.json({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
      }
    }

    // If no coordinates found in the HTML, try to get them from the final URL
    const finalUrl = response.url;
    for (const pattern of patterns) {
      const matches = finalUrl.match(pattern);
      if (matches) {
        const [_, lat, lng] = matches;
        return NextResponse.json({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
      }
    }

    return NextResponse.json({ error: 'Could not extract coordinates from the URL' }, { status: 404 });
  } catch (error) {
    console.error('Error expanding URL:', error);
    return NextResponse.json({ error: 'Failed to expand URL' }, { status: 500 });
  }
} 