import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth.js';

export function GET({ cookies }) {
	clearSession(cookies);
	throw redirect(302, '/login');
}
