import { redirect } from '@sveltejs/kit';
import { beginLogin } from '$lib/server/auth.js';

export async function GET({ cookies, url }) {
	throw redirect(302, await beginLogin(cookies, url));
}
