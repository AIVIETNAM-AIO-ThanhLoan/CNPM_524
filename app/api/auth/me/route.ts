import { api } from '@/app/lib/http';
import { getCurrentUser } from '@/app/lib/session';

export async function GET() {
    return api(async () => Response.json({ user: await getCurrentUser() }));
}
