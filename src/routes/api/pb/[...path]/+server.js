import { error, json } from '@sveltejs/kit';
import { getPocketBase } from '$lib/server/pb.js';

async function endpoint({ locals, params, request }, method) {
	if (!locals.user) throw error(401, 'Authentication required');
	const segments = params.path.split('/');
	if (segments[0] !== 'users' || segments.length > 2) throw error(404, 'Not found');
	const pb = await getPocketBase();
	const id = segments[1];
	const body = method === 'POST' || method === 'PATCH' ? await request.json() : undefined;
	const result = method === 'GET'
		? id ? await pb.collection('users').getOne(id) : await pb.collection('users').getFullList()
		: method === 'POST' ? await pb.collection('users').create(body)
		: method === 'PATCH' ? await pb.collection('users').update(id, body)
		: await pb.collection('users').delete(id);
	return method === 'DELETE' ? new Response(null, { status: 204 }) : json(result);
}

export const GET = (event) => endpoint(event, 'GET');
export const POST = (event) => endpoint(event, 'POST');
export const PATCH = (event) => endpoint(event, 'PATCH');
export const DELETE = (event) => endpoint(event, 'DELETE');
