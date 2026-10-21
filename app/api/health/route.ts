import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = process.uptime();
  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: 'healthy',
      service: 'Financo - Motor de Conciliación Bancaria',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(startTime),
      environment: process.env.NODE_ENV || 'production',
      checks: {
        api: 'ok',
        engine: 'operational',
        memory: {
          rssMb: Math.round(memory.rss / 1024 / 1024),
          heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        },
        database: process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
          ? 'supabase_configured'
          : 'local_storage_mode',
      },
      protocols: {
        rtoTarget: '≤ 30 minutos',
        rpoTarget: '≤ 1 hora',
        integrityHash: 'SHA-256 enabled',
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
