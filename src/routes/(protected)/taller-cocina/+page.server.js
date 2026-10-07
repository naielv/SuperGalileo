import { error } from '@sveltejs/kit';
import { getRecipe, getRecipes, isMealieConfigured } from '$lib/server/mealie.js';

export async function load({ url }) {
	const search = url.searchParams.get('search')?.trim() ?? '';
	const selectedSlug = url.searchParams.get('recipe')?.trim() ?? '';

	if (!isMealieConfigured()) {
		return { configured: false, recipes: [], recipe: null, search };
	}

	try {
		const recipes = await getRecipes(search);
		const recipe = selectedSlug ? await getRecipe(selectedSlug) : null;
		return { configured: true, recipes, recipe, search };
	} catch (cause) {
		console.error('Mealie integration failed:', cause);
		throw error(502, 'No se han podido cargar las recetas de Mealie');
	}
}
