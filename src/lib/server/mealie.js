import { env } from '$env/dynamic/private';

function getConfig() {
	const baseUrl = env.MEALIE_URL?.replace(/\/$/, '');
	const token = env.MEALIE_API_TOKEN;
	return baseUrl && token ? { baseUrl, token } : null;
}

async function mealieFetch(path) {
	const config = getConfig();
	if (!config) return null;

	const response = await fetch(`${config.baseUrl}/api${path}`, {
		headers: { accept: 'application/json', authorization: `Bearer ${config.token}` }
	});
	if (!response.ok) throw new Error(`Mealie request failed (${response.status})`);
	return response.json();
}

export function isMealieConfigured() {
	return Boolean(getConfig());
}

export async function getRecipes(search = '') {
	const params = new URLSearchParams({ page: '1', perPage: '50', orderBy: 'name' });
	if (search) params.set('search', search);
	const result = await mealieFetch(`/recipes?${params}`);
	return result?.items ?? [];
}

export async function getRecipe(slug) {
	return slug ? mealieFetch(`/recipes/${encodeURIComponent(slug)}`) : null;
}
