import { redirect } from '@sveltejs/kit';
import { completeLogin } from '$lib/server/auth.js';

export async function GET({ cookies, url }) {
	try {
		await completeLogin(cookies, url);
		throw redirect(302, '/');
	} catch (error) {
		if (error?.status === 302) throw error;
		throw redirect(302, `/login?error=${encodeURIComponent(error.message)}`);
	}
}
