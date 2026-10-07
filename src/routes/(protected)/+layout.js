import { redirect } from '@sveltejs/kit';

export function load({ parent }) {
	return parent().then(({ user }) => {
		if (!user) throw redirect(303, '/login');
		return { user };
	});
}
