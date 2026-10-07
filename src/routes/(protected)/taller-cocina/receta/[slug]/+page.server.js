import { error } from '@sveltejs/kit';
import { getRecipe, isMealieConfigured } from '$lib/server/mealie.js';

export async function load({ params }) {
	if (!isMealieConfigured()) throw error(503, 'Mealie no está configurado');
	try {
		const recipe = await getRecipe(params.slug);
		if (!recipe) throw error(404, 'Receta no encontrada');
		return { recipe };
	} catch (cause) {
		if (cause?.status === 404) throw cause;
		console.error('Mealie recipe failed:', cause);
		throw error(502, 'No se ha podido cargar la receta');
	}
}
