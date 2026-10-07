import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const pb = new PocketBase(env.PB_URL ?? 'https://pb-omni.16w.eu');
pb.autoCancellation(false);
let authenticated = false;

export async function getPocketBase() {
	if (!authenticated || !pb.authStore.isValid) {
		await pb.collection('users').authWithPassword(
			env.PB_USER ?? 'admin@example.com',
			env.PB_PASSWORD ?? 'changeme'
		);
		authenticated = true;
	}
	return pb;
}
